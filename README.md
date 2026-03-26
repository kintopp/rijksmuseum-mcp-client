# Rijksmuseum MCP Client

Web-based chat interface for exploring the [Rijksmuseum collection](https://www.rijksmuseum.nl/en/collection) through the [Rijksmuseum MCP+ server](https://github.com/kintopp/rijksmuseum-mcp-plus). Split-pane layout with an OpenSeadragon deep-zoom viewer and a chat interface.

## How it works

An LLM (Mistral Large 3 or Claude Sonnet 4.6) uses 13 MCP tools to search, filter, and retrieve artworks from the Rijksmuseum's ~830,000-object collection. When an artwork is opened, the IIIF image loads directly in the viewer. Users can zoom, pan, rotate, select regions, and ask the LLM about what they see.

```
Browser ──→ POST /api/chat ──→ OpenRouter (LLM streaming)
Browser ──→ POST /api/mcp  ──→ Rijksmuseum MCP+ server (tool execution)
```

The backend proxies LLM requests (API key stays server-side) and acts as an MCP client to the Rijksmuseum server.

## Features

- Deep-zoom IIIF viewer (OpenSeadragon) with navigation controls, rotation, fullscreen
- Region selection — drag to select an area, coordinates are added to the chat prompt
- Viewer navigation and overlays driven by LLM tool calls
- Markdown rendering in chat (tables, code blocks, lists, links)
- Optional skill file that provides the LLM with detailed research workflows
- Stop button to cancel in-progress queries

## Setup

```bash
npm install
```

Create a `.env` file:

```
OPENROUTER_API_KEY=your-openrouter-api-key
```

## Development

```bash
npm run dev
```

Starts the Vite dev server (frontend) and the Express backend concurrently.

## Production

```bash
npm run build
npm start
```

## Deployment

Configured for [Railway](https://railway.com). Set `OPENROUTER_API_KEY` as an environment variable on the service. Railway provides `PORT` automatically.

## Tech stack

| Package | Role |
|---------|------|
| `ai` | `streamText()` with tool execution and multi-step loops |
| `@ai-sdk/openai-compatible` | OpenRouter adapter |
| `@ai-sdk/react` | `useChat()` hook for message history and streaming |
| `express` | Backend server and MCP client proxy |
| `openseadragon` | IIIF deep-zoom viewer |
| `react` | UI framework |
| `react-markdown` | Markdown rendering in chat |
| `vite` | Frontend build |

## Access

Password-protected. See [kintopp/rijksmuseum-mcp-plus-offline#190](https://github.com/kintopp/rijksmuseum-mcp-plus-offline/issues/190) for context.

## License

MIT
