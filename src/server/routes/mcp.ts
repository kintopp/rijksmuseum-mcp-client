import { Router } from 'express';
import { MCP_SERVER_URL } from '../lib/mcp-client.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const upstream = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get('content-type') ?? 'application/json').send(data);
  } catch (err) {
    console.error('MCP proxy error:', err);
    res.status(502).json({ error: 'MCP proxy request failed' });
  }
});

export default router;
