import { Router } from 'express';
import { listTools } from '../lib/mcp-client.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const tools = await listTools();
    res.json(tools);
  } catch (err) {
    console.error('Failed to fetch tools:', err);
    res.status(502).json({ error: 'Failed to fetch tools from MCP server' });
  }
});

export default router;
