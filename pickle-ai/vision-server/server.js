/**
 * Vision Server - Overshoot AI sidecar for AI Persona
 *
 * Uses Puppeteer to run the Overshoot SDK in a headless browser,
 * providing webcam access and WebRTC APIs that Node.js lacks.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.VISION_PORT || 3001;
const HOST = process.env.VISION_HOST || '127.0.0.1';
const OVERSHOOT_API_KEY = process.env.OVERSHOOT_API_KEY;

if (!OVERSHOOT_API_KEY) {
    console.error('ERROR: OVERSHOOT_API_KEY environment variable is required');
    process.exit(1);
}

// State
let latestResult = null;
let visionActive = false;
let browser = null;
let page = null;
let browserReady = false;

// WebSocket clients for real-time streaming
const wsClients = new Set();

// Default prompt for stream analysis
let currentPrompt = `You are analyzing a live IRL stream. Describe what you see concisely:
- Main subjects/people visible
- Current activity or action
- Notable objects or environment
- Any text visible on screen
Keep it brief (2-3 sentences max). Focus on what's happening RIGHT NOW.`;

// Initialize Fastify with simple logger
const fastify = Fastify({
    logger: true
});

// Register plugins
await fastify.register(cors, { origin: true });
await fastify.register(websocket);

// Serve the vision client HTML page
const visionClientHtml = readFileSync(join(__dirname, 'vision-client.html'), 'utf-8');
fastify.get('/vision-client', async (request, reply) => {
    reply.type('text/html').send(visionClientHtml);
});

/**
 * Launch Puppeteer browser with camera permissions
 */
async function launchBrowser() {
    fastify.log.info('Launching headless browser...');
    
    browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--use-fake-ui-for-media-stream',
            // '--use-fake-device-for-media-stream', // Commented out to use REAL CAMERA
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--ignore-certificate-errors',
            '--enable-features=NetworkService',
            '--allow-running-insecure-content',
        ],
        ignoreHTTPSErrors: true,
    });

    page = await browser.newPage();
    
    // Listen for console messages from the page
    page.on('console', (msg) => {
        const text = msg.text();
        
        if (text.startsWith('__VISION_RESULT__')) {
            const json = text.replace('__VISION_RESULT__', '');
            try {
                latestResult = JSON.parse(json);
                fastify.log.info({
                    msg: 'vision_result',
                    ok: latestResult.ok,
                    latency: latestResult.latencyMs,
                    preview: latestResult.result?.substring(0, 100),
                });
                
                // Broadcast to WebSocket clients
                for (const client of wsClients) {
                    try {
                        client.send(JSON.stringify(latestResult));
                    } catch (err) {
                        wsClients.delete(client);
                    }
                }
            } catch (e) {
                fastify.log.error({ err: e.message }, 'Failed to parse vision result');
            }
        } else if (text.startsWith('__VISION_ERROR__')) {
            const json = text.replace('__VISION_ERROR__', '');
            try {
                latestResult = JSON.parse(json);
                fastify.log.error({ err: latestResult.error }, 'Vision error');
            } catch (e) {
                fastify.log.error({ err: e.message }, 'Failed to parse vision error');
            }
        } else if (text === '__VISION_READY__') {
            fastify.log.info('Browser vision client ready');
            browserReady = true;
        } else if (text.startsWith('__DEBUG__')) {
            // Log debug messages at info level so they're visible
            fastify.log.info({ browserDebug: text.replace('__DEBUG__ ', '') }, 'Browser debug');
        } else {
            // Log other console messages for debugging
            fastify.log.info({ browserLog: text }, 'Browser console');
        }
    });

    // Load the vision client HTML via HTTP (not file://) for proper network access
    await page.goto(`http://${HOST}:${PORT}/vision-client`);
    
    // Wait for the page to be ready
    await new Promise((resolve) => {
        const checkReady = setInterval(() => {
            if (browserReady) {
                clearInterval(checkReady);
                resolve();
            }
        }, 100);
        // Timeout after 30 seconds
        setTimeout(() => {
            clearInterval(checkReady);
            resolve();
        }, 30000);
    });

    fastify.log.info('Browser launched and ready');
    return true;
}

/**
 * Initialize vision in the browser
 */
async function initVision() {
    if (!page || !browserReady) {
        throw new Error('Browser not ready');
    }

    const result = await page.evaluate(async (config) => {
        return await window.initVision(config);
    }, {
        apiKey: OVERSHOOT_API_KEY,
        apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
        prompt: currentPrompt,
        debug: process.env.DEBUG === 'true',
    });

    if (!result.ok) {
        throw new Error(result.error);
    }

    return result;
}

// ============ REST Endpoints ============

/**
 * GET /health - Health check
 */
fastify.get('/health', async () => {
    return {
        status: 'ok',
        visionActive,
        browserReady,
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
    if (!browserReady) {
        return reply.code(503).send({
            ok: false,
            error: 'Browser not ready',
        });
    }

    if (visionActive) {
        return { ok: true, message: 'Vision already active' };
    }

    try {
        await initVision();
        
        const result = await page.evaluate(async () => {
            return await window.startVision();
        });

        if (!result.ok) {
            throw new Error(result.error);
        }

        visionActive = true;
        fastify.log.info('Vision started');
        return { ok: true, message: 'Vision started' };
    } catch (err) {
        fastify.log.error({ err: err.message }, 'Failed to start vision');
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
    if (!visionActive) {
        return { ok: true, message: 'Vision not active' };
    }

    try {
        const result = await page.evaluate(async () => {
            return await window.stopVision();
        });

        visionActive = false;
        fastify.log.info('Vision stopped');
        return { ok: true, message: 'Vision stopped' };
    } catch (err) {
        fastify.log.error({ err: err.message }, 'Failed to stop vision');
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

    if (visionActive && page) {
        try {
            await page.evaluate(async (p) => {
                return await window.updatePrompt(p);
            }, prompt);
            fastify.log.info({ promptPreview: prompt.substring(0, 50) }, 'Prompt updated');
        } catch (err) {
            fastify.log.error({ err: err.message }, 'Failed to update prompt');
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
        browserReady,
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
        browserReady,
        hasLatestResult: latestResult !== null,
    }));

    // Send latest result if available
    if (latestResult) {
        socket.send(JSON.stringify(latestResult));
    }

    socket.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.command === 'start' && browserReady) {
                try {
                    await initVision();
                    await page.evaluate(async () => window.startVision());
                    visionActive = true;
                    socket.send(JSON.stringify({ type: 'started' }));
                } catch (err) {
                    socket.send(JSON.stringify({ type: 'error', error: err.message }));
                }
            } else if (data.command === 'stop') {
                try {
                    await page.evaluate(async () => window.stopVision());
                    visionActive = false;
                    socket.send(JSON.stringify({ type: 'stopped' }));
                } catch (err) {
                    socket.send(JSON.stringify({ type: 'error', error: err.message }));
                }
            } else if (data.command === 'prompt' && data.prompt) {
                currentPrompt = data.prompt;
                if (visionActive) {
                    try {
                        await page.evaluate(async (p) => window.updatePrompt(p), data.prompt);
                    } catch (err) {
                        // Ignore prompt update errors
                    }
                }
                socket.send(JSON.stringify({ type: 'prompt_updated' }));
            }
        } catch (err) {
            fastify.log.error({ err: err.message }, 'Failed to parse WebSocket message');
        }
    });

    socket.on('close', () => {
        fastify.log.info('WebSocket client disconnected');
        wsClients.delete(socket);
    });

    socket.on('error', (err) => {
        fastify.log.error({ err: err.message }, 'WebSocket error');
        wsClients.delete(socket);
    });
});

// ============ Startup ============

// Graceful shutdown
const shutdown = async () => {
    console.log('\nShutting down...');

    if (browser) {
        try {
            await browser.close();
        } catch (e) {
            // Ignore
        }
    }

    await fastify.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server
try {
    // Start server FIRST so browser can load from http://
    await fastify.listen({ port: PORT, host: HOST });
    
    console.log(`\n✓ Vision server running at http://${HOST}:${PORT}`);
    console.log('\nEndpoints:');
    console.log('  GET  /health         - Health check');
    console.log('  GET  /vision/latest  - Get latest result');
    console.log('  GET  /vision/status  - Get vision status');
    console.log('  POST /vision/start   - Start vision');
    console.log('  POST /vision/stop    - Stop vision');
    console.log('  POST /vision/prompt  - Update prompt');
    console.log('  WS   /vision/ws      - Real-time WebSocket\n');

    // THEN launch browser (it needs to load from http://)
    await launchBrowser();
    console.log(`  Browser ready: ${browserReady ? 'yes' : 'no'}\n`);
} catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
}