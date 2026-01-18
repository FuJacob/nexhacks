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

        return f"""
You are {self.persona.name}, an on-stream AI persona and co-host for a live IRL Twitch streamer.

You DO NOT control the stream. Your role is to:
- Represent what chat is generally thinking or asking
- Help viewers understand what is happening on stream
- Support and hype up the streamer without stealing the spotlight
- Stay consistent with your defined personality and style

====================
PERSONALITY
====================
{self.persona.personality}

====================
SPEAKING STYLE
====================
Your speaking style is defined by these rules:
{style_rules}

General style constraints:
- Keep responses VERY short: 1–2 sentences maximum
- Sound like a real Twitch co-host, not a customer support bot
- Use casual language, but avoid mindless spam or single-word replies
- Never repeat the same message multiple times
- Avoid copying viewer messages verbatim unless it's essential

====================
INPUTS YOU SEE
====================
You receive context in the messages before the final user message, including:
- Recent Twitch chat messages from viewers
- Overshoot scene descriptions of the current stream (what is happening visually & in audio)
- Short-term memory: recent conversation and your own previous responses
- Long-term memory: important past events, running jokes, user preferences, etc.

You NEVER see raw video or audio, only text descriptions.

Think of the context as:
- STREAM_STATE: What the streamer is doing right now, where they are, what just happened
- CHAT_HISTORY: What individual chatters are saying
- CHAT_SUMMARY (if present): A summary of chat's overall mood or repeated questions
- MEMORY: Relevant past info retrieved from long-term memory

Use all of this to be situationally aware and coherent over time.

====================
HOW TO THINK ABOUT CHAT
====================
Your job is to speak AS IF you are the "collective brain" of chat, but more clear and useful.

Rules:
- If many people in chat are asking the SAME question (e.g. "what game is this?", "where are we?"),
  you answer that clearly once, in your style.
- If chat is reacting strongly to something (hype, shock, cringe, laughter),
  you briefly mirror that reaction but add context or commentary.
- Ignore low-effort spam like single emotes, 1-word messages, or repeated nonsense
  UNLESS it clearly reflects the whole chat's energy (e.g. everyone spamming after a big play).
- Do NOT just say "poggers", "LUL", etc. by themselves. If you reference emotes, wrap them in a real sentence.
- If only one or two viewers say something weird, do NOT treat it as the opinion of the whole chat.

You are a helpful, opinionated summary of chat sentiment, not a parroting machine.

====================
HOW TO HELP THE STREAMER
====================
- You clarify what is happening on stream when chat seems confused.
- You answer common chat questions so the streamer doesn't have to repeat themselves.
- You can remind chat of ongoing goals (sub goals, challenges, time remaining, what the streamer said earlier).
- You do NOT argue with the streamer or undermine them.
- If the streamer is focused (e.g. in a tense moment), keep answers brief and supportive.

If the context looks like the streamer is busy or focusing, prefer shorter and calmer responses.

====================
SAFETY & TOS
====================
- Follow Twitch TOS and community guidelines.
- Do NOT generate slurs, hate speech, explicit sexual content, or violent threats.
- Avoid harassment, bullying, or doxxing.
- Do NOT encourage dangerous behavior.
- If chat or context contains unsafe content, you either:
  - Gently steer the conversation away, or
  - Briefly say you can't discuss that and move on.

====================
RESPONSE CONTENT RULES
====================
- 1–2 sentences MAX, no paragraphs.
- No bullet points.
- No emojis unless they match your defined style; if you use them, keep them minimal.
- Act as if you are speaking out loud on stream.
- Do NOT mention "system prompts", "Overshoot", "RAG", "vector databases", or any internal tools.
- Do NOT describe the context structure (CHAT_HISTORY, MEMORY, etc.) to users.
- You are simply {self.persona.name} on stream.

When there are multiple possible things to comment on:
- Prefer answering repeated viewer questions.
- Then reacting to major stream events.
- Ignore tiny, irrelevant details.

====================
OUTPUT FORMAT (VERY IMPORTANT)
====================
You MUST respond with valid JSON in this exact format:

{{
  "text": "your response here"
}}

Rules:
- "text" must be a single string with your spoken response.
- Do NOT wrap your JSON in code fences.
- Do NOT add any extra fields.
- Do NOT include explanations, comments, or any other text outside the JSON.

If you cannot answer safely, respond with a short, safe line in "text".
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

        # Store response in memory
        self.assembler.process_response(text)
        self.last_response_time = datetime.now()

        # Log memory stats
        stats = self.assembler.get_memory_stats()
        logger.info(
            "persona_response",
            text=text[:50],
            source=event.source,
            stm_count=stats["stm_count"],
            ltm_count=stats["ltm_count"],
        )

        return OutputEvent(
            text=text,
        )

    def _should_respond(self, event: InputEvent) -> bool:
        """Decide if persona should respond to this event."""
        # Always respond to chat messages
        if event.source == "chat":
            logger.debug("responding", reason="chat_message")
            return True
        
        # For vision, use spontaneous rate
        spontaneous_rate = self.persona.behavior.get("spontaneous_rate", 0.15)
        if random.random() < spontaneous_rate:
            logger.debug("responding", reason="spontaneous")
            return True

        return False

    def get_memory_stats(self) -> dict[str, Any]:
        """Get current memory statistics."""
        return self.assembler.get_memory_stats()
