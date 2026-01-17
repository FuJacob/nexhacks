"""Main application entry point."""

import asyncio
import signal
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

from config.settings import get_settings
from .brain.llm_client import LLMClient
from .brain.persona_engine import PersonaBrain, PersonaConfig
from .inputs.twitch_chat import TwitchChatProcessor
from .outputs.tts import TTSProcessor
from .outputs.avatar import AvatarProcessor
from .orchestrator import Orchestrator
from .web.server import create_app
from .utils.logging import setup_logging, get_logger


async def main() -> None:
    """Main application entry point."""
    # Load environment variables
    load_dotenv()

    # Setup logging
    setup_logging(debug=True)
    logger = get_logger(__name__)

    logger.info("starting_ai_persona")

    try:
        # Load settings
        settings = get_settings()
        logger.info("settings_loaded", channel=settings.twitch_channel)

        # Load persona config
        persona_config = PersonaConfig.from_yaml(settings.persona_config)
        logger.info("persona_loaded", name=persona_config.name)

        # Initialize components
        llm_client = LLMClient(api_key=settings.openai_api_key)

        brain = PersonaBrain(
            llm_client=llm_client,
            persona_config=persona_config,
        )

        tts = TTSProcessor(
            api_key=settings.openai_api_key,
            voice=persona_config.voice.get("voice_id", "nova"),
            output_device=settings.audio_output_device,
        )

        avatar = AvatarProcessor()

        # Create orchestrator
        orchestrator = Orchestrator(
            brain=brain,
            tts=tts,
            avatar=avatar,
        )

        # Add Twitch input
        twitch = TwitchChatProcessor(
            token=settings.twitch_bot_token,
            channel=settings.twitch_channel,
            client_id=settings.twitch_client_id,
            batch_interval=2.0,
            max_batch_size=persona_config.behavior.get("chat_batch_size", 10),
        )
        orchestrator.add_input(twitch)

        # Create FastAPI app
        app = create_app(avatar)

        # Configure uvicorn
        config = uvicorn.Config(
            app,
            host=settings.host,
            port=settings.port,
            log_level="info",
        )
        server = uvicorn.Server(config)

        # Setup signal handlers
        loop = asyncio.get_event_loop()
        stop_event = asyncio.Event()

        def signal_handler():
            logger.info("shutdown_signal_received")
            stop_event.set()

        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, signal_handler)

        # Start orchestrator
        orchestrator_task = asyncio.create_task(orchestrator.run_forever())

        # Start web server
        server_task = asyncio.create_task(server.serve())

        logger.info(
            "ai_persona_running",
            overlay_url=f"http://{settings.host}:{settings.port}/overlay",
        )

        # Wait for shutdown signal
        await stop_event.wait()

        logger.info("shutting_down")

        # Stop orchestrator
        await orchestrator.stop()

        # Stop server
        server.should_exit = True
        await server_task

        logger.info("shutdown_complete")

    except Exception as e:
        logger.error("startup_error", error=str(e))
        raise


def run() -> None:
    """Run the application."""
    asyncio.run(main())


if __name__ == "__main__":
    run()
