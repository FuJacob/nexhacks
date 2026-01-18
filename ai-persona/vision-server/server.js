/**
 * Vision Server - Overshoot AI sidecar for AI Persona
 *
 * Provides real-time video analysis using Overshoot's WebRTC-based vision SDK.
 * Exposes REST/WebSocket endpoints for the Python main app to consume.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { RealtimeVision } from 'overshoot';
import 'dotenv/config';

const PORT = process.env.VISION_PORT || 3001;
const HOST = process.env.VISION_HOST || '127.0.0.1';
const OVERSHOOT_API_KEY = process.env.OVERSHOOT_API_KEY;

if (!OVERSHOOT_API_KEY) {
    console.error('ERROR: OVERSHOOT_API_KEY environment variable is required');
    process.exit(1);
}

// Store latest vision result
let latestResult = null;
let visionActive = false;
let vision = null;

// WebSocket clients for real-time streaming
const wsClients = new Set();

// Default prompt for stream analysis
let currentPrompt = `You are analyzing a live IRL stream. Describe what you see concisely:
- Main subjects/people visible
- Current activity or action
- Notable objects or environment
- Any text visible on screen
Keep it brief (2-3 sentences max). Focus on what's happening RIGHT NOW.`;

// Initialize Fastify
const fastify = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: { colorize: true }
        }
    }
});

// Register plugins
await fastify.register(cors, { origin: true });
await fastify.register(websocket);

/**
 * Initialize Overshoot RealtimeVision
 */
async function initVision() {
    if (vision) {
        await vision.stop();
    }

    vision = new RealtimeVision({
        apiUrl: 'https://api.overshoot.ai',
        apiKey: OVERSHOOT_API_KEY,
        prompt: currentPrompt,
        debug: process.env.DEBUG === 'true',
        processing: {
            fps: 30,
            sampling_ratio: 0.1,        // Process 10% of frames
            clip_length_seconds: 2.0,    // Analyze 2-second clips
            delay_seconds: 3.0,          // New analysis every 3 seconds
        },
        onResult: (result) => {
            latestResult = {
                id: result.id,
                streamId: result.stream_id,
                result: result.result,
                ok: result.ok,
                error: result.error,
                latencyMs: result.total_latency_ms,
                timestamp: new Date().toISOString(),
                prompt: result.prompt,
            };

            fastify.log.info({
                msg: 'vision_result',
                ok: result.ok,
                latency: result.total_latency_ms,
                preview: result.result?.substring(0, 100),
            });

            // Broadcast to WebSocket clients
            for (const client of wsClients) {
                try {
                    client.send(JSON.stringify(latestResult));
                } catch (err) {
                    fastify.log.error({ err }, 'Failed to send to WebSocket client');
                    wsClients.delete(client);
                }
            }
        },
        onError: (error) => {
            fastify.log.error({ err: error }, 'Vision error');
            latestResult = {
                ok: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        },
    });

    return vision;
}

// ============ REST Endpoints ============

/**
 * GET /health - Health check
 */
fastify.get('/health', async () => {
    return {
        status: 'ok',
        visionActive,
        hasLatestResult: latestResult !== null,
        timestamp: new Date().toISOString(),
    };
});

/**
 * GET /vision/latest - Get the latest vision result
 */
fastify.get('/vision/latest', async () => {
    if (!latestResult) {
        return {
            ok: false,
            error: 'No vision results yet',
            visionActive,
        };
    }
    return latestResult;
});

/**
 * POST /vision/start - Start vision processing
 */
fastify.post('/vision/start', async (request, reply) => {
    if (visionActive) {
        return { ok: true, message: 'Vision already active' };
    }

    try {
        await initVision();
        await vision.start();
        visionActive = true;
        fastify.log.info('Vision started');
        return { ok: true, message: 'Vision started' };
    } catch (err) {
        fastify.log.error({ err }, 'Failed to start vision');
        return reply.code(500).send({
            ok: false,
            error: err.message,
        });
    }
});

/**
 * POST /vision/stop - Stop vision processing
 */
fastify.post('/vision/stop', async () => {
    if (!visionActive || !vision) {
        return { ok: true, message: 'Vision not active' };
    }

    try {
        await vision.stop();
        visionActive = false;
        fastify.log.info('Vision stopped');
        return { ok: true, message: 'Vision stopped' };
    } catch (err) {
        fastify.log.error({ err }, 'Failed to stop vision');
        return { ok: false, error: err.message };
    }
});

/**
 * POST /vision/prompt - Update the analysis prompt
 */
fastify.post('/vision/prompt', async (request, reply) => {
    const { prompt } = request.body || {};

    if (!prompt || typeof prompt !== 'string') {
        return reply.code(400).send({
            ok: false,
            error: 'prompt is required and must be a string',
        });
    }

    currentPrompt = prompt;

    if (vision && visionActive) {
        try {
            await vision.updatePrompt(prompt);
            fastify.log.info({ promptPreview: prompt.substring(0, 50) }, 'Prompt updated');
        } catch (err) {
            fastify.log.error({ err }, 'Failed to update prompt');
            return reply.code(500).send({
                ok: false,
                error: err.message,
            });
        }
    }

    return { ok: true, message: 'Prompt updated', prompt: currentPrompt };
});

/**
 * GET /vision/status - Get vision status
 */
fastify.get('/vision/status', async () => {
    return {
        active: visionActive,
        streamId: vision?.getStreamId() || null,
        currentPrompt: currentPrompt.substring(0, 100) + '...',
        lastResultAt: latestResult?.timestamp || null,
    };
});

// ============ WebSocket Endpoint ============

/**
 * GET /vision/ws - WebSocket for real-time vision results
 */
fastify.get('/vision/ws', { websocket: true }, (socket, req) => {
    fastify.log.info('WebSocket client connected');
    wsClients.add(socket);

    // Send current state immediately
    socket.send(JSON.stringify({
        type: 'connected',
        visionActive,
        hasLatestResult: latestResult !== null,
    }));

    // Send latest result if available
    if (latestResult) {
        socket.send(JSON.stringify(latestResult));
    }

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            // Handle commands via WebSocket
            if (data.command === 'start') {
                initVision().then(() => vision.start()).then(() => {
                    visionActive = true;
                    socket.send(JSON.stringify({ type: 'started' }));
                });
            } else if (data.command === 'stop') {
                if (vision) {
                    vision.stop().then(() => {
                        visionActive = false;
                        socket.send(JSON.stringify({ type: 'stopped' }));
                    });
                }
            } else if (data.command === 'prompt' && data.prompt) {
                currentPrompt = data.prompt;
                if (vision && visionActive) {
                    vision.updatePrompt(data.prompt);
                }
                socket.send(JSON.stringify({ type: 'prompt_updated' }));
            }
        } catch (err) {
            fastify.log.error({ err }, 'Failed to parse WebSocket message');
        }
    });

    socket.on('close', () => {
        fastify.log.info('WebSocket client disconnected');
        wsClients.delete(socket);
    });

    socket.on('error', (err) => {
        fastify.log.error({ err }, 'WebSocket error');
        wsClients.delete(socket);
    });
});

// ============ Startup ============

// Graceful shutdown
const shutdown = async () => {
    fastify.log.info('Shutting down...');

    if (vision && visionActive) {
        await vision.stop();
    }

    await fastify.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Vision server running at http://${HOST}:${PORT}`);
    fastify.log.info('Endpoints:');
    fastify.log.info('  GET  /health         - Health check');
    fastify.log.info('  GET  /vision/latest  - Get latest result');
    fastify.log.info('  GET  /vision/status  - Get vision status');
    fastify.log.info('  POST /vision/start   - Start vision');
    fastify.log.info('  POST /vision/stop    - Stop vision');
    fastify.log.info('  POST /vision/prompt  - Update prompt');
    fastify.log.info('  WS   /vision/ws      - Real-time WebSocket');
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
