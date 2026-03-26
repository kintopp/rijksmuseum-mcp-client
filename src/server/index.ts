import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import chatRouter from './routes/chat.js';
import toolsRouter from './routes/tools.js';
import mcpRouter from './routes/mcp.js';

const app = express();
app.use(express.json({ limit: '5mb' }));

app.use('/api/chat', chatRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/mcp', mcpRouter);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve skill files as plain text
const dataDir = path.join(__dirname, 'data');
app.get('/api/skill/main', (_req, res) => {
  res.sendFile(path.join(dataDir, 'skill.md'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
});
app.get('/api/skill/provenance', (_req, res) => {
  res.sendFile(path.join(dataDir, 'provenance-patterns.md'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
});

// Production: serve the Vite-built SPA
const clientDir = path.join(__dirname, 'client');
app.use(express.static(clientDir));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
