# Pickle AI

Pickle AI is a sophisticated AI companion designed for IRL Twitch streamers. It integrates conversational AI, real-time vision capabilities, and interactive overlays to create an engaging streaming partner.

The system is composed of three main parts:

1.  **AI Core (`pickle-ai`)**: The Python backend that powers the brain, manages memory (ChromaDB), handles Twitch chat, and orchestrates the Vision system.
2.  **Desktop App (`frontend`)**: An Electron + React application that serves as the control center and dashboard for the streamer.
3.  **Landing Page (`landing`)**: A Next.js marketing website for the project.

---

## 📂 Project Structure

- `pickle-ai/`: **Core Backend**. Python (FastAPI), Vision Server (Node.js), ChromaDB, Gemini LLM integration.
- `frontend/`: **Desktop App**. Electron, React, TypeScript, Vite.
- `landing/`: **Website**. Next.js, Tailwind CSS, Shadcn UI.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (3.11+)
- **FFmpeg** (Required for audio processing)
  - macOS: `brew install ffmpeg`
- **API Keys**:
  - Google Gemini API Key
  - Twitch Developer Credentials
  - Overshoot API Key (for Vision)

### 1. Setting up the Backend (`pickle-ai`)

The backend coordinates everything. It includes a helper script `run.sh` that sets up the Python environment (using `uv`) and starts the Vision Server sidecar automatically.

1.  Navigate to the directory:

    ```bash
    cd pickle-ai
    ```

2.  Configure environment variables:
    Create a `.env` file in the `pickle-ai` directory:

    ```ini
    # Google Gemini
    GEMINI_API_KEY=your_key_here

    # Twitch Configuration
    TWITCH_BOT_TOKEN=oauth:your_token_here
    TWITCH_CLIENT_ID=your_client_id
    TWITCH_CLIENT_SECRET=your_client_secret
    TWITCH_BOT_ID=your_bot_user_id

    # Vision (Overshoot)
    OVERSHOOT_API_KEY=your_overshoot_key_here
    VISION_ENABLED=true
    ```

3.  Run the system:
    ```bash
    ./run.sh
    ```
    _This will install dependencies, start the Node.js Vision Server, and launch the Python Orchestrator._

### 2. Setting up the Desktop App (`frontend`)

The frontend allows you to configure the AI and monitor its status.

1.  Navigate to the directory:

    ```bash
    cd frontend
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Run in development mode:
    ```bash
    npm run electron:dev
    ```
    _This launches the Electron app window._

### 3. Setting up the Landing Page (`landing`)

1.  Navigate to the directory:

    ```bash
    cd landing
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```
    _Open [http://localhost:3000](http://localhost:3000) to view the site._

---

## 🛠️ Configuration

### Personas

Personas are defined in `pickle-ai/config/personas/`. You can create custom YAML files to define the personality, voice, and behavior of your AI companion.

### Vision

The vision system runs as a separate Node.js process (orchestrated by the Python backend) located in `pickle-ai/vision-server`. It uses Puppeteer to run the Overshoot SDK.

---

## 📝 License

[License Information]
