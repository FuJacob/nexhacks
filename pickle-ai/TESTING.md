# AI Persona - Complete Setup & Streaming Guide

## Overview

This guide walks you through setting up the AI Persona bot with OBS and streaming to Twitch.

---

## Part 1: Prerequisites

### Required Software

1. **OBS Studio** - [Download](https://obsproject.com/)
2. **VB-Cable** - [Download](https://vb-audio.com/Cable/) (virtual audio driver)
3. **ffmpeg** - Required for audio conversion
   ```bash
   brew install ffmpeg
   ```

### Required Accounts

- Twitch account for streaming
- Twitch bot account (e.g., pickle20066) for the AI persona
- Deepgram API key for TTS
- Gemini API key for AI responses

---

## Part 2: Audio Routing Setup

### Understanding the Audio Flow

```
AI Persona Bot → VB-Cable (virtual input) → OBS → Twitch Stream
```

### Configure VB-Cable

1. Install VB-Cable from the link above
2. **DO NOT** set VB-Cable as your system output (you won't hear your computer)
3. VB-Cable acts as a "virtual cable" - audio goes IN one end and comes OUT the other

### Update .env for Streaming

For streaming, the bot should output to VB-Cable (not speakers):

```bash
AUDIO_OUTPUT_DEVICE="VB-Cable"
```

For local testing, use speakers:

```bash
AUDIO_OUTPUT_DEVICE="MacBook Pro Speakers"
```

---

## Part 3: OBS Setup

### Step 1: Add Browser Source (Avatar Overlay)

1. Open OBS
2. In **Sources**, click **+** → **Browser**
3. Name it: `AI Persona Overlay`
4. Configure:
   - **URL**: `http://127.0.0.1:8000/overlay`
   - **Width**: `400`
   - **Height**: `600`
   - ✅ **Refresh browser when scene becomes active**
5. Click **OK**
6. Position the overlay where you want it on screen

### Step 2: Add VB-Cable Audio (Bot Voice)

1. In **Sources**, click **+** → **Audio Input Capture**
2. Name it: `AI Persona Voice`
3. Select **VB-Cable** as the device
4. Click **OK**

### Step 3: Configure Audio Monitoring (Optional - to hear bot while streaming)

1. Right-click on `AI Persona Voice` in the Audio Mixer
2. Select **Advanced Audio Properties**
3. For `AI Persona Voice`, set **Audio Monitoring** to:
   - **Monitor and Output** (hear through speakers AND stream)
   - or **Monitor Off** (only goes to stream, you won't hear)

### Step 4: Add Your Other Sources

- **Video Capture Device**: Your webcam
- **Display/Window Capture**: Your screen or game
- **Audio Input Capture**: Your microphone
- **Audio Output Capture**: Desktop audio (optional)

---

## Part 4: Twitch Stream Setup

### Step 1: Get Your Twitch Stream Key

1. Go to [Twitch Dashboard](https://dashboard.twitch.tv/)
2. Click **Settings** → **Stream**
3. Copy your **Primary Stream Key**

### Step 2: Configure OBS for Twitch

1. In OBS, go to **Settings** → **Stream**
2. Set:
   - **Service**: Twitch
   - **Server**: Auto (or choose nearest)
   - **Stream Key**: Paste your key
3. Click **Apply**

### Step 3: Configure Video Settings

1. Go to **Settings** → **Video**
2. Recommended settings:
   - **Base Resolution**: 1920x1080
   - **Output Resolution**: 1920x1080 (or 1280x720 for lower bandwidth)
   - **FPS**: 30 or 60

### Step 4: Configure Output Settings

1. Go to **Settings** → **Output**
2. **Output Mode**: Advanced
3. **Streaming** tab:
   - **Encoder**: x264 (or NVENC if you have NVIDIA GPU)
   - **Rate Control**: CBR
   - **Bitrate**: 4500-6000 Kbps (for 1080p)
4. Click **Apply** → **OK**

---

## Part 5: Full Streaming Workflow

### Before Going Live

1. **Start the bot**:

   ```bash
   cd /Users/jacobfu/src/nexhacks/pickle-ai
   ./run.sh
   ```

   Wait for:

   ```
   channel_joined channel=oreo0
   connected_channels channels=['<Channel name: oreo0>']
   ```

2. **Verify in OBS**:
   - Check that the overlay shows in your scene
   - Check that VB-Cable appears in Audio Mixer

3. **Test in OBS** (before going live):
   - Send a test message in your Twitch chat: `pixel hello!`
   - Watch for the overlay to animate
   - Check Audio Mixer - VB-Cable should show audio activity

### Going Live

1. In OBS, click **Start Streaming**
2. Go to your Twitch channel to verify stream is active
3. Have someone chat in your stream with the trigger word

---

## Quick Reference: Scene Setup

```
┌─────────────────────────────────────────┐
│  YOUR OBS SCENE                         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │       Your Game/Screen          │   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────────┐                          │
│  │  Webcam  │     ┌────────────────┐   │
│  │          │     │ AI Persona     │   │
│  └──────────┘     │ Overlay        │   │
│                   │ (Browser Src)  │   │
│                   └────────────────┘   │
└─────────────────────────────────────────┘

Audio Sources:
- Microphone (your voice)
- VB-Cable (AI Persona voice)
- Desktop Audio (optional)
```

---

## Troubleshooting

| Issue                  | Solution                                                                   |
| ---------------------- | -------------------------------------------------------------------------- |
| Overlay is black/blank | Make sure bot is running first, then refresh browser source                |
| No audio from bot      | Check AUDIO_OUTPUT_DEVICE matches "VB-Cable" in .env                       |
| Can't hear bot locally | Enable "Monitor and Output" for VB-Cable in OBS Advanced Audio             |
| Port 8000 in use       | Kill stale processes: `pkill -f pickle-ai; lsof -ti:8000 \| xargs kill -9` |
| Bot not responding     | Check logs for errors, ensure trigger word is in message                   |
| 429 rate limit         | Wait 1 minute, Gemini free tier has rate limits                            |

---

## Stream Checklist

- [ ] VB-Cable installed
- [ ] `.env` has `AUDIO_OUTPUT_DEVICE="VB-Cable"`
- [ ] Bot started: `./run.sh`
- [ ] Bot shows `connected_channels` with your channel
- [ ] OBS: Browser source added pointing to `http://127.0.0.1:8000/overlay`
- [ ] OBS: Audio Input Capture added for VB-Cable
- [ ] OBS: Stream key configured
- [ ] Test chat message with trigger word works
- [ ] Start streaming!
