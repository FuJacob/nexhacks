"""Application settings loaded from environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Gemini API
    gemini_api_key: str = Field(..., alias="GEMINI_API_KEY")

    # Deepgram API
    deepgram_api_key: str = Field(..., alias="DEEPGRAM_API_KEY")

    # Twitch
    twitch_bot_token: str = Field(..., alias="TWITCH_BOT_TOKEN")
    twitch_client_id: str = Field(..., alias="TWITCH_CLIENT_ID")
    twitch_client_secret: str = Field(..., alias="TWITCH_CLIENT_SECRET")
    twitch_bot_id: str = Field(..., alias="TWITCH_BOT_ID")
    twitch_channel: str = Field(..., alias="TWITCH_CHANNEL")
    twitch_bot_username: str = Field(..., alias="TWITCH_BOT_USERNAME")

    # Audio
    audio_output_device: str = Field("MacBook Pro Speakers", alias="AUDIO_OUTPUT_DEVICE")
    
    # Avatar TTS mode: Use TalkingHead's built-in TTS instead of Deepgram
    # Set to "true" to enable lip-synced avatar speech
    use_avatar_tts: bool = Field(False, alias="USE_AVATAR_TTS")

    # Server
    host: str = Field("127.0.0.1", alias="HOST")
    port: int = Field(8000, alias="PORT")

    # Persona
    persona_config: str = Field(
        "config/personas/default.yaml", alias="PERSONA_CONFIG"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


def get_settings() -> Settings:
    """Load and return settings."""
    return Settings()
