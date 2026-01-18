"""Text-to-speech output using Deepgram."""

import asyncio
import io
import os
import subprocess
import tempfile
import wave
from typing import Callable, Awaitable

import numpy as np
import sounddevice as sd
from deepgram import DeepgramClient

from ..brain.persona_engine import OutputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


class TTSProcessor:
    """
    Text-to-speech processor using Deepgram.
    Outputs audio to virtual audio cable for OBS capture.
    """

    def __init__(
        self,
        api_key: str,
        output_device: str | None = None,
        lang: str = "en",
        sample_rate: int = 24000,
        voice_model: str = "aura-asteria-en",
    ):
        self.api_key = api_key
        self.output_device = output_device
        self.lang = lang
        self.sample_rate = sample_rate
        self.voice_model = voice_model
        
        # Initialize Deepgram client
        self.client = DeepgramClient(api_key)
        
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

    def update_voice(self, voice_model: str, sample_rate: int | None = None) -> None:
        """Update voice settings on the fly."""
        self.voice_model = voice_model
        if sample_rate is not None:
            self.sample_rate = sample_rate
        logger.info("tts_voice_updated", voice=voice_model, sample_rate=self.sample_rate)

    async def start(self) -> None:
        """Start the TTS processor."""
        self._running = True
        self._speak_task = asyncio.create_task(self._speak_loop())
        logger.info("tts_started", voice=self.voice_model, device=self.output_device)

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
            # Generate audio using Deepgram in a thread pool (requests can be blocking)
            loop = asyncio.get_event_loop()
            audio_data = await loop.run_in_executor(
                None, self._generate_audio, text
            )

            if audio_data is None:
                return

            # Find output device
            device_id = self._find_device()

            # Play audio
            logger.debug("tts_playing", duration_sec=len(audio_data) / self.sample_rate)
            sd.play(audio_data, samplerate=self.sample_rate, device=device_id)
            sd.wait()

        except Exception as e:
            logger.error("tts_speak_error", error=str(e))
            # Don't raise here to keep loop running
            pass

    def _generate_audio(self, text: str) -> np.ndarray | None:
        """Generate audio from text using Deepgram (sync, runs in thread pool)."""
        try:
            # Configure options - use dict for SDK 3.x
            options = {
                "model": self.voice_model,
            }

            # Generate speech using speak.rest.v() per SDK 3.x API
            response = self.client.speak.rest.v("1").save(
                filename="temp_audio.mp3",
                source={"text": text},
                options=options,
            )

            # Read the saved MP3 file
            mp3_path = "temp_audio.mp3"
            if not os.path.exists(mp3_path):
                logger.error("tts_file_not_created")
                return None

            # Convert to WAV using ffmpeg
            wav_path = "temp_audio.wav"

            try:
                # Try ffmpeg first (faster)
                # Ensure we resample to self.sample_rate
                subprocess.run(
                    ["ffmpeg", "-i", mp3_path, "-ar", str(self.sample_rate), "-ac", "1", "-y", wav_path],
                    capture_output=True,
                    check=True,
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                logger.error("ffmpeg_not_found", msg="ffmpeg required for audio conversion")
                os.unlink(mp3_path)
                return None

            # Read WAV file
            with wave.open(wav_path, "rb") as wav_file:
                frames = wav_file.readframes(wav_file.getnframes())
                audio = np.frombuffer(frames, dtype=np.int16)
                audio = audio.astype(np.float32) / 32768.0

            # Clean up temp files
            os.unlink(mp3_path)
            os.unlink(wav_path)

            return audio

        except Exception as e:
            logger.error("tts_generate_error", error=str(e))
            return None

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
