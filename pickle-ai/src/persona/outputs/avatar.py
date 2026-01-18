"""Avatar overlay control via WebSocket."""

import asyncio
import json
from typing import Any

from ..brain.persona_engine import OutputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


class AvatarProcessor:
    """
    Controls visual avatar overlay via WebSocket.
    Sends emotion and speaking state updates to browser clients.
    """

    def __init__(self):
        self.current_emotion = "neutral"
        self.is_speaking = False
        self.connections: set = set()

    async def handle(self, output: OutputEvent) -> None:
        """Update avatar based on output event."""
        # Update emotion if changed
        if output.emotion != self.current_emotion:
            self.current_emotion = output.emotion
            await self.broadcast({
                "type": "emotion",
                "value": output.emotion,
            })
            logger.debug("avatar_emotion_changed", emotion=output.emotion)

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
            "emotion": self.current_emotion,
            "speaking": self.is_speaking,
        }))
