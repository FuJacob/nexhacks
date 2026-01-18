"""Base classes for input processors."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
import asyncio


@dataclass
class InputEvent:
    """Unified input event structure."""

    source: str  # "chat", "vision", "speech"
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)


class InputProcessor(ABC):
    """Abstract base class for input processors."""

    @abstractmethod
    async def run(self, queue: asyncio.Queue[InputEvent]) -> None:
        """
        Run the input processor, pushing events to the queue.

        Args:
            queue: Async queue to push InputEvent objects to
        """
        pass

    @abstractmethod
    async def stop(self) -> None:
        """Stop the input processor."""
        pass
