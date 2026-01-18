# AI Persona - IRL Twitch Companion

A sophisticated AI companion designed for IRL Twitch streamers. This application integrates with Twitch Chat, processes interactions using Google's Gemini LLM, and provides response feedback via Text-to-Speech (TTS) and a visual Avatar overlay.

## Features

- **Intelligent Chat Interaction:** Uses Google Gemini to understand and reply to Twitch chat messages in character.
- **Twitch Integration:** Listens to chat in real-time.
- **Dynamic TTS:** Vocalizes AI responses relative to the context.
- **Visual Avatar:** Provides a web-based overlay to display the persona's state or avatar.
- **Configurable Personas:** Custom define your AI's personality via YAML configuration.
- **Docker Support:** Easily containerize the application for deployment.

## Prerequisites

- **Python 3.11+**
- **FFmpeg:** Required for audio processing.
  - macOS: `brew install ffmpeg`
  - Ubuntu/Debian: `sudo apt install ffmpeg`
- **Google Gemini API Key:** Get one from [Google AI Studio](https://makersuite.google.com/).
- **Twitch Developer Account:** You need a Client ID and an OAuth Token for the bot account.

## Installation

### 1. Clone the repository

```bash
git clone <repository_url>
cd pickle-ai
```

### 2. Environment Setup

Copy `env.example` to `.env` (create one if it doesn't exist) and fill in your credentials:

```bash
cp .env.example .env
```

**Required Environment Variables (`.env`):**

```env
# Google Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Twitch Configuration
TWITCH_BOT_TOKEN=oauth:your_token_here
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_BOT_ID=your_bot_user_id
TWITCH_CHANNEL=target_channel_name
TWITCH_BOT_USERNAME=bot_username

# Optional Configuration
AUDIO_OUTPUT_DEVICE=VB-Cable  # Or your preferred output device
HOST=127.0.0.1
PORT=8000
PERSONA_CONFIG=config/personas/default.yaml
```

_Note: For `TWITCH_BOT_TOKEN`, you can generate an OAuth token using a tool like [Twitch Token Generator](https://twitchtokengenerator.com/) with scopes for reading chat (`chat:read`, `chat:edit`)._

### 3. Install Dependencies

The project uses `uv` for fast dependency management, but `pip` works as well.

**Using the provided run script (Recommended):**
This script will automatically install `uv` if needed.

```bash
./run.sh
```

**Manual Installation:**

```bash
pip install .
# OR
uv pip install .
```

## Usage

### Running Locally

To start the application:

```bash
./run.sh
```

Or manually:

```bash
python -m src.persona.main
```

### Running with Docker

A `docker-compose.yml` is provided for easy containerization.

```bash
docker-compose up --build
```

The web server will be available at `http://localhost:8000`.

## Configuration

### Personas

You can define the personality of the AI in `config/personas/default.yaml` or create new YAML files and point to them using the `PERSONA_CONFIG` environment variable.

### Overlay

The visual overlay is hosted at `http://localhost:8000/static/overlay.html` (check exact path in `src/web/server.py`). You can add this as a Browser Source in OBS.

## Project Structure

- `config/`: Configuration files and persona definitions.
- `src/persona/`: Main application source code.
  - `brain/`: LLM integration and persona logic.
  - `inputs/`: Input handlers (Twitch Chat).
  - `outputs/`: Output handlers (TTS, Avatar).
  - `web/`: Web server for the overlay.
- `run.sh`: Helper script to set up and run the app.
