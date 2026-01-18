"""Application settings loaded from environment variables."""

from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Cerebras (Cloud LLM)
    cerebras_api_key: str = Field(..., alias="CEREBRAS_API_KEY")
    cerebras_model: str = Field("llama-3.3-70b", alias="CEREBRAS_MODEL")

    # Deepgram API
    deepgram_api_key: str = Field(..., alias="DEEPGRAM_API_KEY")

    # Token Compression (The Token Company)
    token_company_api_key: str = Field("", alias="TOKEN_COMPANY_API_KEY")
    compression_enabled: bool = Field(True, alias="COMPRESSION_ENABLED")
    compression_aggressiveness: float = Field(0.5, alias="COMPRESSION_AGGRESSIVENESS")

    # Vision (Overshoot AI)
    overshoot_api_key: str = Field("", alias="OVERSHOOT_API_KEY")
    vision_enabled: bool = Field(False, alias="VISION_ENABLED")
    vision_server_url: str = Field("http://localhost:3001", alias="VISION_SERVER_URL")

    # Twitch
    twitch_bot_token: str = Field(..., alias="TWITCH_BOT_TOKEN")
    twitch_client_id: str = Field(..., alias="TWITCH_CLIENT_ID")
    twitch_client_secret: str = Field(..., alias="TWITCH_CLIENT_SECRET")
    twitch_bot_id: str = Field(..., alias="TWITCH_BOT_ID")
    twitch_channel: str = Field(..., alias="TWITCH_CHANNEL")
    twitch_bot_username: str = Field(..., alias="TWITCH_BOT_USERNAME")
    twitch_refresh_token: str = Field("", alias="TWITCH_REFRESH_TOKEN")

    # Audio Output (TTS)
    audio_output_device: str = Field("MacBook Pro Speakers", alias="AUDIO_OUTPUT_DEVICE")

    # Audio Input (STT)
    stt_enabled: bool = Field(True, alias="STT_ENABLED")
    audio_input_device: str = Field("", alias="AUDIO_INPUT_DEVICE")  # Empty = default mic

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
