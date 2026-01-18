"""Persona engine - the AI brain with personality."""

import random
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

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
    emotions: list[str]
    voice: dict[str, Any]
    behavior: dict[str, Any]

    @classmethod
    def from_yaml(cls, path: str | Path) -> "PersonaConfig":
        """Load persona config from YAML file."""
        with open(path) as f:
            data = yaml.safe_load(f)
        return cls(
            name=data["name"],
            personality=data["personality"],
            style=data["style"],
            emotions=data["emotions"],
            voice=data["voice"],
            behavior=data["behavior"],
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

    def _build_system_prompt(self) -> str:
        """Construct system prompt from persona config."""
        style_rules = "\n".join(f"- {s}" for s in self.persona.style)
        emotions_list = ", ".join(self.persona.emotions)

        return f"""You are {self.persona.name}, a virtual AI companion for a live IRL Twitch stream.

PERSONALITY:
{self.persona.personality}

SPEAKING STYLE:
{style_rules}

CAPABILITIES:
- You can see chat messages from viewers
- You react to what's happening in real-time
- You have memory of past conversations and can recall relevant context

GUIDELINES:
- Keep responses SHORT (1-2 sentences max)
- React naturally and conversationally
- Engage with chat when appropriate
- Support the streamer
- Stay in character at all times
- Express emotions through your responses
- Use past context when relevant to the current conversation

Available emotions: {emotions_list}

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{{"text": "your response here", "emotion": "emotion_name"}}
"""

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

        # Check if we should respond
        if not self._should_respond(event):
            logger.debug("skipping_response", reason="criteria_not_met")
            return None

        # Check cooldown
        cooldown = self.persona.behavior.get("cooldown", 3.0)
        if self.last_response_time:
            elapsed = (datetime.now() - self.last_response_time).total_seconds()
            if elapsed < cooldown:
                logger.debug("skipping_response", reason="cooldown", elapsed=elapsed)
                return None

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
        emotion = response.emotion

        # Validate emotion
        if emotion not in self.persona.emotions:
            emotion = "neutral"

        # Store response in memory
        self.assembler.process_response(text)
        self.last_response_time = datetime.now()

        # Log memory stats
        stats = self.assembler.get_memory_stats()
        logger.info(
            "persona_response",
            text=text[:50],
            emotion=emotion,
            source=event.source,
            stm_count=stats["stm_count"],
            ltm_count=stats["ltm_count"],
        )

        return OutputEvent(
            text=text,
            emotion=emotion,
            priority=self._get_priority(event),
        )

    def _should_respond(self, event: InputEvent) -> bool:
        """Decide if persona should respond to this event."""
        content_lower = event.content.lower()
        trigger_words = self.persona.behavior.get("trigger_words", [])

        # Always respond to trigger words (name mentions)
        if any(trigger in content_lower for trigger in trigger_words):
            logger.debug("responding", reason="trigger_word")
            return True

        # Respond to direct questions
        if "?" in event.content:
            logger.debug("responding", reason="question")
            return True

        # Random spontaneous response
        spontaneous_rate = self.persona.behavior.get("spontaneous_rate", 0.15)
        if random.random() < spontaneous_rate:
            logger.debug("responding", reason="spontaneous")
            return True

        return False

    def _get_priority(self, event: InputEvent) -> int:
        """Determine response priority based on event."""
        content_lower = event.content.lower()
        trigger_words = self.persona.behavior.get("trigger_words", [])

        # High priority for direct mentions
        if any(trigger in content_lower for trigger in trigger_words):
            return 3

        # Medium priority for questions
        if "?" in event.content:
            return 2

        # Normal priority
        return 1

    def get_memory_stats(self) -> dict[str, Any]:
        """Get current memory statistics."""
        return self.assembler.get_memory_stats()
