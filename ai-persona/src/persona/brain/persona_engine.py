"""Persona engine - the AI brain with personality."""

import random
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from .context_manager import ContextManager
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
    Maintains conversation context and personality consistency.
    """

    def __init__(
        self,
        llm_client: LLMClient,
        persona_config: PersonaConfig,
    ):
        self.llm = llm_client
        self.persona = persona_config
        self.context = ContextManager(max_tokens=4000)
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

GUIDELINES:
- Keep responses SHORT (1-2 sentences max)
- React naturally and conversationally
- Engage with chat when appropriate
- Support the streamer
- Stay in character at all times
- Express emotions through your responses

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
        # Add event to context
        self.context.add_input(event.source, event.content)

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

        # Build messages
        messages = [
            {"role": "system", "content": self._build_system_prompt()},
            *self.context.get_messages(),
        ]

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

        # Update state
        self.context.add_response(text)
        self.last_response_time = datetime.now()

        logger.info(
            "persona_response",
            text=text[:50],
            emotion=emotion,
            source=event.source,
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
