"""Settings manager for runtime configuration."""

import json
from pathlib import Path
from typing import Any, Callable, Awaitable
from pydantic import BaseModel, Field

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Available Deepgram Aura voices
AVAILABLE_VOICES = [
    {"id": "aura-asteria-en", "name": "Asteria", "gender": "female", "accent": "American"},
    {"id": "aura-luna-en", "name": "Luna", "gender": "female", "accent": "American"},
    {"id": "aura-stella-en", "name": "Stella", "gender": "female", "accent": "American"},
    {"id": "aura-athena-en", "name": "Athena", "gender": "female", "accent": "British"},
    {"id": "aura-hera-en", "name": "Hera", "gender": "female", "accent": "American"},
    {"id": "aura-orion-en", "name": "Orion", "gender": "male", "accent": "American"},
    {"id": "aura-arcas-en", "name": "Arcas", "gender": "male", "accent": "American"},
    {"id": "aura-perseus-en", "name": "Perseus", "gender": "male", "accent": "American"},
    {"id": "aura-angus-en", "name": "Angus", "gender": "male", "accent": "Irish"},
    {"id": "aura-orpheus-en", "name": "Orpheus", "gender": "male", "accent": "American"},
    {"id": "aura-helios-en", "name": "Helios", "gender": "male", "accent": "British"},
    {"id": "aura-zeus-en", "name": "Zeus", "gender": "male", "accent": "American"},
]


class VoiceSettings(BaseModel):
    """Voice configuration settings."""
    
    voice_model: str = Field(default="aura-asteria-en", description="Deepgram voice model ID")
    sample_rate: int = Field(default=24000, description="Audio sample rate in Hz")
    

class PickleSettings(BaseModel):
    """Complete Pickle AI settings."""
    
    voice: VoiceSettings = Field(default_factory=VoiceSettings)
    persona_name: str = Field(default="Pickle", description="Name of the AI persona")


class SettingsManager:
    """
    Manages runtime settings with persistence.
    Allows updating TTS settings on the fly.
    """
    
    def __init__(self, settings_file: str = ".pickle_settings.json"):
        self.settings_file = Path(settings_file)
        self.settings = self._load_settings()
        self._on_voice_change: Callable[[VoiceSettings], Awaitable[None]] | None = None
        
    def _load_settings(self) -> PickleSettings:
        """Load settings from file or return defaults."""
        if self.settings_file.exists():
            try:
                with open(self.settings_file, "r") as f:
                    data = json.load(f)
                    return PickleSettings(**data)
            except Exception as e:
                logger.warning("settings_load_error", error=str(e))
        return PickleSettings()
    
    def _save_settings(self) -> None:
        """Save settings to file."""
        try:
            with open(self.settings_file, "w") as f:
                json.dump(self.settings.model_dump(), f, indent=2)
            logger.info("settings_saved")
        except Exception as e:
            logger.error("settings_save_error", error=str(e))
    
    def get_settings(self) -> PickleSettings:
        """Get current settings."""
        return self.settings
    
    def get_voice_settings(self) -> VoiceSettings:
        """Get current voice settings."""
        return self.settings.voice
    
    async def update_voice_settings(self, voice_settings: VoiceSettings) -> VoiceSettings:
        """Update voice settings and notify listeners."""
        self.settings.voice = voice_settings
        self._save_settings()
        
        if self._on_voice_change:
            await self._on_voice_change(voice_settings)
        
        logger.info("voice_settings_updated", voice=voice_settings.voice_model)
        return voice_settings
    
    def set_voice_change_callback(
        self, callback: Callable[[VoiceSettings], Awaitable[None]]
    ) -> None:
        """Set callback for when voice settings change."""
        self._on_voice_change = callback
    
    def get_available_voices(self) -> list[dict]:
        """Get list of available voice models."""
        return AVAILABLE_VOICES


# Global instance
_settings_manager: SettingsManager | None = None


def get_settings_manager() -> SettingsManager:
    """Get or create the global settings manager."""
    global _settings_manager
    if _settings_manager is None:
        _settings_manager = SettingsManager()
    return _settings_manager
