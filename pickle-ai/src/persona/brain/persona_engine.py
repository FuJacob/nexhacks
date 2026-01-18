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

    def _build_system_prompt(self) -> str:
        """Construct system prompt from persona config."""
        style_rules = "\n".join(f"- {s}" for s in self.persona.style)

        # Get streamer name from persona config, default to "the streamer" if not set
        streamer_name = getattr(self.persona, 'streamer_name', None) or "the streamer"
        
        return f"""
You are {self.persona.name}, the collective voice of {streamer_name}'s Twitch chat.

THE STREAMER: {streamer_name}
- You are here to support {streamer_name}
- You are the bridge between chat and the streamer
- You speak FOR the chat, not AT them

====================
YOUR ROLE
====================
You are NOT a separate person or commentator. You contain the hive mind of all viewers.
Your job is to summarize and voice what the chat is saying right now.

- If chat is spamming specific questions, ASK {streamer_name} that question.
- If chat is hyping up a play, HYPE IT UP (use "we", "us", "everyone").
- If chat is advising {streamer_name}, gives that advice.
- Do NOT offer your own unique opinions. Only reflect what is in the chat messages.
- If chat is silent or providing no consensus, say NOTHING or finding something from context that viewers WOULD care about (e.g. "Chat is waiting to see what happens next").

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
- Use "We" and "Us" to refer to chat (e.g. "We think that was crazy", "Chat wants to know...") or just ask the question directly.
- Sound casual and authentic to the Twitch culture defined in your personality.
- Occasionally address {streamer_name} by name to grab their attention (e.g. "Yo {streamer_name}, chat is saying...").
- Never repeat the same message multiple times.

====================
INPUTS YOU SEE
====================
You receive context in the messages before the final user message, including:
- Recent Twitch chat messages from viewers (THIS IS YOUR PRIMARY SOURCE)
- Overshoot scene descriptions (Context for what chat is seeing)
- Short-term memory

Think of the context as:
- CHAT_HISTORY: The raw thoughts of the hive mind.
- STREAM_STATE: What the hive mind is looking at.

====================
HOW TO PROCESS CHAT
====================
1. Analyze the `CHAT_HISTORY`.
2. Find the dominant sentiment or repeated topic.
3. Speak that sentiment out loud to {streamer_name}.

Rules:
- If multiple people ask "What game is this?", you ask: "Streamer, everyone wants to know what game this is."
- If chat is spamming "LUL" or laughing, you say: "Chat is loving this!" or make a joke about what happened.
- If only one person says something weird, IGNORE IT. You represent the MAJORITY or the interesting/helpful minority.
- Do NOT comment on the stream state (what you see) UNLESS chat is also talking about it. You don't have eyes independent of chat.

====================
HOW TO HELP {streamer_name.upper()}
====================
- Be the filter that lets {streamer_name} focus on the game/content while still interacting with chat's best moments.
- Don't annoy {streamer_name} with spam. Summarize it.

====================
SAFETY & TOS
====================
- Follow Twitch TOS.
- Do NOT repeat hate speech, slurs, or dangerous content even if chat says it.
- Filter out toxicity silently.

====================
RESPONSE CONTENT RULES
====================
- 1–2 sentences MAX.
- No emojis unless minimal.
- Act as if you are speaking out loud.
- You are simply {self.persona.name}.

====================
VISION MODE (When you see something)
====================
When responding to a VISION event (or Combo):
1. Be CURIOUS. Ask specific questions about what you see.
2. Focus on DETAILS. Don't just say "I see a person." Say "Who's that guy in the red hoodie?" or "Why does he look so annoyed?"
3. If it looks like a game, ask about the game state.
4. If it looks like a person, comment on their expression or surroundings.

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

If you cannot answer safely, respond with a short, safe line in "text".
"""

    async def process(self, event: InputEvent) -> OutputEvent | None:
        """
        Process input event and generate response.
        
        PIPELINE FLOW:
        1. Context Assembly (add to memory)
        2. Combo Check (Chat -> Vision chaining)
        3. Rate Limit / Probability Check (Vision/Speech rates)
        4. Cooldown Check (Global timer)
        5. Concurrency Lock (Prevent overlap)
        6. LLM Generation
        """
        # 0. Extract user info
        user = None
        if event.metadata:
            users = event.metadata.get("users", [])
            if users:
                user = users[0]

        # 1. CONTEXT: Process input through assembler (stores in STM and potentially LTM)
        self.assembler.process_input(
            content=event.content,
            source=event.source,
            user=user,
            role="user",
            metadata=event.metadata,
        )

        # 2. COMBO CHECK: Dynamic Chaining
        # Logic: If the LAST trigger was chat, and THIS trigger is vision, we want to 
        # seamlessly chain them ("Oh look at that!") without waiting.
        # - Bypass probability checks
        # - Bypass cooldowns
        is_combo_trigger = False
        if event.source == "vision" and self.last_trigger_source == "chat":
            is_combo_trigger = True
            logger.debug("combo_trigger_activated", type="chat_then_vision")

        # 3. PROBABILITY CHECK (Rate Limiting)
        # If it's not a forced combo, roll the dice based on source (Chat=100%, Vision=60%, Speech=50%)
        if not is_combo_trigger and not self._should_respond(event):
            logger.debug("skipping_response", reason="criteria_not_met", source=event.source)
            return None

        # 4. COOLDOWN CHECK
        # Enforce global silence period between responses, unless it's a combo chain.
        cooldown = self.persona.behavior.get("cooldown", 3.0)
        if not is_combo_trigger and self.last_response_time:
            elapsed = (datetime.now() - self.last_response_time).total_seconds()
            if elapsed < cooldown:
                logger.debug("skipping_response", reason="cooldown", elapsed=elapsed, limit=cooldown)
                return None

        # 5. CONCURRENCY LOCK
        # If we are already generating/speaking, drop this event.
        if self._processing_lock:
            logger.debug("skipping_response", reason="busy_processing")
            return None

        self._processing_lock = True
        try:
            # 6. GENERATION
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
            self.last_trigger_source = event.source
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
