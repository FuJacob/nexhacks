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
from .brain.assembler import ContextAssembler
from .brain.compressor import TokenCompressor
from .brain.memory.short_term import ShortTermMemory
from .brain.memory.long_term import LongTermMemory
from .inputs.twitch_chat import TwitchChatProcessor
from .inputs.vision import VisionInputProcessor
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
    setup_logging(debug=False)  # Changed from True to reduce log noise
    logger = get_logger(__name__)

    logger.info("starting_ai_persona")

    try:
        # Load settings
        settings = get_settings()
        logger.info("settings_loaded", channel=settings.twitch_channel)

        # Load persona config
        persona_config = PersonaConfig.from_yaml(settings.persona_config)
        logger.info("persona_loaded", name=persona_config.name)

        # Initialize components - using Ollama (local LLM)
        llm_client = LLMClient(model=settings.ollama_model)

        # Initialize token compressor
        compressor = None
        if settings.compression_enabled and settings.token_company_api_key:
            compressor = TokenCompressor(
                api_key=settings.token_company_api_key,
                default_aggressiveness=settings.compression_aggressiveness,
            )
            logger.info(
                "compressor_enabled",
                aggressiveness=settings.compression_aggressiveness,
            )
        else:
            logger.info("compressor_disabled")

        # Initialize memory system
        logger.info("initializing_memory_system")
        stm = ShortTermMemory(max_size=15)
        ltm = LongTermMemory(
            persist_directory="./data/chromadb",
            collection_name="persona_memory",
        )
        context_assembler = ContextAssembler(
            stm=stm,
            ltm=ltm,
            compressor=compressor,
            stm_message_count=10,
            ltm_result_count=3,
            ltm_min_relevance=0.4,
        )
        logger.info(
            "memory_system_initialized",
            stm_max_size=stm.max_size,
            ltm_count=ltm.count,
        )

        brain = PersonaBrain(
            llm_client=llm_client,
            persona_config=persona_config,
            context_assembler=context_assembler,
        )

        avatar = AvatarProcessor()

        tts = TTSProcessor(
            api_key=settings.deepgram_api_key,
            output_device=settings.audio_output_device,
            lang="en",
            avatar_processor=avatar,
        )

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
            client_secret=settings.twitch_client_secret,
            bot_id=settings.twitch_bot_id,
            refresh_token=settings.twitch_refresh_token,
            batch_interval=2.0,
            max_batch_size=persona_config.behavior.get("chat_batch_size", 10),
        )
        orchestrator.add_input(twitch)

        # Add Vision input if enabled
        if settings.vision_enabled:
            vision = VisionInputProcessor(
                server_url=settings.vision_server_url,
                poll_interval=3.0,
                use_websocket=True,
                auto_start_vision=True,
            )
            orchestrator.add_input(vision)
            logger.info(
                "vision_enabled",
                server_url=settings.vision_server_url,
            )
        else:
            logger.info("vision_disabled")

        # Add Speech (STT) input if enabled
        if settings.stt_enabled:
            from .inputs.speech import SpeechInputProcessor
            speech = SpeechInputProcessor(
                api_key=settings.deepgram_api_key,
                input_device=settings.audio_input_device if settings.audio_input_device else None,
            )
            orchestrator.add_input(speech)
            logger.info(
                "stt_enabled",
                device=settings.audio_input_device or "default",
            )
        else:
            logger.info("stt_disabled")

        # Create FastAPI app with TTS and brain for live updates
        app = create_app(
            avatar_processor=avatar,
            tts_processor=tts,
            brain=brain,
        )

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
