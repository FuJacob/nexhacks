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
NC='\033[0m' # No Color

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

# Sync dependencies
echo -e "${GREEN}Syncing dependencies...${NC}"
uv sync

# Run the application
echo ""
echo -e "${GREEN}Starting AI Persona...${NC}"
echo -e "${GREEN}Overlay URL: http://${HOST:-127.0.0.1}:${PORT:-8000}/overlay${NC}"
echo -e "${GREEN}Press Ctrl+C to stop${NC}"
echo ""

uv run ai-persona
