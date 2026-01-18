#!/bin/bash

# AI Persona - Setup and Run Script
# This script sets up the environment and runs the AI Persona server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID file for vision server
VISION_PID_FILE="/tmp/pickle-ai-vision.pid"

cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"

    # Stop vision server if running
    if [ -f "$VISION_PID_FILE" ]; then
        VISION_PID=$(cat "$VISION_PID_FILE")
        if kill -0 "$VISION_PID" 2>/dev/null; then
            echo -e "${YELLOW}Stopping vision server (PID: $VISION_PID)...${NC}"
            kill "$VISION_PID" 2>/dev/null || true
        fi
        rm -f "$VISION_PID_FILE"
    fi

    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   AI Persona - IRL Twitch Companion   ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}uv not found. Installing uv...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

# Check if node is installed (required for vision server)
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Warning: Node.js not found.${NC}"
    echo -e "${YELLOW}Vision server requires Node.js. Install with:${NC}"
    echo -e "${YELLOW}  macOS: brew install node${NC}"
    echo -e "${YELLOW}  Ubuntu: sudo apt install nodejs npm${NC}"
    echo ""
fi

# Check if ffmpeg is installed (required for TTS)
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}Warning: ffmpeg not found.${NC}"
    echo -e "${YELLOW}TTS requires ffmpeg. Install with:${NC}"
    echo -e "${YELLOW}  macOS: brew install ffmpeg${NC}"
    echo -e "${YELLOW}  Ubuntu: sudo apt install ffmpeg${NC}"
    echo ""
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env with your API keys before running again.${NC}"
        exit 1
    else
        echo -e "${RED}Error: No .env or .env.example file found.${NC}"
        exit 1
    fi
fi

# Check if required environment variables are set
source .env 2>/dev/null || true

if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    echo -e "${RED}Error: GEMINI_API_KEY not set in .env${NC}"
    echo -e "${YELLOW}Get your API key from: https://aistudio.google.com/apikey${NC}"
    exit 1
fi

if [ -z "$TWITCH_BOT_TOKEN" ] || [ "$TWITCH_BOT_TOKEN" = "oauth:..." ]; then
    echo -e "${RED}Error: TWITCH_BOT_TOKEN not set in .env${NC}"
    echo -e "${YELLOW}Get your token from: https://twitchapps.com/tmi/${NC}"
    exit 1
fi

# Sync Python dependencies
echo -e "${GREEN}Syncing Python dependencies...${NC}"
uv sync

# Start vision server if enabled
if [ "$VISION_ENABLED" = "true" ] && [ -n "$OVERSHOOT_API_KEY" ]; then
    echo ""
    echo -e "${BLUE}Vision is enabled. Starting vision server...${NC}"

    # Check if vision-server directory exists
    if [ -d "vision-server" ]; then
        cd vision-server

        # Install npm dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo -e "${BLUE}Installing vision server dependencies...${NC}"
            npm install
        fi

        # Create .env for vision server if it doesn't exist
        if [ ! -f ".env" ]; then
            echo "OVERSHOOT_API_KEY=$OVERSHOOT_API_KEY" > .env
            echo "VISION_PORT=${VISION_PORT:-3001}" >> .env
            echo "VISION_HOST=${VISION_HOST:-127.0.0.1}" >> .env
        fi

        # Start vision server in background
        echo -e "${BLUE}Starting vision server on port ${VISION_PORT:-3001}...${NC}"
        node server.js &
        VISION_PID=$!
        echo "$VISION_PID" > "$VISION_PID_FILE"

        # Wait for vision server to be ready
        echo -e "${BLUE}Waiting for vision server to be ready...${NC}"
        VISION_URL="http://${VISION_HOST:-127.0.0.1}:${VISION_PORT:-3001}/health"
        for i in {1..10}; do
            if curl -s "$VISION_URL" > /dev/null 2>&1; then
                echo -e "${GREEN}Vision server is ready!${NC}"
                break
            fi
            if [ $i -eq 10 ]; then
                echo -e "${YELLOW}Warning: Vision server may not be ready yet${NC}"
            fi
            sleep 1
        done

        cd ..
    else
        echo -e "${YELLOW}Warning: vision-server directory not found. Vision disabled.${NC}"
    fi
else
    echo -e "${YELLOW}Vision is disabled. Set VISION_ENABLED=true to enable.${NC}"
fi

# Run the application
echo ""
echo -e "${GREEN}Starting AI Persona...${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Overlay URL: http://${HOST:-127.0.0.1}:${PORT:-8000}/overlay${NC}"
if [ "$VISION_ENABLED" = "true" ]; then
    echo -e "${BLUE}  Vision URL:  http://${VISION_HOST:-127.0.0.1}:${VISION_PORT:-3001}/health${NC}"
fi
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Press Ctrl+C to stop${NC}"
echo ""

uv run pickle-ai

# Cleanup on exit
cleanup
