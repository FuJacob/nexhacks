"""Persona engine - the AI brain with personality."""

import random
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from collections import deque
from difflib import SequenceMatcher

import yaml

from .assembler import ContextAssembler
from .llm_client import LLMClient, PersonaResponse
from ..inputs.base import InputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class OutputEvent:
    """Output event for TTS and avatar."""

    text: str
    emotion: str = "neutral"
    priority: int = 1
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class PersonaConfig:
    """Persona configuration loaded from YAML."""

    name: str
    personality: str
    style: list[str]
    voice: dict[str, Any]
    behavior: dict[str, Any]
    streamer_name: str = "Streamer"

    @classmethod
    def from_yaml(cls, path: str | Path) -> "PersonaConfig":
        """Load persona config from YAML file."""
        with open(path) as f:
            data = yaml.safe_load(f)
        return cls(
            name=data["name"],
            personality=data["personality"],
            style=data["style"],
            voice=data["voice"],
            behavior=data["behavior"],
            streamer_name=data.get("streamer_name", "Streamer"),
        )


class PersonaBrain:
    """
    LLM-based persona that processes inputs and generates responses.

    Uses RAG-based memory system:
    - Short-term memory (STM): Rolling window of last N messages for coherence
    - Long-term memory (LTM): Vector DB for semantic search of important memories
    """

    def __init__(
        self,
        llm_client: LLMClient,
        persona_config: PersonaConfig,
        context_assembler: ContextAssembler,
    ):
        """
        Initialize PersonaBrain with memory system.

        Args:
            llm_client: The LLM client for generating responses
            persona_config: Persona configuration
            context_assembler: The context assembler managing STM and LTM
        """
        self.llm = llm_client
        self.persona = persona_config
        self.assembler = context_assembler
        self.last_response_time: datetime | None = None
        self.last_trigger_source: str | None = None
        
        # Concurrency control and deduplication
        self._processing_lock = False
        self._recent_responses = deque(maxlen=5)

    def update_persona(self, persona_settings) -> None:
        """
        Update persona configuration from settings.
        
        Args:
            persona_settings: PersonaSettings from the settings manager
        """
        # Update the persona config with new values
        self.persona.name = persona_settings.name
        self.persona.streamer_name = getattr(persona_settings, 'streamer_name', '') or "the streamer"
        self.persona.personality = persona_settings.personality
        self.persona.style = persona_settings.style
        
        # Update behavior settings
        if hasattr(persona_settings, 'behavior'):
            behavior = persona_settings.behavior
            self.persona.behavior = {
                'vision_rate': getattr(behavior, 'vision_rate', 0.6),
                'speech_rate': getattr(behavior, 'speech_rate', 0.2),
                'cooldown': behavior.cooldown,
                'chat_batch_size': behavior.chat_batch_size,
                'trigger_words': behavior.trigger_words,
            }
        
        logger.info(
            "persona_updated",
            name=self.persona.name,
            streamer=self.persona.streamer_name,
        )

    # ... (skipping unchanged code) ...

    async def process(self, event: InputEvent) -> OutputEvent | None:
        """
        Process input event and generate response.

        Args:
            event: Input event to process

        Returns:
            OutputEvent if response generated, None otherwise
        """
        # Extract user from metadata if available
        user = None
        if event.metadata:
            users = event.metadata.get("users", [])
            if users:
                user = users[0]  # Use first user from batch

        # Process input through assembler (stores in STM and potentially LTM)
        self.assembler.process_input(
            content=event.content,
            source=event.source,
            user=user,
            role="user",
            metadata=event.metadata,
        )

        # CHECK FOR COMBO: Chat -> Vision
        # If last trigger was chat, and this is vision, 50% chance to force response + bypass cooldown
        is_combo_trigger = False
        if event.source == "vision" and self.last_trigger_source == "chat":
            if random.random() < 0.5:
                is_combo_trigger = True
                logger.debug("combo_trigger_activated", type="chat_then_vision")

        # Check if we should respond (unless combo forced)
        if not is_combo_trigger and not self._should_respond(event):
            logger.debug("skipping_response", reason="criteria_not_met")
            return None

        # Check cooldown (bypass if combo)
        cooldown = self.persona.behavior.get("cooldown", 3.0)
        if not is_combo_trigger and self.last_response_time:
            elapsed = (datetime.now() - self.last_response_time).total_seconds()
            if elapsed < cooldown:
                logger.debug("skipping_response", reason="cooldown", elapsed=elapsed)
                return None

        # Concurrency check
        if self._processing_lock:
            logger.debug("skipping_response", reason="busy_processing")
            return None

        self._processing_lock = True
        try:
            # Build messages using context assembler (includes LTM search)
            system_prompt = self._build_system_prompt()
            messages = self.assembler.build_messages(
                current_input=event.content,
                system_prompt=system_prompt,
            )

            # Get LLM response with structured output
            try:
                response = await self.llm.get_persona_response(messages)
            except Exception as e:
                logger.error("persona_llm_error", error=str(e))
                return None

            text = response.text
            
            # Deduplication check
            if self._is_repetitive(text):
                logger.info("skipping_response", reason="repetitive_content", text_preview=text[:30])
                return None

            # Store response in memory
            self.assembler.process_response(text)
            self.last_response_time = datetime.now()
            self.last_trigger_source = event.source  # UPDATE LAST SOURCE
            self._recent_responses.append(text)

            # Log memory stats
            stats = self.assembler.get_memory_stats()
            logger.info(
                "persona_response",
                text=text[:50],
                source=event.source,
                is_combo=is_combo_trigger,
                stm_count=stats["stm_count"],
                ltm_count=stats["ltm_count"],
            )

            return OutputEvent(
                text=text,
            )
        finally:
            self._processing_lock = False

    def _is_repetitive(self, text: str, threshold: float = 0.6) -> bool:
        """Check if text is too similar to recent responses."""
        if not text:
            return False
            
        text_lower = text.lower().strip()
        
        for past_response in self._recent_responses:
            past_lower = past_response.lower().strip()
            
            # direct match
            if text_lower == past_lower:
                return True
                
            # similarity ratio
            similarity = SequenceMatcher(None, text_lower, past_lower).ratio()
            if similarity > threshold:
                return True
                
        return False

    def _should_respond(self, event: InputEvent) -> bool:
        """Decide if persona should respond to this event."""
        # Priority 1: Chat (Always respond to consensus/input)
        if event.source == "chat":
            logger.debug("responding", reason="chat_message")
            return True
        
        # Priority 2: Vision (Reactive visual triggers)
        # Use vision_rate to determine if we should comment on what we see
        if event.source == "vision":
            vision_rate = self.persona.behavior.get("vision_rate", 0.4)
            if random.random() < vision_rate:
                logger.debug("responding", reason="vision_trigger")
                return True
            return False

        # Priority 3: Speech (Lower frequency)
        # Use speech_rate to determine if we should reply to the streamer
        if event.source == "speech":
            speech_rate = self.persona.behavior.get("speech_rate", 0.2)
            if random.random() < speech_rate:
                logger.debug("responding", reason="speech_trigger")
                return True
            return False

        return False

    def get_memory_stats(self) -> dict[str, Any]:
        """Get current memory statistics."""
        return self.assembler.get_memory_stats()
