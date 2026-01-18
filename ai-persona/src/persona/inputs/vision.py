"""Vision input processor using Overshoot AI via Node.js sidecar."""

import asyncio
from datetime import datetime
from typing import Any

import aiohttp

from .base import InputProcessor, InputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


class VisionInputProcessor(InputProcessor):
    """
    Vision input processor that connects to the Overshoot vision sidecar.

    The vision sidecar runs as a Node.js server that handles WebRTC
    communication with Overshoot's API. This processor polls or listens
    via WebSocket for vision analysis results.
    """

    def __init__(
        self,
        server_url: str = "http://localhost:3001",
        poll_interval: float = 3.0,
        use_websocket: bool = True,
        auto_start_vision: bool = True,
    ):
        """
        Initialize the vision input processor.

        Args:
            server_url: URL of the vision sidecar server
            poll_interval: Seconds between polls (if not using WebSocket)
            use_websocket: Whether to use WebSocket for real-time updates
            auto_start_vision: Whether to automatically start vision on run
        """
        self.server_url = server_url.rstrip('/')
        self.poll_interval = poll_interval
        self.use_websocket = use_websocket
        self.auto_start_vision = auto_start_vision

        self._running = False
        self._session: aiohttp.ClientSession | None = None
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._last_result_id: str | None = None

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def _check_health(self) -> bool:
        """Check if vision server is healthy."""
        try:
            session = await self._ensure_session()
            async with session.get(f"{self.server_url}/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("status") == "ok"
        except Exception as e:
            logger.error("vision_health_check_failed", error=str(e))
        return False

    async def _start_vision(self) -> bool:
        """Start vision processing on the sidecar."""
        try:
            session = await self._ensure_session()
            async with session.post(f"{self.server_url}/vision/start") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    logger.info("vision_started", response=data)
                    return data.get("ok", False)
                else:
                    logger.error("vision_start_failed", status=resp.status)
        except Exception as e:
            logger.error("vision_start_error", error=str(e))
        return False

    async def _stop_vision(self) -> None:
        """Stop vision processing on the sidecar."""
        try:
            session = await self._ensure_session()
            async with session.post(f"{self.server_url}/vision/stop") as resp:
                if resp.status == 200:
                    logger.info("vision_stopped")
        except Exception as e:
            logger.error("vision_stop_error", error=str(e))

    async def _poll_latest(self) -> dict[str, Any] | None:
        """Poll for the latest vision result."""
        try:
            session = await self._ensure_session()
            async with session.get(f"{self.server_url}/vision/latest") as resp:
                if resp.status == 200:
                    return await resp.json()
        except Exception as e:
            logger.error("vision_poll_error", error=str(e))
        return None

    def _create_input_event(self, result: dict[str, Any]) -> InputEvent | None:
        """Convert vision result to InputEvent."""
        if not result.get("ok"):
            return None

        result_text = result.get("result", "")
        if not result_text:
            return None

        # Check if this is a new result
        result_id = result.get("id")
        if result_id and result_id == self._last_result_id:
            return None

        self._last_result_id = result_id

        return InputEvent(
            source="vision",
            content=result_text,
            timestamp=datetime.now(),
            metadata={
                "result_id": result_id,
                "stream_id": result.get("streamId"),
                "latency_ms": result.get("latencyMs"),
                "prompt": result.get("prompt"),
            },
        )

    async def _run_websocket(self, queue: asyncio.Queue[InputEvent]) -> None:
        """Run WebSocket listener for real-time vision results."""
        ws_url = self.server_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_url}/vision/ws"

        while self._running:
            try:
                session = await self._ensure_session()
                async with session.ws_connect(ws_url) as ws:
                    self._ws = ws
                    logger.info("vision_websocket_connected", url=ws_url)

                    async for msg in ws:
                        if not self._running:
                            break

                        if msg.type == aiohttp.WSMsgType.TEXT:
                            try:
                                data = msg.json()

                                # Skip connection/status messages
                                if data.get("type") in ("connected", "started", "stopped"):
                                    continue

                                event = self._create_input_event(data)
                                if event:
                                    await queue.put(event)
                                    logger.debug(
                                        "vision_event_queued",
                                        content_len=len(event.content),
                                    )
                            except Exception as e:
                                logger.error("vision_ws_parse_error", error=str(e))

                        elif msg.type == aiohttp.WSMsgType.ERROR:
                            logger.error("vision_ws_error", error=str(ws.exception()))
                            break

                        elif msg.type == aiohttp.WSMsgType.CLOSED:
                            logger.info("vision_ws_closed")
                            break

            except aiohttp.ClientError as e:
                logger.error("vision_ws_connection_error", error=str(e))
            except Exception as e:
                logger.error("vision_ws_unexpected_error", error=str(e))

            # Reconnect after delay if still running
            if self._running:
                logger.info("vision_ws_reconnecting", delay=5)
                await asyncio.sleep(5)

    async def _run_polling(self, queue: asyncio.Queue[InputEvent]) -> None:
        """Run polling loop for vision results."""
        while self._running:
            try:
                result = await self._poll_latest()
                if result:
                    event = self._create_input_event(result)
                    if event:
                        await queue.put(event)
                        logger.debug(
                            "vision_event_queued",
                            content_len=len(event.content),
                        )
            except Exception as e:
                logger.error("vision_poll_loop_error", error=str(e))

            await asyncio.sleep(self.poll_interval)

    async def run(self, queue: asyncio.Queue[InputEvent]) -> None:
        """
        Run the vision input processor.

        Args:
            queue: Async queue to push InputEvent objects to
        """
        self._running = True
        logger.info(
            "vision_processor_starting",
            server_url=self.server_url,
            use_websocket=self.use_websocket,
        )

        # Wait for vision server to be ready
        retries = 0
        max_retries = 10
        while self._running and retries < max_retries:
            if await self._check_health():
                logger.info("vision_server_healthy")
                break
            retries += 1
            logger.warning("vision_server_not_ready", retry=retries)
            await asyncio.sleep(2)

        if retries >= max_retries:
            logger.error("vision_server_unavailable", max_retries=max_retries)
            return

        # Auto-start vision if configured
        if self.auto_start_vision:
            if not await self._start_vision():
                logger.error("vision_auto_start_failed")
                # Continue anyway, might be started manually

        # Run main loop
        try:
            if self.use_websocket:
                await self._run_websocket(queue)
            else:
                await self._run_polling(queue)
        except asyncio.CancelledError:
            pass
        finally:
            logger.info("vision_processor_stopped")

    async def stop(self) -> None:
        """Stop the vision input processor."""
        self._running = False

        # Close WebSocket
        if self._ws and not self._ws.closed:
            await self._ws.close()
            self._ws = None

        # Stop vision on sidecar
        await self._stop_vision()

        # Close HTTP session
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

        logger.info("vision_processor_cleanup_complete")

    async def update_prompt(self, prompt: str) -> bool:
        """
        Update the vision analysis prompt.

        Args:
            prompt: New prompt for vision analysis

        Returns:
            True if successful
        """
        try:
            session = await self._ensure_session()
            async with session.post(
                f"{self.server_url}/vision/prompt",
                json={"prompt": prompt},
            ) as resp:
                if resp.status == 200:
                    logger.info("vision_prompt_updated", prompt_len=len(prompt))
                    return True
                else:
                    logger.error("vision_prompt_update_failed", status=resp.status)
        except Exception as e:
            logger.error("vision_prompt_update_error", error=str(e))
        return False
