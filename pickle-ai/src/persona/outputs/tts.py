"""Text-to-speech output using Deepgram."""

import asyncio
import io
import os
import struct
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
    Streams audio to avatar overlay via WebSocket for lip-sync.
    """

    def __init__(
        self,
        api_key: str,
        output_device: str | None = None,
        lang: str = "en",
        sample_rate: int = 24000,
        voice_model: str = "aura-asteria-en",
        avatar_processor = None,
    ):
        self.api_key = api_key
        self.output_device = output_device
        self.lang = lang
        self.sample_rate = sample_rate
        self.voice_model = voice_model
        self.avatar_processor = avatar_processor
        
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

    def update_voice(self, voice_model: str) -> None:
        """Update voice settings on the fly."""
        self.voice_model = voice_model
        logger.info("tts_voice_updated", voice=voice_model)

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
            logger.warning("tts_empty_text")
            return
        await self.queue.put(output.text)
        logger.info("tts_queued", text=output.text[:50])

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
                logger.info("tts_speaking_started", text=text[:50])

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
        """Generate and stream speech for text."""
        try:
            # Generate audio using Deepgram in a thread pool (requests can be blocking)
            loop = asyncio.get_event_loop()
            audio_data = await loop.run_in_executor(
                None, self._generate_audio, text
            )

            if audio_data is None:
                return

            # Notify avatar we're speaking (for bounce animation)
            if self.avatar_processor:
                await self.avatar_processor.stream_audio_start(self.sample_rate)

            # Play audio locally (VB-Cable will route to OBS)
            logger.info("tts_playing_audio", duration=len(audio_data) / self.sample_rate)
            await self._play_local(audio_data)

            # Notify avatar we stopped speaking
            if self.avatar_processor:
                await self.avatar_processor.stream_audio_end()

        except Exception as e:
            logger.error("tts_speak_error", error=str(e))

    async def _play_local(self, audio_data: np.ndarray) -> None:
        """Play audio locally (fallback when no avatar)."""
        try:
            device_id = self._find_device()
            logger.debug("tts_playing", duration_sec=len(audio_data) / self.sample_rate)
            sd.play(audio_data, samplerate=self.sample_rate, device=device_id)
            sd.wait()
        except Exception as e:
            logger.error("tts_play_error", error=str(e))

    def _generate_audio(self, text: str) -> np.ndarray | None:
        """Generate audio from text using Deepgram (sync, runs in thread pool)."""
        mp3_fd = None
        wav_fd = None
        mp3_path = None
        wav_path = None
        
        try:
            # Create unique temp files
            mp3_fd, mp3_path = tempfile.mkstemp(suffix=".mp3", prefix="tts_")
            wav_fd, wav_path = tempfile.mkstemp(suffix=".wav", prefix="tts_")
            
            # Close file descriptors (we only need the paths)
            os.close(mp3_fd)
            os.close(wav_fd)
            mp3_fd = None
            wav_fd = None
            
            # Configure options - use dict for SDK 3.x
            options = {
                "model": self.voice_model,
            }

            # Generate speech using speak.rest.v() per SDK 3.x API
            response = self.client.speak.rest.v("1").save(
                filename=mp3_path,
                source={"text": text},
                options=options,
            )

            if not os.path.exists(mp3_path):
                logger.error("tts_file_not_created")
                return None

            # Convert to WAV using ffmpeg
            try:
                # Ensure we resample to self.sample_rate
                subprocess.run(
                    ["ffmpeg", "-i", mp3_path, "-ar", str(self.sample_rate), "-ac", "1", "-y", wav_path],
                    capture_output=True,
                    check=True,
                )
            except (subprocess.CalledProcessError, FileNotFoundError):
                logger.error("ffmpeg_not_found", msg="ffmpeg required for audio conversion")
                return None

            # Read WAV file
            with wave.open(wav_path, "rb") as wav_file:
                frames = wav_file.readframes(wav_file.getnframes())
                audio = np.frombuffer(frames, dtype=np.int16)
                audio = audio.astype(np.float32) / 32768.0

            return audio

        except Exception as e:
            logger.error("tts_generate_error", error=str(e))
            return None
        finally:
            # Clean up temp files
            for path in [mp3_path, wav_path]:
                if path and os.path.exists(path):
                    try:
                        os.unlink(path)
                    except Exception:
                        pass

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
