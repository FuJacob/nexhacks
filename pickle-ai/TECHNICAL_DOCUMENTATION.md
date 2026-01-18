# Pickle AI - Comprehensive Technical Documentation

> **Version:** 0.1.0  
> **Last Updated:** January 2026  
> **Project Type:** AI-Powered IRL Twitch Stream Companion

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Technology Stack](#technology-stack)
4. [Core Components Deep Dive](#core-components-deep-dive)
5. [Data Flow & Processing Pipeline](#data-flow--processing-pipeline)
6. [Memory Architecture (RAG System)](#memory-architecture-rag-system)
7. [Input Processing System](#input-processing-system)
8. [Output Processing System](#output-processing-system)
9. [Vision Processing Subsystem](#vision-processing-subsystem)
10. [Configuration & Persona System](#configuration--persona-system)
11. [API & Web Server](#api--web-server)
12. [Deployment Architecture](#deployment-architecture)
13. [Design Decisions & Rationale](#design-decisions--rationale)
14. [Security Considerations](#security-considerations)
15. [Future Extensibility](#future-extensibility)

---

## Executive Summary

Pickle AI is a modular, real-time AI companion system designed for IRL (In Real Life) Twitch streamers. It acts as an intelligent co-host that can:

- **Listen** to Twitch chat messages in real-time
- **See** what's happening on stream via computer vision
- **Hear** the streamer's voice via speech-to-text
- **Speak** responses through text-to-speech
- **Remember** past conversations and context through a hybrid memory system

The system operates as a "collective brain" of chat, summarizing viewer sentiment, answering common questions, and supporting the streamer without stealing the spotlight.

---

## System Architecture Overview

The application follows a **microservices-inspired modular architecture** with three main services:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PICKLE AI SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PYTHON BACKEND (Core)                           │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐  │   │
│  │  │  Inputs  │──│ Orchestrator │──│   Brain    │──│   Outputs    │  │   │
│  │  │ Manager  │  │  (Event Hub) │  │ (LLM+RAG)  │  │   Manager    │  │   │
│  │  └──────────┘  └──────────────┘  └────────────┘  └──────────────┘  │   │
│  │       │                                                  │          │   │
│  │  ┌────┴────────────────────────────────────────────────┴─────┐    │   │
│  │  │  FastAPI Web Server (REST API + WebSocket)                │    │   │
│  │  └───────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     NODE.JS VISION SERVER                           │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────────────────┐    │   │
│  │  │ Fastify  │──│  Puppeteer   │──│  Overshoot AI SDK          │    │   │
│  │  │ Server   │  │  (Headless)  │  │  (WebRTC/Vision Analysis)  │    │   │
│  │  └──────────┘  └──────────────┘  └────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     FRONTEND (Electron + React)                     │   │
│  │  ┌────────────────┐  ┌─────────────────────────────────────────┐   │   │
│  │  │ Control Panel  │  │  OBS Overlay (Browser Source)           │   │   │
│  │  └────────────────┘  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
                    ┌──────────────┐
                    │  Twitch Chat │
                    └──────┬───────┘
                           │
    ┌──────────────┐       │       ┌──────────────┐
    │   Webcam/    │       │       │  Microphone  │
    │   Camera     │       │       │  (Streamer)  │
    └──────┬───────┘       │       └──────┬───────┘
           │               │               │
           ▼               ▼               ▼
    ┌──────────────────────────────────────────────┐
    │           INPUT PROCESSORS                    │
    │  ┌────────┐  ┌────────┐  ┌────────────────┐  │
    │  │ Vision │  │ Twitch │  │    Speech      │  │
    │  │  WS    │  │  IRC   │  │   (Deepgram)   │  │
    │  └───┬────┘  └───┬────┘  └───────┬────────┘  │
    └──────┼───────────┼───────────────┼───────────┘
           │           │               │
           └───────────┼───────────────┘
                       ▼
              ┌─────────────────┐
              │  Input Queue    │
              │ (asyncio.Queue) │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  ORCHESTRATOR   │
              │  (Main Loop)    │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  PERSONA BRAIN  │
              │ ┌─────────────┐ │
              │ │ Context     │ │
              │ │ Assembler   │ │
              │ ├─────────────┤ │
              │ │ STM + LTM   │ │
              │ │ (ChromaDB)  │ │
              │ ├─────────────┤ │
              │ │ LLM Client  │ │
              │ │ (Ollama)    │ │
              │ └─────────────┘ │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  Output Queue   │
              └────────┬────────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │           OUTPUT PROCESSORS                   │
    │  ┌──────────────────┐  ┌───────────────────┐ │
    │  │   TTS Engine     │  │  Avatar Overlay   │ │
    │  │   (Deepgram)     │  │  (WebSocket)      │ │
    │  └────────┬─────────┘  └─────────┬─────────┘ │
    └───────────┼──────────────────────┼───────────┘
                │                      │
                ▼                      ▼
         ┌──────────────┐      ┌──────────────┐
         │ Audio Output │      │ OBS Browser  │
         │ (VB-Cable)   │      │   Source     │
         └──────────────┘      └──────────────┘
```

---

## Technology Stack

### Python Backend (Core Intelligence)

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Python** | 3.11+ | Core runtime | Modern async/await support, type hints, excellent ML/AI ecosystem |
| **FastAPI** | 0.109+ | Web framework | High-performance async, automatic OpenAPI docs, WebSocket support |
| **Uvicorn** | 0.27+ | ASGI server | Production-grade async server for FastAPI |
| **TwitchIO** | 2.6.x | Twitch integration | Mature Python library for Twitch IRC/EventSub |
| **Ollama** | (local) | LLM inference | Local LLM hosting, privacy-first, no API costs |
| **ChromaDB** | 0.4+ | Vector database | Lightweight, embedded, Python-native vector store |
| **sentence-transformers** | 2.2+ | Embeddings | all-MiniLM-L6-v2 for fast, accurate semantic search |
| **Deepgram SDK** | 3.9.x | STT & TTS | Real-time speech processing, high accuracy |
| **Pydantic** | 2.6+ | Data validation | Type-safe settings and schema validation |
| **structlog** | 24.1+ | Logging | Structured JSON logging for observability |
| **aiohttp** | 3.9+ | Async HTTP | Vision server communication, webhook handling |
| **sounddevice** | 0.4+ | Audio I/O | Cross-platform audio capture and playback |
| **NumPy** | 1.26+ | Audio processing | Efficient array operations for audio data |
| **PyYAML** | 6.0+ | Configuration | Human-readable persona configuration files |
| **tokenc** | 0.1+ | Token compression | Reduce LLM input costs (The Token Company SDK) |

### Node.js Vision Server (Sidecar)

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Node.js** | 18+ | Runtime | Required for browser APIs (WebRTC) |
| **Fastify** | 4.x | Web framework | Fastest Node.js HTTP framework |
| **Puppeteer** | Latest | Browser automation | Headless Chrome for WebRTC/camera access |
| **Overshoot AI SDK** | CDN | Vision analysis | Real-time video understanding via browser |
| **WebSocket** | Built-in | Real-time comms | Stream vision results to Python backend |

### Frontend (Electron + React)

| Technology | Purpose |
|------------|---------|
| **Electron** | Desktop application wrapper |
| **React** | UI framework |
| **TypeScript** | Type-safe frontend code |
| **Vite** | Build tooling |

### External Services

| Service | Purpose | Why Chosen |
|---------|---------|------------|
| **Twitch API** | Chat integration | Primary streaming platform |
| **Deepgram** | STT + TTS | Low latency, high accuracy speech services |
| **Overshoot AI** | Vision analysis | Real-time video understanding |
| **The Token Company** | Token compression | Cost optimization for LLM calls |

---

## Core Components Deep Dive

### 1. Orchestrator (`src/persona/orchestrator.py`)

The Orchestrator is the **central nervous system** of the application. It:

- Manages the main event loop
- Coordinates all input processors
- Routes events to the PersonaBrain
- Dispatches outputs to handlers

**Key Design Patterns:**
- **Producer-Consumer Pattern**: Input processors produce events, Brain consumes them
- **Queue-based Decoupling**: `asyncio.Queue` separates input ingestion from processing
- **Vision Batching**: Collects multiple vision events before processing to avoid spam

```python
class Orchestrator:
    def __init__(self, brain, tts, avatar):
        self.input_queue: asyncio.Queue[InputEvent] = asyncio.Queue()
        self.output_queue: asyncio.Queue[OutputEvent] = asyncio.Queue()
        self.inputs: list[InputProcessor] = []
```

**Vision Batching Logic:**
- Collects up to 5 vision events before processing
- Or processes after 15-second timeout
- Prevents the AI from responding to every frame change

### 2. Persona Brain (`src/persona/brain/persona_engine.py`)

The PersonaBrain is the **AI decision-making core**. It:

- Constructs context-rich prompts
- Decides whether to respond
- Generates emotionally-aware responses
- Maintains conversation coherence

**Key Features:**
- **Dynamic System Prompt**: Built from YAML persona config
- **Response Gating**: `_should_respond()` prevents spam
- **Cooldown Management**: Configurable minimum time between responses
- **Emotion Selection**: Outputs include emotion for avatar/TTS modulation

```python
class PersonaBrain:
    async def process(self, event: InputEvent) -> OutputEvent | None:
        # 1. Store input in memory
        self.assembler.process_input(content=event.content, ...)
        
        # 2. Check if we should respond
        if not self._should_respond(event):
            return None
        
        # 3. Build context with RAG
        messages = self.assembler.build_messages(current_input=event.content, ...)
        
        # 4. Get LLM response
        response = await self.llm.get_persona_response(messages)
        
        # 5. Store response in memory
        self.assembler.process_response(response.text)
        
        return OutputEvent(text=response.text, emotion=response.emotion)
```

### 3. LLM Client (`src/persona/brain/llm_client.py`)

A unified async interface for LLM inference using **Ollama** (local models).

**Why Ollama?**
- **Privacy**: No data leaves the local machine
- **Cost**: Zero API costs after initial setup
- **Latency**: No network round-trip for inference
- **Control**: Full control over model selection and parameters

**Structured Output:**
Uses Ollama's JSON schema enforcement to guarantee valid responses:

```python
class PersonaResponse(BaseModel):
    text: str = Field(description="The response text to speak")

async def get_persona_response(self, messages, max_tokens=150, temperature=0.8):
    result = await self.chat_completion(
        messages=messages,
        response_schema=PersonaResponse,  # Guarantees JSON structure
    )
    return PersonaResponse(**result)
```

### 4. Context Assembler (`src/persona/brain/assembler.py`)

The **RAG (Retrieval-Augmented Generation)** orchestrator that stitches together:
- Short-term memory (recent conversation)
- Long-term memory (semantic search results)
- System prompt (persona configuration)

```python
class ContextAssembler:
    def __init__(self, stm, ltm, compressor, stm_message_count=10, ltm_result_count=3):
        self.stm = stm  # Short-term memory
        self.ltm = ltm  # Long-term memory
        self.compressor = compressor  # Token compression
```

**Assembly Flow:**
1. Query LTM with current input for semantic matches
2. Fetch recent STM messages for conversational flow
3. Optionally compress context to reduce tokens
4. Build final message array for LLM

---

## Memory Architecture (RAG System)

Pickle AI implements a **hybrid memory system** inspired by human cognition:

```
┌─────────────────────────────────────────────────────────────────┐
│                       MEMORY ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SHORT-TERM MEMORY (STM)                     │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  Rolling Window (deque, max 15 messages)         │    │   │
│  │  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐      │    │   │
│  │  │  │ M1│ M2│ M3│ M4│ M5│ M6│ M7│ M8│ M9│M10│ ...  │    │   │
│  │  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘      │    │   │
│  │  │  Purpose: Immediate conversational coherence     │    │   │
│  │  │  Access: O(1) - always available                 │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              LONG-TERM MEMORY (LTM)                      │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  ChromaDB Vector Store                           │    │   │
│  │  │  ┌───────────────────────────────────────────┐  │    │   │
│  │  │  │  Embedding: all-MiniLM-L6-v2              │  │    │   │
│  │  │  │  Similarity: Cosine                        │  │    │   │
│  │  │  │  Storage: Persistent (./data/chromadb)     │  │    │   │
│  │  │  └───────────────────────────────────────────┘  │    │   │
│  │  │  Purpose: Semantic recall of important info      │    │   │
│  │  │  Access: O(log n) - vector similarity search     │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Short-Term Memory (STM)

**Implementation:** `src/persona/brain/memory/short_term.py`

- **Data Structure:** `collections.deque` with `maxlen=15`
- **Purpose:** Maintain recent conversation context for coherent responses
- **Storage:** In-memory only (no persistence)
- **Access Pattern:** FIFO with automatic eviction

```python
class ShortTermMemory:
    def __init__(self, max_size: int = 15):
        self._memory: deque[MemoryEntry] = deque(maxlen=max_size)
    
    def add(self, role, content, source, user, metadata) -> MemoryEntry:
        entry = MemoryEntry(role=role, content=content, ...)
        self._memory.append(entry)  # Old entries auto-evicted
        return entry
```

### Long-Term Memory (LTM)

**Implementation:** `src/persona/brain/memory/long_term.py`

- **Database:** ChromaDB (embedded vector database)
- **Embeddings:** sentence-transformers `all-MiniLM-L6-v2`
- **Similarity Metric:** Cosine similarity
- **Persistence:** `./data/chromadb/` directory

**Selective Storage Criteria:**
Not all messages are stored in LTM. Storage is triggered by:
1. Message length ≥ 5 words, OR
2. Contains important entity patterns:
   - Activities: "playing", "watching", "streaming"
   - Preferences: "love", "hate", "favorite"
   - Identity: "name", "called"
   - Time references: "tomorrow", "next week"
   - Proper nouns (capitalized names)

```python
ENTITY_PATTERNS = [
    r"\b(play(?:ed|ing)?|watch(?:ed|ing)?|stream(?:ed|ing)?)\b",
    r"\b(love|hate|like|prefer|favorite)\b",
    r"\b(name(?:d)?|call(?:ed)?)\b",
    # ... more patterns
]

def should_save_to_ltm(self, content: str) -> bool:
    if len(content.split()) >= 5:
        return True
    for pattern in ENTITY_PATTERNS:
        if re.search(pattern, content, re.IGNORECASE):
            return True
    return False
```

**Retrieval:**
- Query: Current user input
- Results: Top 3 most semantically similar past memories
- Threshold: Minimum relevance score of 0.4

---

## Input Processing System

### Architecture

All inputs implement the `InputProcessor` base class:

```python
class InputProcessor:
    async def run(self, queue: asyncio.Queue[InputEvent]) -> None:
        """Run the processor, pushing events to the queue."""
        pass
    
    async def stop(self) -> None:
        """Stop the processor."""
        pass
```

### Input Types

#### 1. Twitch Chat (`src/persona/inputs/twitch_chat.py`)

**Protocol:** Twitch IRC via TwitchIO library

**Features:**
- Batches messages (configurable interval, default 2s)
- Auto token refresh
- Filters bot's own messages
- Metadata includes username, timestamp

```python
class TwitchChatProcessor(commands.Bot, InputProcessor):
    async def event_message(self, message):
        self.message_buffer.append({
            "user": message.author.name,
            "content": message.content,
            "timestamp": datetime.now(),
        })
        if len(self.message_buffer) >= self.max_batch_size:
            await self._flush_buffer()
```

#### 2. Vision (`src/persona/inputs/vision.py`)

**Protocol:** WebSocket to Node.js Vision Server

**Features:**
- Real-time scene descriptions from camera
- Batched processing (5 events or 15s timeout)
- Auto-reconnection
- Configurable polling fallback

```python
class VisionInputProcessor(InputProcessor):
    async def _listen_websocket(self, queue: asyncio.Queue[InputEvent]):
        ws_url = f"ws://{self.server_url.split('://')[1]}/vision/ws"
        async with session.ws_connect(ws_url) as ws:
            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    data = json.loads(msg.data)
                    if data.get("ok") and data.get("result"):
                        await queue.put(InputEvent(
                            source="vision",
                            content=data["result"],
                        ))
```

#### 3. Speech (STT) (`src/persona/inputs/speech.py`)

**Protocol:** Deepgram Live Transcription via WebSocket

**Features:**
- Real-time microphone capture
- Streaming transcription
- Filters short utterances (<5 chars)
- Configurable input device

```python
class SpeechInputProcessor(InputProcessor):
    def _audio_callback(self, indata, frames, time_info, status):
        # Convert float32 to int16 PCM
        audio_int16 = (indata * 32767).astype(np.int16)
        self._connection.send(audio_int16.tobytes())
    
    async def _handle_transcript(self, result):
        transcript = result.channel.alternatives[0].transcript
        if result.is_final and len(transcript) >= self.min_speech_length:
            await self._queue.put(InputEvent(
                source="speech",
                content=transcript,
            ))
```

---

## Output Processing System

### TTS Processor (`src/persona/outputs/tts.py`)

**Service:** Deepgram TTS API

**Features:**
- Queue-based sequential playback
- Speaking state callbacks for avatar sync
- Configurable voice model
- VB-Cable routing for OBS capture

```python
class TTSProcessor:
    async def _speak_loop(self):
        while self._running:
            text = await self.queue.get()
            
            # Notify speaking started
            self.speaking = True
            await self._on_speaking_change(True)
            
            # Generate and play audio
            audio_data = await self._generate_audio(text)
            await self._play_local(audio_data)
            
            # Notify speaking stopped
            self.speaking = False
            await self._on_speaking_change(False)
```

### Avatar Processor (`src/persona/outputs/avatar.py`)

**Protocol:** WebSocket broadcast to browser clients

**Features:**
- Speaking state synchronization
- Audio streaming for lip-sync
- Multi-client support
- Dead connection cleanup

```python
class AvatarProcessor:
    async def set_speaking(self, speaking: bool):
        self.is_speaking = speaking
        await self.broadcast({
            "type": "speaking",
            "value": speaking,
        })
    
    async def broadcast(self, data: dict):
        for ws in self.connections:
            await ws.send_text(json.dumps(data))
```

---

## Vision Processing Subsystem

### Why a Separate Node.js Server?

The Overshoot AI SDK requires **browser APIs** (WebRTC, MediaDevices) that don't exist in Python. The solution:

1. **Puppeteer** runs a headless Chrome browser
2. **Overshoot SDK** loaded from CDN into the browser
3. **Fastify** bridges Python ↔ Browser via WebSocket

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    VISION SERVER (Node.js)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────┐      ┌─────────────────────────────────┐  │
│  │  Fastify       │      │  Headless Chrome (Puppeteer)    │  │
│  │  ┌──────────┐  │      │  ┌───────────────────────────┐  │  │
│  │  │ REST API │◀─┼──────┼──│  vision-client.html       │  │  │
│  │  │ /health  │  │      │  │  ┌─────────────────────┐  │  │  │
│  │  │ /start   │  │      │  │  │ Overshoot SDK       │  │  │  │
│  │  │ /stop    │  │      │  │  │ - Camera Access     │  │  │  │
│  │  │ /latest  │  │      │  │  │ - WebRTC Stream     │  │  │  │
│  │  └──────────┘  │      │  │  │ - AI Analysis       │  │  │  │
│  │  ┌──────────┐  │      │  │  └─────────────────────┘  │  │  │
│  │  │WebSocket │◀─┼──────┼──│  Results via console.log │  │  │
│  │  │ /ws      │  │      │  └───────────────────────────┘  │  │
│  │  └──────────┘  │      └─────────────────────────────────┘  │
│  └────────────────┘                                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Python Backend  │
                    │  (Vision Input)  │
                    └──────────────────┘
```

### Communication Flow

1. Python calls `POST /vision/start`
2. Fastify tells Puppeteer to call `window.startVision()`
3. Overshoot SDK captures camera frames
4. SDK sends frames to Overshoot AI API
5. Results arrive via `console.log("__VISION_RESULT__" + json)`
6. Fastify broadcasts to WebSocket clients (Python)
7. Python creates `InputEvent(source="vision", content=result)`

### Browser Launch Flags

Critical flags for headless camera access:

```javascript
browser = await puppeteer.launch({
    headless: 'new',
    args: [
        '--use-fake-ui-for-media-stream',  // Auto-approve camera permission
        '--no-sandbox',                     // Required for many Linux environments
        '--disable-web-security',           // CORS issues with CDN SDK
        '--ignore-certificate-errors',      // Self-signed certs
    ],
});
```

---

## Configuration & Persona System

### Environment Variables (`.env`)

```bash
# LLM Configuration
OLLAMA_MODEL=phi3.5:latest

# Speech Services
DEEPGRAM_API_KEY=your_key_here

# Twitch Integration
TWITCH_BOT_TOKEN=oauth:xxx
TWITCH_CLIENT_ID=xxx
TWITCH_CLIENT_SECRET=xxx
TWITCH_CHANNEL=streamername

# Vision
VISION_ENABLED=true
OVERSHOOT_API_KEY=your_key_here

# Audio Routing
AUDIO_OUTPUT_DEVICE=VB-Cable
```

### Persona Configuration (`config/personas/default.yaml`)

```yaml
name: "John"

personality: |
  John is the voice of Twitch chat.
  He reads what viewers type and speaks it out loud.
  He's energetic, friendly, and adds personality.

style:
  - Keep it to 1 sentence, 2 max
  - Convert "he/she/they" references to "you"
  - Sound like you're talking TO the streamer

voice:
  provider: deepgram
  voice_id: aura-asteria-en
  speed: 1.0

behavior:
  spontaneous_rate: 0.20   # 20% chance to respond unprompted
  cooldown: 5.0            # Minimum 5 seconds between responses
  chat_batch_size: 10      # Process up to 10 messages at once
```

### Settings Manager (`src/persona/web/settings_manager.py`)

Provides runtime configuration with persistence:

```python
class SettingsManager:
    def __init__(self, config_path: Path = ".pickle_settings.json"):
        self._settings = self._load_settings()
    
    def update_voice(self, voice_model: str):
        self._settings.voice.voice_model = voice_model
        self._save_settings()
```

---

## API & Web Server

### FastAPI Endpoints (`src/persona/web/server.py`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health status |
| `/api/settings` | GET | Get all settings |
| `/api/settings/voice` | GET/PUT | Voice configuration |
| `/api/settings/persona` | GET/PUT | Persona configuration |
| `/ws/avatar` | WebSocket | Avatar state streaming |

### WebSocket Protocol

**Avatar WebSocket Messages:**

```json
// Server → Client: Speaking state
{"type": "speaking", "value": true}

// Server → Client: Audio stream start
{"type": "stream_start", "sample_rate": 24000}

// Server → Client: Audio chunk (base64)
{"type": "stream_audio", "audio": "base64...", "text": "Hello"}

// Server → Client: Stream end
{"type": "stream_end"}
```

---

## Deployment Architecture

### Local Development

```bash
# Terminal 1: Vision Server
cd vision-server && npm start

# Terminal 2: Python Backend
./run.sh
```

### Production Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT TOPOLOGY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────┐   ┌───────────────────────────────────┐ │
│  │   Streamer PC     │   │   Cloud / VPS (Optional)          │ │
│  │   ┌───────────┐   │   │   ┌───────────────────────────┐   │ │
│  │   │ Electron  │   │   │   │  Ollama + Pickle AI       │   │ │
│  │   │ Frontend  │◀──┼───┼──▶│  (if offloading LLM)      │   │ │
│  │   └───────────┘   │   │   └───────────────────────────┘   │ │
│  │   ┌───────────┐   │   └───────────────────────────────────┘ │
│  │   │ Vision    │   │                                         │
│  │   │ Server    │   │                                         │
│  │   └───────────┘   │                                         │
│  │   ┌───────────┐   │   ┌───────────────────────────────────┐ │
│  │   │ OBS       │   │   │   External Services               │ │
│  │   │ Studio    │   │   │   • Twitch IRC                    │ │
│  │   └───────────┘   │   │   • Deepgram API                  │ │
│  └───────────────────┘   │   • Overshoot AI API              │ │
│                          └───────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Docker Support

```yaml
# docker-compose.yml structure
services:
  pickle-ai:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
    volumes:
      - ./data:/app/data
  
  vision-server:
    build: ./vision-server
    ports:
      - "3001:3001"
```

---

## Design Decisions & Rationale

### 1. Local LLM (Ollama) vs Cloud APIs

| Factor | Local (Ollama) | Cloud (OpenAI/Anthropic) |
|--------|---------------|-------------------------|
| **Latency** | ~100-500ms | ~500-2000ms |
| **Cost** | $0 (after hardware) | $0.01-0.10 per response |
| **Privacy** | Full control | Data leaves machine |
| **Reliability** | No network dependency | API outages possible |

**Decision:** Default to Ollama for privacy and cost, but architecture supports swapping to cloud APIs.

### 2. Hybrid Memory (STM + LTM) vs Pure Vector Search

**Problem:** Pure vector search is slow for recent context and misses conversational flow.

**Solution:**
- **STM (deque):** O(1) access to last 15 messages
- **LTM (ChromaDB):** O(log n) semantic search for older memories
- **Combined:** Best of both worlds

### 3. Vision Server as Sidecar vs Embedded

**Problem:** Overshoot SDK requires browser APIs (WebRTC, MediaDevices).

**Options Considered:**
1. ~~PyAutoGUI screen capture~~ - Too slow, no audio
2. ~~OBS virtual camera~~ - Complex setup
3. **Puppeteer sidecar** - Clean separation, real browser APIs

**Decision:** Node.js sidecar with Puppeteer provides reliable camera access.

### 4. Async Queue Architecture vs Request-Response

**Problem:** Multiple input sources (chat, vision, speech) need processing.

**Solution:** 
- Async queues decouple producers from consumers
- Orchestrator acts as central event bus
- Outputs processed independently (TTS doesn't block next response)

### 5. Response Gating

**Problem:** Without gating, AI responds to every message (spam).

**Solution:** `_should_respond()` checks:
1. Trigger words (name mentions) → Always respond
2. Questions (contains `?`) → Respond
3. Random chance (20% by default) → Sometimes respond
4. Cooldown (5s default) → Rate limit

---

## Security Considerations

### API Key Protection

- All API keys in `.env` file (git-ignored)
- Pydantic settings validate required keys at startup
- No keys logged (structlog filters sensitive fields)

### Twitch OAuth

- OAuth token refresh handled automatically
- Client secret never exposed to frontend
- IRC connection uses secure WebSocket

### Browser Sandbox

- Puppeteer runs with `--no-sandbox` (required for headless)
- Vision server only accessible on localhost
- No external access to camera stream

### Input Sanitization

- All chat messages treated as untrusted
- System prompt injection mitigated by clear role separation
- LLM output validated against emotion list

---

## Future Extensibility

### Planned Features

1. **Multi-Persona Support** - Switch personas mid-stream
2. **Mod Commands** - `!skip`, `!mute`, `!persona`
3. **Analytics Dashboard** - Response latency, memory usage
4. **Plugin System** - Custom input/output processors

### Architecture for Extension

```python
# Example: Adding a Discord input
class DiscordInputProcessor(InputProcessor):
    async def run(self, queue: asyncio.Queue[InputEvent]):
        async for message in discord_client.messages:
            await queue.put(InputEvent(
                source="discord",
                content=message.content,
            ))

# Register with orchestrator
orchestrator.add_input(DiscordInputProcessor())
```

### Swappable LLM Backends

The `LLMClient` interface supports multiple backends:

```python
# Ollama (current)
llm = LLMClient(model="phi3.5:latest")

# OpenAI (future)
llm = OpenAIClient(api_key="...", model="gpt-4o-mini")

# Anthropic (future)
llm = AnthropicClient(api_key="...", model="claude-3-haiku")
```

---

## Appendix

### File Structure Reference

```
pickle-ai/
├── config/
│   ├── settings.py          # Pydantic settings loader
│   └── personas/
│       └── default.yaml      # Default persona config
├── src/
│   └── persona/
│       ├── main.py           # Application entry point
│       ├── orchestrator.py   # Event coordination
│       ├── brain/
│       │   ├── persona_engine.py  # AI decision making
│       │   ├── llm_client.py      # Ollama integration
│       │   ├── assembler.py       # Context assembly
│       │   ├── compressor.py      # Token compression
│       │   └── memory/
│       │       ├── short_term.py  # STM (deque)
│       │       └── long_term.py   # LTM (ChromaDB)
│       ├── inputs/
│       │   ├── base.py            # InputProcessor interface
│       │   ├── twitch_chat.py     # Twitch IRC
│       │   ├── vision.py          # Overshoot AI
│       │   └── speech.py          # Deepgram STT
│       ├── outputs/
│       │   ├── tts.py             # Deepgram TTS
│       │   └── avatar.py          # WebSocket avatar
│       ├── web/
│       │   ├── server.py          # FastAPI app
│       │   ├── settings_manager.py
│       │   └── static/            # Overlay assets
│       └── utils/
│           └── logging.py         # Structured logging
├── vision-server/
│   ├── server.js             # Fastify + Puppeteer
│   ├── vision-client.html    # Browser-side SDK loader
│   └── package.json
├── data/
│   └── chromadb/             # LTM persistence
├── .env                      # Environment variables
├── pyproject.toml            # Python dependencies
└── run.sh                    # Startup script
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_MODEL` | No | `phi3.5:latest` | Ollama model name |
| `DEEPGRAM_API_KEY` | Yes | - | Deepgram API key |
| `TWITCH_BOT_TOKEN` | Yes | - | OAuth token |
| `TWITCH_CLIENT_ID` | Yes | - | Twitch app client ID |
| `TWITCH_CLIENT_SECRET` | Yes | - | Twitch app secret |
| `TWITCH_CHANNEL` | Yes | - | Channel to join |
| `VISION_ENABLED` | No | `false` | Enable vision input |
| `OVERSHOOT_API_KEY` | If vision | - | Overshoot AI key |
| `STT_ENABLED` | No | `true` | Enable speech input |
| `AUDIO_OUTPUT_DEVICE` | No | System default | TTS output device |
| `AUDIO_INPUT_DEVICE` | No | System default | STT input device |
| `HOST` | No | `127.0.0.1` | API server host |
| `PORT` | No | `8000` | API server port |

---

*This documentation is maintained alongside the codebase. For the latest updates, see the Git repository.*
