"""Settings manager for runtime configuration."""

import json
from pathlib import Path
from typing import Any, Callable, Awaitable

import yaml
from pydantic import BaseModel, Field

from ..utils.logging import get_logger

logger = get_logger(__name__)

# Available Deepgram Aura voices
AVAILABLE_VOICES = [
    {"id": "aura-2-amalthea-en", "name": "Amalthea", "gender": "female", "accent": "American"},
    {"id": "aura-2-cordelia-en", "name": "Cordelia", "gender": "female", "accent": "American"},
    {"id": "aura-2-delia-en", "name": "Delia", "gender": "female", "accent": "American"},
    {"id": "aura-2-iris-en", "name": "Iris", "gender": "female", "accent": "American"},
]


class VoiceSettings(BaseModel):
    """Voice configuration settings."""
    
    voice_model: str = Field(default="aura-2-amalthea-en", description="Deepgram voice model ID")


class BehaviorSettings(BaseModel):
    """Behavior configuration settings."""
    
    vision_rate: float = Field(default=0.10, ge=0, le=1, description="Probability of reacting to vision (0-1)")
    speech_rate: float = Field(default=0.5, ge=0, le=1, description="Probability of reacting to speech (0-1)")
    cooldown: float = Field(default=4.0, description="Minimum seconds between responses")
    chat_batch_size: int = Field(default=10, ge=1, description="Max chat messages to batch before processing")
    trigger_words: list[str] = Field(default_factory=lambda: ["pixel", "hey ai", "bot"], description="Keywords that trigger immediate response")


class PersonaSettings(BaseModel):
    """Persona configuration settings."""
    
    name: str = Field(default="Pickle", description="Name of the AI persona")
    streamer_name: str = Field(default="Streamer", description="Name of the streamer this AI supports")
    personality: str = Field(
        default="Pixel is an enthusiastic and supportive AI companion.\nThey love making witty observations and engaging with chat.\nThey're knowledgeable but never condescending.\nThey have a playful sense of humor and genuine curiosity about the world.",
        description="Personality description for the AI"
    )
    style: list[str] = Field(
        default_factory=lambda: [
            "Keep responses under 2 sentences",
            "Use casual, conversational language",
            "React with genuine emotion",
            "Avoid being preachy or giving unsolicited advice",
            "Be supportive of the streamer"
        ],
        description="Style guidelines for responses"
    )
    emotions: list[str] = Field(
        default_factory=lambda: ["neutral", "happy", "excited", "surprised", "thinking", "laughing"],
        description="Available emotions for the persona"
    )
    behavior: BehaviorSettings = Field(default_factory=BehaviorSettings)


class PickleSettings(BaseModel):
    """Complete Pickle AI settings."""
    
    voice: VoiceSettings = Field(default_factory=VoiceSettings)
    persona: PersonaSettings = Field(default_factory=PersonaSettings)


class SettingsManager:
    """
    Manages runtime settings with persistence.
    Allows updating TTS settings on the fly.
    """
    
    def __init__(self, settings_file: str = ".pickle_settings.json", persona_yaml: str | None = None):
        self.settings_file = Path(settings_file)
        self.persona_yaml = Path(persona_yaml) if persona_yaml else None
        self.settings = self._load_settings()
        self._on_voice_change: Callable[[VoiceSettings], Awaitable[None]] | None = None
        self._on_persona_change: Callable[[PersonaSettings], Awaitable[None]] | None = None
        
    def _load_settings(self) -> PickleSettings:
        """Load settings from file or return defaults."""
        settings = PickleSettings()
        
        # Load from JSON settings file if it exists
        if(self.settings_file.exists()):
            try:
                with open(self.settings_file, "r") as f:
                    data = json.load(f)
                    settings = PickleSettings(**data)
            except Exception as e:
                logger.warning("settings_load_error", error=str(e))
        
        # Override persona settings from YAML if provided
        if self.persona_yaml and self.persona_yaml.exists():
            try:
                with open(self.persona_yaml, "r") as f:
                    yaml_data = yaml.safe_load(f)
                    # Map YAML structure to PersonaSettings
                    behavior_data = yaml_data.get("behavior", {})
                    persona_data = {
                        "name": yaml_data.get("name", settings.persona.name),
                        "streamer_name": yaml_data.get("streamer_name", settings.persona.streamer_name),
                        "personality": yaml_data.get("personality", settings.persona.personality),
                        "style": yaml_data.get("style", settings.persona.style),
                        "emotions": yaml_data.get("emotions", settings.persona.emotions),
                        "behavior": BehaviorSettings(
                            vision_rate=behavior_data.get("vision_rate", 0.6),
                            speech_rate=behavior_data.get("speech_rate", 0.2),
                            cooldown=behavior_data.get("cooldown", 3.0),
                            chat_batch_size=behavior_data.get("chat_batch_size", 10),
                            trigger_words=behavior_data.get("trigger_words", ["pixel", "hey ai", "bot"]),
                        )
                    }
                    settings.persona = PersonaSettings(**persona_data)
                    logger.info("persona_loaded_from_yaml", name=settings.persona.name)
            except Exception as e:
                logger.warning("persona_yaml_load_error", error=str(e))
        
        return settings
    
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
    
    def set_persona_change_callback(
        self, callback: Callable[[PersonaSettings], Awaitable[None]]
    ) -> None:
        """Set callback for when persona settings change."""
        self._on_persona_change = callback
    
    def get_available_voices(self) -> list[dict]:
        """Get list of available voice models."""
        return AVAILABLE_VOICES
    
    def get_persona_settings(self) -> PersonaSettings:
        """Get current persona settings."""
        return self.settings.persona
    
    async def update_persona_settings(self, persona_settings: PersonaSettings) -> PersonaSettings:
        """Update persona settings and notify listeners."""
        self.settings.persona = persona_settings
        self._save_settings()
        
        # Also save to YAML if path is configured
        if self.persona_yaml:
            self._save_persona_yaml()
        
        if self._on_persona_change:
            await self._on_persona_change(persona_settings)
        
        logger.info("persona_settings_updated", name=persona_settings.name)
        return persona_settings
    
    def _save_persona_yaml(self) -> None:
        """Save persona settings back to YAML file."""
        if not self.persona_yaml:
            return
        try:
            persona = self.settings.persona
            yaml_data = {
                "name": persona.name,
                "streamer_name": persona.streamer_name,
                "personality": persona.personality,
                "style": persona.style,
                "emotions": persona.emotions,
                "voice": {
                    "provider": "deepgram",
                    "voice_id": self.settings.voice.voice_model,
                    "speed": 1.0
                },
                "behavior": {
                    "vision_rate": persona.behavior.vision_rate,
                    "speech_rate": persona.behavior.speech_rate,
                    "cooldown": persona.behavior.cooldown,
                    "chat_batch_size": persona.behavior.chat_batch_size,
                    "trigger_words": persona.behavior.trigger_words,
                }
            }
            with open(self.persona_yaml, "w") as f:
                yaml.dump(yaml_data, f, default_flow_style=False, allow_unicode=True, sort_keys=False)
            logger.info("persona_yaml_saved")
        except Exception as e:
            logger.error("persona_yaml_save_error", error=str(e))


# Global instance
_settings_manager: SettingsManager | None = None


def get_settings_manager() -> SettingsManager:
    """Get or create the global settings manager."""
    global _settings_manager
    if _settings_manager is None:
        _settings_manager = SettingsManager()
    return _settings_manager
