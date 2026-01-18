"""FastAPI web server for overlay and WebSocket."""

from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ..outputs.avatar import AvatarProcessor
from ..outputs.tts import TTSProcessor
from ..utils.logging import get_logger
from .settings_manager import (
    SettingsManager,
    VoiceSettings,
    PersonaSettings,
    BehaviorSettings,
    PickleSettings,
    get_settings_manager,
)

logger = get_logger(__name__)

STATIC_DIR = Path(__file__).parent / "static"


class VoiceUpdateRequest(BaseModel):
    """Request model for updating voice settings."""
    voice_model: str


class BehaviorUpdateRequest(BaseModel):
    """Request model for updating behavior settings."""
    spontaneous_rate: float = 0.15
    cooldown: float = 3.0
    chat_batch_size: int = 10
    trigger_words: list[str] = []


class PersonaUpdateRequest(BaseModel):
    """Request model for updating persona settings."""
    name: str
    personality: str
    style: list[str]
    emotions: list[str]
    behavior: BehaviorUpdateRequest


def create_app(
    avatar_processor: AvatarProcessor,
    tts_processor: TTSProcessor | None = None,
    settings_manager: SettingsManager | None = None,
) -> FastAPI:
    """Create FastAPI application with avatar WebSocket."""
    app = FastAPI(title="Pickle AI", version="0.1.0")
    
    # Use provided settings manager or get global instance
    sm = settings_manager or get_settings_manager()
    
    # Add CORS middleware for frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def root():
        """Root endpoint - health check."""
        return {"status": "ok", "name": "Pickle AI"}

    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "healthy"}
    
    # ========== Settings API ==========
    
    @app.get("/api/settings", response_model=PickleSettings)
    async def get_settings():
        """Get all current settings."""
        return sm.get_settings()
    
    @app.get("/api/settings/voice", response_model=VoiceSettings)
    async def get_voice_settings():
        """Get current voice settings."""
        return sm.get_voice_settings()
    
    @app.put("/api/settings/voice", response_model=VoiceSettings)
    async def update_voice_settings(request: VoiceUpdateRequest):
        """Update voice settings."""
        new_settings = VoiceSettings(
            voice_model=request.voice_model,
        )
        
        # Update TTS processor if available
        if tts_processor:
            tts_processor.update_voice(request.voice_model)
        
        return await sm.update_voice_settings(new_settings)
    
    @app.get("/api/voices")
    async def get_available_voices():
        """Get list of available voice models."""
        return {"voices": sm.get_available_voices()}
    
    # ========== Persona Settings API ==========
    
    @app.get("/api/settings/persona", response_model=PersonaSettings)
    async def get_persona_settings():
        """Get current persona settings."""
        return sm.get_persona_settings()
    
    @app.put("/api/settings/persona", response_model=PersonaSettings)
    async def update_persona_settings(request: PersonaUpdateRequest):
        """Update persona settings."""
        new_settings = PersonaSettings(
            name=request.name,
            personality=request.personality,
            style=request.style,
            emotions=request.emotions,
            behavior=BehaviorSettings(
                spontaneous_rate=request.behavior.spontaneous_rate,
                cooldown=request.behavior.cooldown,
                chat_batch_size=request.behavior.chat_batch_size,
                trigger_words=request.behavior.trigger_words,
            )
        )
        return await sm.update_persona_settings(new_settings)

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
