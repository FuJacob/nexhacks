"""Speech input processor using Deepgram live STT."""

import asyncio
from datetime import datetime
from typing import Callable, Awaitable

import numpy as np
import sounddevice as sd
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions

from .base import InputProcessor, InputEvent
from ..utils.logging import get_logger

logger = get_logger(__name__)


class SpeechInputProcessor(InputProcessor):
    """
    Real-time speech-to-text input processor using Deepgram.
    
    Captures audio from system microphone and streams to Deepgram
    for live transcription, emitting InputEvents for each utterance.
    """

    def __init__(
        self,
        api_key: str,
        input_device: str | None = None,
        sample_rate: int = 16000,
        channels: int = 1,
        min_speech_length: int = 5,
    ):
        """
        Initialize speech input processor.
        
        Args:
            api_key: Deepgram API key
            input_device: Audio input device name (None for default)
            sample_rate: Audio sample rate (16000 recommended for STT)
            channels: Number of audio channels (1 for mono)
            min_speech_length: Minimum characters for valid speech
        """
        self.api_key = api_key
        self.input_device = input_device
        self.sample_rate = sample_rate
        self.channels = channels
        self.min_speech_length = min_speech_length
        
        self._running = False
        self._queue: asyncio.Queue[InputEvent] | None = None
        self._client: DeepgramClient | None = None
        self._connection = None
        self._stream: sd.InputStream | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

    def _get_device_index(self) -> int | None:
        """Find the input device index by name."""
        if not self.input_device:
            return None
        
        devices = sd.query_devices()
        for i, device in enumerate(devices):
            if self.input_device.lower() in device['name'].lower():
                if device['max_input_channels'] > 0:
                    logger.info("stt_device_found", name=device['name'], index=i)
                    return i
        
        logger.warning("stt_device_not_found", requested=self.input_device)
        return None

    def _audio_callback(self, indata: np.ndarray, frames: int, time_info, status):
        """Callback for audio stream - sends audio to Deepgram."""
        if status:
            logger.warning("stt_audio_status", status=str(status))
        
        if self._connection and self._running:
            try:
                # Convert float32 to int16 PCM
                audio_int16 = (indata * 32767).astype(np.int16)
                self._connection.send(audio_int16.tobytes())
            except Exception as e:
                logger.error("stt_send_error", error=str(e))

    async def _handle_transcript(self, result) -> None:
        """Handle transcription result from Deepgram."""
        try:
            # Get the transcript
            transcript = result.channel.alternatives[0].transcript
            is_final = result.is_final
            
            # Only process final transcripts with enough content
            if is_final and transcript and len(transcript.strip()) >= self.min_speech_length:
                speech_text = transcript.strip()
                
                logger.info("stt_transcript", text=speech_text[:50], is_final=is_final)
                
                # Create input event
                event = InputEvent(
                    source="speech",
                    content=speech_text,
                    timestamp=datetime.now(),
                    metadata={"is_final": is_final},
                )
                
                # Push to queue
                if self._queue:
                    await self._queue.put(event)
                    
        except Exception as e:
            logger.error("stt_transcript_error", error=str(e))

    def _on_transcript(self, *args, **kwargs):
        """Sync callback wrapper for async transcript handler."""
        # Extract result from args (Deepgram SDK passes result as positional arg)
        result = args[1] if len(args) > 1 else kwargs.get('result')
        if result and self._loop:
            asyncio.run_coroutine_threadsafe(
                self._handle_transcript(result),
                self._loop
            )

    def _on_error(self, *args, **kwargs):
        """Handle Deepgram connection errors."""
        error = args[1] if len(args) > 1 else kwargs.get('error', 'Unknown error')
        logger.error("stt_connection_error", error=str(error))

    def _on_close(self, *args, **kwargs):
        """Handle Deepgram connection close."""
        logger.info("stt_connection_closed")

    async def run(self, queue: asyncio.Queue[InputEvent]) -> None:
        """Run the speech input processor."""
        self._queue = queue
        self._running = True
        self._loop = asyncio.get_event_loop()
        
        logger.info("stt_starting", device=self.input_device)
        
        try:
            # Initialize Deepgram client
            self._client = DeepgramClient(self.api_key)
            
            # Create live connection
            self._connection = self._client.listen.live.v("1")
            
            # Register event handlers
            self._connection.on(LiveTranscriptionEvents.Transcript, self._on_transcript)
            self._connection.on(LiveTranscriptionEvents.Error, self._on_error)
            self._connection.on(LiveTranscriptionEvents.Close, self._on_close)
            
            # Configure transcription options
            options = LiveOptions(
                model="nova-2",
                language="en",
                punctuate=True,
                interim_results=False,  # Only final results
                encoding="linear16",
                sample_rate=self.sample_rate,
                channels=self.channels,
            )
            
            # Start connection
            if not self._connection.start(options):
                logger.error("stt_connection_failed")
                return
            
            logger.info("stt_connected")
            
            # Find input device
            device_index = self._get_device_index()
            
            # Start audio stream
            self._stream = sd.InputStream(
                device=device_index,
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype=np.float32,
                callback=self._audio_callback,
                blocksize=int(self.sample_rate * 0.1),  # 100ms blocks
            )
            self._stream.start()
            
            logger.info("stt_stream_started", sample_rate=self.sample_rate)
            
            # Keep running until stopped
            while self._running:
                await asyncio.sleep(0.1)
                
        except Exception as e:
            logger.error("stt_error", error=str(e))
        finally:
            await self._cleanup()

    async def _cleanup(self) -> None:
        """Clean up resources."""
        if self._stream:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None
        
        if self._connection:
            try:
                self._connection.finish()
            except Exception:
                pass
            self._connection = None
        
        logger.info("stt_stopped")

    async def stop(self) -> None:
        """Stop the speech input processor."""
        self._running = False
        await self._cleanup()
