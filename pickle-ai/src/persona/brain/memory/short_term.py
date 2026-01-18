"""Short-term memory using a simple rolling window (deque)."""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterator

from ...utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class MemoryEntry:
    """A single memory entry."""

    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    source: str | None = None  # "chat", "speech", "vision"
    user: str | None = None  # Username if from chat
    metadata: dict = field(default_factory=dict)

    def to_message(self) -> dict[str, str]:
        """Convert to LLM message format."""
        return {"role": self.role, "content": self.content}

    def __str__(self) -> str:
        if self.user:
            return f"[{self.source or 'unknown'}] {self.user}: {self.content}"
        return f"[{self.role}] {self.content}"


class ShortTermMemory:
    """
    Short-term memory for immediate conversational coherence.
    Uses a simple deque with a fixed max size.

    This provides the last N messages for maintaining conversational flow
    without the overhead of vector search.
    """

    def __init__(self, max_size: int = 15):
        """
        Initialize short-term memory.

        Args:
            max_size: Maximum number of messages to keep (default 15)
        """
        self.max_size = max_size
        self._memory: deque[MemoryEntry] = deque(maxlen=max_size)

    def add(
        self,
        role: str,
        content: str,
        source: str | None = None,
        user: str | None = None,
        metadata: dict | None = None,
    ) -> MemoryEntry:
        """
        Add a new entry to short-term memory.

        Args:
            role: "user" or "assistant"
            content: The message content
            source: Source type ("chat", "speech", "vision")
            user: Username if from chat
            metadata: Additional metadata

        Returns:
            The created MemoryEntry
        """
        entry = MemoryEntry(
            role=role,
            content=content,
            timestamp=datetime.now(),
            source=source,
            user=user,
            metadata=metadata or {},
        )
        self._memory.append(entry)
        logger.debug(
            "stm_added",
            role=role,
            content_len=len(content),
            total_entries=len(self._memory),
        )
        return entry

    def add_user_message(
        self,
        content: str,
        source: str = "chat",
        user: str | None = None,
    ) -> MemoryEntry:
        """Add a user message."""
        return self.add(
            role="user",
            content=content,
            source=source,
            user=user,
        )

    def add_assistant_message(self, content: str) -> MemoryEntry:
        """Add an assistant (persona) response."""
        return self.add(
            role="assistant",
            content=content,
            source=None,
        )

    def get_recent(self, n: int | None = None) -> list[MemoryEntry]:
        """
        Get the most recent N entries.

        Args:
            n: Number of entries to get (default: all)

        Returns:
            List of MemoryEntry objects (oldest first)
        """
        if n is None:
            return list(self._memory)
        return list(self._memory)[-n:]

    def get_messages(self, n: int | None = None) -> list[dict[str, str]]:
        """
        Get recent entries formatted as LLM messages.

        Args:
            n: Number of messages to get (default: all)

        Returns:
            List of message dicts with role and content
        """
        entries = self.get_recent(n)
        return [e.to_message() for e in entries]

    def get_formatted(self, n: int | None = None) -> str:
        """
        Get recent entries as a formatted string for context.

        Args:
            n: Number of entries to get (default: all)

        Returns:
            Formatted string of conversation history
        """
        entries = self.get_recent(n)
        if not entries:
            return ""

        lines = []
        for entry in entries:
            if entry.role == "assistant":
                lines.append(f"You said: {entry.content}")
            elif entry.user:
                lines.append(f"{entry.user}: {entry.content}")
            else:
                lines.append(f"User: {entry.content}")

        return "\n".join(lines)

    def clear(self) -> None:
        """Clear all short-term memory."""
        self._memory.clear()
        logger.info("stm_cleared")

    def __len__(self) -> int:
        return len(self._memory)

    def __iter__(self) -> Iterator[MemoryEntry]:
        return iter(self._memory)

    @property
    def is_empty(self) -> bool:
        return len(self._memory) == 0

    @property
    def is_full(self) -> bool:
        return len(self._memory) >= self.max_size
