"""Conversation context management with token limits."""

from collections import deque
from dataclasses import dataclass
from datetime import datetime

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ContextEntry:
    """A single entry in the conversation context."""

    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    source: str | None = None


class ContextManager:
    """
    Manages conversation context with token limits.
    Implements a sliding window that trims oldest entries when over limit.
    """

    # Approximate tokens per character (conservative estimate)
    CHARS_PER_TOKEN = 4

    def __init__(self, max_tokens: int = 4000):
        self.max_tokens = max_tokens
        self.entries: deque[ContextEntry] = deque()

    def add_input(self, source: str, content: str) -> None:
        """Add an input event to context."""
        formatted = f"[{source.upper()}] {content}"
        self.entries.append(
            ContextEntry(
                role="user",
                content=formatted,
                timestamp=datetime.now(),
                source=source,
            )
        )
        self._trim_to_limit()
        logger.debug("context_input_added", source=source, tokens=self._count_tokens())

    def add_response(self, text: str) -> None:
        """Add persona response to context."""
        self.entries.append(
            ContextEntry(
                role="assistant",
                content=text,
                timestamp=datetime.now(),
            )
        )
        self._trim_to_limit()
        logger.debug("context_response_added", tokens=self._count_tokens())

    def get_messages(self) -> list[dict[str, str]]:
        """Get messages formatted for LLM API."""
        return [{"role": e.role, "content": e.content} for e in self.entries]

    def clear(self) -> None:
        """Clear all context."""
        self.entries.clear()

    def _trim_to_limit(self) -> None:
        """Remove oldest entries to stay under token limit."""
        while self._count_tokens() > self.max_tokens and len(self.entries) > 1:
            removed = self.entries.popleft()
            logger.debug("context_trimmed", removed_role=removed.role)

    def _count_tokens(self) -> int:
        """
        Estimate token count in context.
        Uses a simple character-based approximation (~4 chars per token).
        """
        total_chars = sum(len(e.content) for e in self.entries)
        return total_chars // self.CHARS_PER_TOKEN

    @property
    def token_count(self) -> int:
        """Current token count."""
        return self._count_tokens()

    @property
    def entry_count(self) -> int:
        """Current entry count."""
        return len(self.entries)
