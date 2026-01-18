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
        """Generate and stream speech for text."""
        try:
            # Generate audio using Deepgram in a thread pool (requests can be blocking)
            loop = asyncio.get_event_loop()
            audio_data = await loop.run_in_executor(
                None, self._generate_audio, text
            )

            if audio_data is None:
                return

            # If avatar processor is available, stream to overlay
            if self.avatar_processor:
                await self._stream_to_avatar(audio_data, text)
            else:
                # Fallback: play locally
                await self._play_local(audio_data)

        except Exception as e:
            logger.error("tts_speak_error", error=str(e))

    async def _stream_to_avatar(self, audio_data: np.ndarray, text: str) -> None:
        """Stream audio to avatar overlay for lip-sync."""
        try:
            # Convert float32 audio to int16 PCM
            audio_int16 = (audio_data * 32767).astype(np.int16)
            audio_bytes = audio_int16.tobytes()
            
            # Start stream
            await self.avatar_processor.stream_audio_start(self.sample_rate)
            
            # Send audio in chunks (simulate streaming)
            chunk_size = self.sample_rate * 2  # 2 seconds worth of samples
            for i in range(0, len(audio_bytes), chunk_size * 2):  # *2 for int16 bytes
                chunk = audio_bytes[i:i + chunk_size * 2]
                await self.avatar_processor.stream_audio_chunk(chunk, text if i == 0 else "")
                # Small delay to simulate real streaming
                await asyncio.sleep(0.1)
            
            # End stream
            await self.avatar_processor.stream_audio_end()
            
            # Wait for audio duration
            duration = len(audio_data) / self.sample_rate
            await asyncio.sleep(duration)
            
            logger.debug("tts_streamed_to_avatar", duration_sec=duration)
            
        except Exception as e:
            logger.error("tts_stream_error", error=str(e))

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
