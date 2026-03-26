import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import chatRouter from './routes/chat.js';
import toolsRouter from './routes/tools.js';
import mcpRouter from './routes/mcp.js';

const app = express();
app.use(express.json());

app.use('/api/chat', chatRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/mcp', mcpRouter);

// Production: serve the Vite-built SPA
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(__dirname, 'client');
app.use(express.static(clientDir));
app.get('{*path}', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

const port = process.env.PORT ?? 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
