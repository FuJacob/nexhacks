"""Avatar overlay control via WebSocket."""

import asyncio
import base64
import json
from typing import Any

from ..brain.persona_engine import OutputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


class AvatarProcessor:
    """
    Controls visual avatar overlay via WebSocket.
    Sends speaking state updates to browser clients.
    """

    def __init__(self):
        self.is_speaking = False
        self.connections: set = set()

    async def handle(self, output: OutputEvent) -> None:
        """Handle output event (no-op since we removed emotions)."""
        pass

    async def set_speaking(self, speaking: bool) -> None:
        """Update speaking state."""
        if speaking != self.is_speaking:
            self.is_speaking = speaking
            await self.broadcast({
                "type": "speaking",
                "value": speaking,
            })
            logger.debug("avatar_speaking_changed", speaking=speaking)

    async def broadcast(self, data: dict[str, Any]) -> None:
        """Send update to all connected clients."""
        if not self.connections:
            return

        message = json.dumps(data)
        dead_connections = set()

        for ws in self.connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        # Remove dead connections
        self.connections -= dead_connections

    def register(self, websocket) -> None:
        """Register a new WebSocket connection."""
        self.connections.add(websocket)
        logger.info("avatar_client_connected", total=len(self.connections))

    def unregister(self, websocket) -> None:
        """Unregister a WebSocket connection."""
        self.connections.discard(websocket)
        logger.info("avatar_client_disconnected", total=len(self.connections))

    async def send_initial_state(self, websocket) -> None:
        """Send current state to newly connected client."""
        await websocket.send_text(json.dumps({
            "type": "init",
            "speaking": self.is_speaking,
        }))

    async def stream_audio_start(self, sample_rate: int = 22050) -> None:
        """Notify clients to start audio stream."""
        await self.broadcast({
            "type": "stream_start",
            "sample_rate": sample_rate,
        })
        logger.debug("avatar_stream_started", sample_rate=sample_rate)

    async def stream_audio_chunk(self, audio_data: bytes, text: str = "") -> None:
        """Send audio chunk to clients for lip-sync."""
        # Encode audio as base64 for JSON transport
        audio_b64 = base64.b64encode(audio_data).decode('utf-8')
        await self.broadcast({
            "type": "stream_audio",
            "audio": audio_b64,
            "text": text,
        })
        logger.debug("avatar_audio_chunk_sent", size=len(audio_data))

    async def stream_audio_end(self) -> None:
        """Notify clients that stream has ended."""
        await self.broadcast({
            "type": "stream_end",
        })
        logger.debug("avatar_stream_ended")
