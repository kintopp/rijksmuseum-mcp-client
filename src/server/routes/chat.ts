import { Router } from 'express';
import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { buildTools } from '../lib/tool-adapter.js';

const router = Router();

router.post('/', async (req, res) => {
  const { messages, model, apiKey } = req.body;

  if (!apiKey || !model) {
    res.status(400).json({ error: 'Missing apiKey or model' });
    return;
  }

  try {
    const openrouter = createOpenAICompatible({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const tools = await buildTools();

    const result = streamText({
      model: openrouter(model),
      messages,
      tools,
      maxSteps: 10,
    });

    result.pipeDataStreamToResponse(res);
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat request failed' });
    }
  }
});

export default router;
