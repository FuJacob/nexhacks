"""Twitch chat integration using TwitchIO."""

import asyncio
from datetime import datetime
from twitchio.ext import commands

from .base import InputEvent, InputProcessor
from ..utils.logging import get_logger

logger = get_logger(__name__)


class TwitchChatProcessor(commands.Bot, InputProcessor):
    """
    TwitchIO-based chat listener.
    Batches chat messages for LLM processing.
    """

    def __init__(
        self,
        token: str,
        channel: str,
        client_id: str | None = None,
        batch_interval: float = 2.0,
        max_batch_size: int = 10,
    ):
        super().__init__(
            token=token,
            prefix="!",
            initial_channels=[channel],
            client_id=client_id,
        )
        self.channel = channel
        self.batch_interval = batch_interval
        self.max_batch_size = max_batch_size
        self.message_buffer: list[dict] = []
        self.queue: asyncio.Queue[InputEvent] | None = None
        self._running = False
        self._batch_task: asyncio.Task | None = None

    async def event_ready(self) -> None:
        """Called when the bot is ready."""
        logger.info("twitch_connected", nick=self.nick, channel=self.channel)

    async def event_message(self, message) -> None:
        """Handle incoming chat messages."""
        # Ignore bot's own messages
        if message.echo:
            return

        self.message_buffer.append({
            "user": message.author.name if message.author else "anonymous",
            "content": message.content,
            "timestamp": datetime.now(),
        })

        logger.debug(
            "chat_message_received",
            user=message.author.name if message.author else "anonymous",
            content=message.content[:50],
        )

        # If buffer is full, flush immediately
        if len(self.message_buffer) >= self.max_batch_size:
            await self._flush_buffer()

    async def _batch_messages(self) -> None:
        """Periodically batch chat messages and push to queue."""
        while self._running:
            await asyncio.sleep(self.batch_interval)
            await self._flush_buffer()

    async def _flush_buffer(self) -> None:
        """Flush message buffer to queue."""
        if not self.message_buffer or not self.queue:
            return

        # Format messages for LLM
        messages = self.message_buffer.copy()
        self.message_buffer.clear()

        chat_content = "\n".join(
            f"{m['user']}: {m['content']}" for m in messages
        )

        event = InputEvent(
            source="chat",
            content=chat_content,
            timestamp=datetime.now(),
            metadata={
                "message_count": len(messages),
                "users": list(set(m["user"] for m in messages)),
            },
        )

        await self.queue.put(event)
        logger.debug("chat_batch_queued", message_count=len(messages))

    async def run(self, queue: asyncio.Queue[InputEvent]) -> None:
        """Start the Twitch chat processor."""
        self.queue = queue
        self._running = True

        # Start batch task
        self._batch_task = asyncio.create_task(self._batch_messages())

        # Start the bot (this blocks)
        try:
            await self.start()
        except asyncio.CancelledError:
            logger.info("twitch_processor_cancelled")
        except Exception as e:
            logger.error("twitch_processor_error", error=str(e))
            raise

    async def stop(self) -> None:
        """Stop the Twitch chat processor."""
        self._running = False

        if self._batch_task:
            self._batch_task.cancel()
            try:
                await self._batch_task
            except asyncio.CancelledError:
                pass

        await self.close()
        logger.info("twitch_processor_stopped")
