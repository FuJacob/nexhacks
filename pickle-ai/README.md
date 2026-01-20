# Pickle AI

A multi-modal AI companion for Twitch streamers. Pickle acts as the collective "voice of chat" by listening to Twitch messages, hearing the streamer speak, and watching the stream via computer vision. It synthesizes all of this context into real-time spoken responses.

## Features

- Real-time Twitch chat integration via TwitchIO
- Speech-to-text using Deepgram Nova-2 for hearing the streamer
- Computer vision using Overshoot SDK for analyzing the stream
- Text-to-speech using Deepgram Aura for natural voice output
- LLM inference via Cerebras Llama 3.1 for fast response generation
- Hybrid memory system with ChromaDB for long-term recall
- Priority-based event orchestration to handle concurrent inputs
- React and Electron desktop app for persona configuration
- OBS overlay integration for streaming

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher (for the vision server)
- FFmpeg for audio processing
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`

## Environment Variables

Create a `.env` file in the project root:

```env
# LLM (Cerebras)
CEREBRAS_API_KEY=your_cerebras_api_key
CEREBRAS_MODEL=llama-3.3-70b

# Speech Services (Deepgram)
DEEPGRAM_API_KEY=your_deepgram_api_key

# Twitch Configuration
TWITCH_BOT_TOKEN=oauth:your_token
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_BOT_ID=your_bot_user_id
TWITCH_CHANNEL=your_channel_name

# Vision (optional)
VISION_ENABLED=true
OVERSHOOT_API_KEY=your_overshoot_api_key

# Audio
AUDIO_OUTPUT_DEVICE=VB-Cable
```

For the vision server, create `vision-server/.env`:

```env
OVERSHOOT_API_KEY=your_overshoot_api_key
```

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/FuJacob/nexhacks.git
cd nexhacks/pickle-ai
```

The run script handles dependency installation automatically:

```bash
./run.sh
```

For manual installation:

```bash
pip install .
```

## Usage

### Running the Backend

Start the application with:

```bash
./run.sh
```

This launches both the Python backend and the Node.js vision server.

### Running the Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run electron:dev
```

### OBS Integration

Add the overlay as a Browser Source in OBS:

```
http://localhost:8000/static/overlay.html
```

## Architecture

The system consists of three services:

1. Python Backend (FastAPI): Orchestrates inputs, runs LLM inference, manages memory
2. Node.js Vision Server (Fastify): Runs Overshoot SDK in headless Chrome via Puppeteer
3. Electron Frontend (React): Desktop control panel and OBS overlay

### Input Sources

- Twitch Chat: Batched messages processed via TwitchIO
- Speech: Real-time transcription via Deepgram Nova-2 WebSocket
- Vision: Scene descriptions from Overshoot SDK

### Processing Pipeline

1. Inputs are collected into an asyncio queue
2. The orchestrator applies priority-based filtering (chat > speech > vision)
3. Context is assembled from short-term memory (deque) and long-term memory (ChromaDB)
4. Cerebras Llama 3.1 generates a response
5. Deepgram Aura converts text to speech
6. Audio is routed to VB-Cable for OBS capture

## Project Structure

```
pickle-ai/
├── config/personas/        # Persona YAML configurations
├── src/persona/
│   ├── brain/              # LLM client, memory, context assembler
│   ├── inputs/             # Twitch, speech, vision processors
│   ├── outputs/            # TTS, avatar handlers
│   ├── web/                # FastAPI server and settings
│   ├── orchestrator.py     # Main event loop
│   └── main.py             # Entry point
├── vision-server/          # Node.js Overshoot integration
├── frontend/               # Electron and React app
└── run.sh                  # Startup script
```

## Configuration

Persona settings are defined in `config/personas/default.yaml`:

```yaml
name: "Pickle"
streamer_name: "YourName"

personality: |
  Pickle is the voice of Twitch chat.
  They summarize what viewers are saying and speak for them.

style:
  - Keep responses under 2 sentences
  - Use casual, conversational language

behavior:
  vision_rate: 0.10
  speech_rate: 0.50
  cooldown: 4.0
  chat_batch_size: 15
```
