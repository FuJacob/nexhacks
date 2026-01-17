"""FastAPI web server for overlay and WebSocket."""

from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from ..outputs.avatar import AvatarProcessor
from ..utils.logging import get_logger

logger = get_logger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


def create_app(avatar_processor: AvatarProcessor) -> FastAPI:
    """Create FastAPI application with avatar WebSocket."""
    app = FastAPI(title="AI Persona", version="0.1.0")

    @app.get("/")
    async def root():
        """Root endpoint - health check."""
        return {"status": "ok", "name": "AI Persona"}

    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "healthy"}

    @app.get("/overlay")
    async def overlay():
        """Serve the avatar overlay HTML."""
        overlay_path = STATIC_DIR / "overlay.html"
        if overlay_path.exists():
            return FileResponse(overlay_path, media_type="text/html")
        return HTMLResponse("<h1>Overlay not found</h1>", status_code=404)

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """WebSocket endpoint for avatar state updates."""
        await websocket.accept()
        avatar_processor.register(websocket)

        try:
            # Send initial state
            await avatar_processor.send_initial_state(websocket)

            # Keep connection alive
            while True:
                # We don't expect client messages, but need to keep reading
                # to detect disconnection
                try:
                    await websocket.receive_text()
                except WebSocketDisconnect:
                    break

        except Exception as e:
            logger.error("websocket_error", error=str(e))
        finally:
            avatar_processor.unregister(websocket)

    # Mount static files
    if STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    return app
