import http from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { executeTool, listTools } from './local-tools.mjs';

const HOST = process.env.GATEWAY_HOST || '127.0.0.1';
const PORT = Number(process.env.GATEWAY_PORT || 4318);
const TOKEN = process.env.GATEWAY_TOKEN || randomBytes(24).toString('hex');

const clients = new Set();

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
  });
  res.end(payload);
}

function authorized(req) {
  return (req.headers.authorization || '') === `Bearer ${TOKEN}`;
}

function publish(event) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(line);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    });
    return res.end();
  }

  if (!authorized(req)) return json(res, 401, { ok: false, error: 'unauthorized' });

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, service: 'browser-coding-agent-gateway', version: 1 });
  }

  if (req.method === 'GET' && req.url === '/tools') {
    return json(res, 200, { ok: true, tools: listTools() });
  }

  if (req.method === 'GET' && req.url === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-store',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', id: randomUUID() })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return json(res, 400, { ok: false, error: 'invalid JSON' });
    }

    const { tool, arguments: args = {} } = body || {};
    const callId = randomUUID();
    if (typeof tool !== 'string') return json(res, 400, { ok: false, error: 'tool is required' });

    publish({ type: 'tool-start', callId, tool, arguments: args, timestamp: Date.now() });
    try {
      const result = await executeTool(tool, args);
      publish({ type: 'tool-result', callId, tool, result, timestamp: Date.now() });
      return json(res, 200, { ok: true, callId, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const result = { ok: false, error: message };
      publish({ type: 'tool-error', callId, tool, result, timestamp: Date.now() });
      return json(res, 400, { ok: false, callId, ...result });
    }
  }

  return json(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Gateway listening on http://${HOST}:${PORT}`);
  console.log(`Gateway token: ${TOKEN}`);
  console.log(`Tools: http://${HOST}:${PORT}/tools`);
  console.log(`Events: http://${HOST}:${PORT}/events`);
});
