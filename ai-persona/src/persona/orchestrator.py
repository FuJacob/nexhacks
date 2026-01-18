"""Central orchestrator coordinating inputs, brain, and outputs."""

import asyncio

from .inputs.base import InputEvent, InputProcessor
from .brain.persona_engine import PersonaBrain, OutputEvent
from .outputs.tts import TTSProcessor
from .outputs.avatar import AvatarProcessor
from .utils.logging import get_logger

logger = get_logger(__name__)


class Orchestrator:
    """
    Coordinates all async input streams and routes to brain/outputs.
    Uses asyncio.Queue for thread-safe event passing.
    """

    def __init__(
        self,
        brain: PersonaBrain,
        tts: TTSProcessor,
        avatar: AvatarProcessor,
    ):
        self.brain = brain
        self.tts = tts
        self.avatar = avatar

        self.input_queue: asyncio.Queue[InputEvent] = asyncio.Queue()
        self.output_queue: asyncio.Queue[OutputEvent] = asyncio.Queue()

        self.inputs: list[InputProcessor] = []
        self._running = False
        self._tasks: list[asyncio.Task] = []

        # Connect TTS speaking state to avatar
        self.tts.set_speaking_callback(self.avatar.set_speaking)
        
        # Connect TTS to avatar for lip-sync (when using avatar's TTS)
        self.tts.set_speak_text_callback(self.avatar.speak_text)

    def add_input(self, processor: InputProcessor) -> None:
        """Add an input processor."""
        self.inputs.append(processor)

    async def start(self) -> None:
        """Start all processors and the main loop."""
        self._running = True

        logger.info("orchestrator_starting", input_count=len(self.inputs))

        # Start TTS
        await self.tts.start()

        # Create tasks
        self._tasks = [
            asyncio.create_task(self._main_loop(), name="main_loop"),
            asyncio.create_task(self._output_loop(), name="output_loop"),
        ]

        # Start input processors
        for i, inp in enumerate(self.inputs):
            task = asyncio.create_task(
                inp.run(self.input_queue),
                name=f"input_{i}",
            )
            self._tasks.append(task)

        logger.info("orchestrator_started")

    async def stop(self) -> None:
        """Stop the orchestrator and all processors."""
        self._running = False

        logger.info("orchestrator_stopping")

        # Stop inputs
        for inp in self.inputs:
            try:
                await inp.stop()
            except Exception as e:
                logger.error("input_stop_error", error=str(e))

        # Stop TTS
        await self.tts.stop()

        # Cancel tasks
        for task in self._tasks:
            task.cancel()

        # Wait for tasks to complete
        await asyncio.gather(*self._tasks, return_exceptions=True)

        logger.info("orchestrator_stopped")

    async def run_forever(self) -> None:
        """Run the orchestrator until stopped."""
        await self.start()

        try:
            # Wait for all tasks
            await asyncio.gather(*self._tasks)
        except asyncio.CancelledError:
            pass
        finally:
            await self.stop()

    async def _main_loop(self) -> None:
        """Process input events through the brain."""
        logger.info("main_loop_started")

        while self._running:
            try:
                # Wait for input with timeout
                try:
                    event = await asyncio.wait_for(
                        self.input_queue.get(),
                        timeout=1.0,
                    )
                except asyncio.TimeoutError:
                    continue

                logger.debug(
                    "processing_input",
                    source=event.source,
                    content_len=len(event.content),
                )

                # Process through brain
                response = await self.brain.process(event)

                if response:
                    await self.output_queue.put(response)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("main_loop_error", error=str(e))

        logger.info("main_loop_stopped")

    async def _output_loop(self) -> None:
        """Route output events to handlers."""
        logger.info("output_loop_started")

        while self._running:
            try:
                # Wait for output with timeout
                try:
                    output = await asyncio.wait_for(
                        self.output_queue.get(),
                        timeout=1.0,
                    )
                except asyncio.TimeoutError:
                    continue

                logger.debug(
                    "processing_output",
                    text_len=len(output.text),
                    emotion=output.emotion,
                )

                # Send to both TTS and avatar in parallel
                await asyncio.gather(
                    self.tts.handle(output),
                    self.avatar.handle(output),
                )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("output_loop_error", error=str(e))

        logger.info("output_loop_stopped")
