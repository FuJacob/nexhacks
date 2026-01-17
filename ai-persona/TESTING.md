# AI Persona - Testing Guide

## Overview
This guide explains how to test the AI Persona bot locally and integrate it into your stream.

---

## Prerequisites

1. **VB-Cable** - Virtual audio driver for routing TTS audio
   - Download: https://vb-audio.com/Cable/
   - This creates a virtual audio device that the bot speaks to

2. **Twitch Chat** - Bot must be connected to your channel
3. **OBS or Streaming Software** - For overlay integration

---

## Quick Test (Local)

### 1. Start the Bot
```bash
./run.sh
```

You should see:
```
channel_joined                 channel=oreo0
connected_channels             channels=['<Channel name: oreo0>']
```

### 2. Send a Test Message
Go to your Twitch chat and type a message containing "pixel" (or your persona's trigger word):
```
pixel hello!
```

### 3. Check Logs for Response
Look for:
```
persona_response               emotion=happy text="Hey! What's up?"
tts_playing                    duration_sec=2.616
```

---

## Hearing the TTS Audio

### Option A: Listen via VB-Cable (Recommended for Testing)
1. Open **System Preferences → Sound**
2. Set **Output** to: `VB-Cable` (temporarily to hear it directly)
3. Chat to the bot - you'll hear the response
4. **Remember to switch back** before streaming!

### Option B: Monitor via OBS
1. Add VB-Cable as an audio source in OBS
2. Enable "Monitor and Output" on that source
3. You'll hear it through your speakers while it also goes to stream

---

## OBS Integration

### Adding the Overlay

1. In OBS, add a **Browser Source**
2. Set the URL to:
   ```
   http://127.0.0.1:8000/overlay
   ```
3. Set dimensions: **Width: 400, Height: 600** (adjust as needed)
4. Enable **"Refresh browser when scene becomes active"**

### Adding TTS Audio

1. Add an **Audio Input Capture** source
2. Select **VB-Cable** as the device
3. Mix the audio level as desired

---

## Full Stream Test Checklist

- [ ] Start bot: `./run.sh`
- [ ] Verify `connected_channels` shows your channel
- [ ] Add overlay browser source in OBS
- [ ] Add VB-Cable audio source in OBS
- [ ] Send test message in chat with trigger word
- [ ] Confirm avatar animates on overlay
- [ ] Confirm TTS audio plays through VB-Cable
- [ ] Test with a friend or alt account

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No TTS audio | Check `AUDIO_OUTPUT_DEVICE` in `.env` matches your VB-Cable device name |
| Bot not responding | Ensure message contains trigger word (check `config/personas/default.yaml`) |
| Overlay blank | Visit `http://127.0.0.1:8000/overlay` in browser to verify it loads |
| `429 RESOURCE_EXHAUSTED` | Gemini API quota exceeded - wait 1 minute or upgrade plan |
| `connected_channels=[]` | Credentials mismatch - regenerate token with `uv run generate_token.py` |
