"""Text-to-speech output using OpenAI TTS."""

import asyncio
import io
from typing import Callable, Awaitable

import numpy as np
import sounddevice as sd
from openai import AsyncOpenAI

from ..brain.persona_engine import OutputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


class TTSProcessor:
    """
    Text-to-speech processor using OpenAI TTS.
    Outputs audio to virtual audio cable for OBS capture.
    """

    def __init__(
        self,
        api_key: str,
        voice: str = "nova",
        output_device: str | None = None,
        sample_rate: int = 24000,
    ):
        self.client = AsyncOpenAI(api_key=api_key)
        self.voice = voice
        self.output_device = output_device
        self.sample_rate = sample_rate
        self.speaking = False
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self._running = False
        self._speak_task: asyncio.Task | None = None
        self._on_speaking_change: Callable[[bool], Awaitable[None]] | None = None

    def set_speaking_callback(
        self, callback: Callable[[bool], Awaitable[None]]
    ) -> None:
        """Set callback for speaking state changes."""
        self._on_speaking_change = callback

    async def start(self) -> None:
        """Start the TTS processor."""
        self._running = True
        self._speak_task = asyncio.create_task(self._speak_loop())
        logger.info("tts_started", voice=self.voice, device=self.output_device)

    async def stop(self) -> None:
        """Stop the TTS processor."""
        self._running = False
        if self._speak_task:
            self._speak_task.cancel()
            try:
                await self._speak_task
            except asyncio.CancelledError:
                pass
        logger.info("tts_stopped")

    async def handle(self, output: OutputEvent) -> None:
        """Handle output event - queue text for speaking."""
        if not output.text:
            return
        await self.queue.put(output.text)
        logger.debug("tts_queued", text=output.text[:30])

    async def _speak_loop(self) -> None:
        """Process speech queue sequentially."""
        while self._running:
            try:
                # Wait for text with timeout to allow checking _running
                try:
                    text = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue

                # Notify speaking started
                self.speaking = True
                if self._on_speaking_change:
                    await self._on_speaking_change(True)

                # Generate and play audio
                await self._speak(text)

                # Notify speaking stopped
                self.speaking = False
                if self._on_speaking_change:
                    await self._on_speaking_change(False)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("tts_error", error=str(e))
                self.speaking = False

    async def _speak(self, text: str) -> None:
        """Generate and play speech for text."""
        try:
            # Generate audio from OpenAI
            response = await self.client.audio.speech.create(
                model="tts-1",
                voice=self.voice,
                input=text,
                response_format="pcm",
            )

            # Read audio data
            audio_bytes = response.content

            # Convert PCM to numpy array (16-bit signed int, little-endian)
            audio = np.frombuffer(audio_bytes, dtype=np.int16)
            audio = audio.astype(np.float32) / 32768.0

            # Find output device
            device_id = self._find_device()

            # Play audio
            logger.debug("tts_playing", duration_sec=len(audio) / self.sample_rate)
            sd.play(audio, samplerate=self.sample_rate, device=device_id)
            sd.wait()

        except Exception as e:
            logger.error("tts_speak_error", error=str(e))
            raise

    def _find_device(self) -> int | None:
        """Find the output device by name."""
        if not self.output_device:
            return None

        devices = sd.query_devices()
        output_lower = self.output_device.lower()

        for i, device in enumerate(devices):
            name = device.get("name", "").lower()
            max_output = device.get("max_output_channels", 0)

            if output_lower in name and max_output > 0:
                logger.debug("tts_device_found", index=i, name=device["name"])
                return i

        logger.warning("tts_device_not_found", requested=self.output_device)
        return None
