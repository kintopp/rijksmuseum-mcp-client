# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A web-based MCP client for the [Rijksmuseum MCP+ server](https://github.com/kintopp/rijksmuseum-mcp-plus). Split-pane UI: OpenSeadragon viewer (left, 2/3) + chat interface (right, 1/3). Users bring their own LLM via OpenRouter.

**Issue:** kintopp/rijksmuseum-mcp-plus-offline#190

## Architecture

```
Browser (useChat) ──→ POST /api/chat ──→ OpenRouter (streamText)
Browser            ──→ POST /api/mcp  ──→ MCP server (tool execution)
Browser            ──→ GET /api/tools ──→ MCP server (tool list, cached)
```

- **Backend:** Node/Express. Proxies LLM calls (so API key doesn't need CORS gymnastics), acts as MCP client to the Rijksmuseum MCP server, serves the SPA.
- **Frontend:** React SPA (Vite). Split pane — OpenSeadragon left, chat right. Model picker + API key input above chat.
- **LLM:** User's choice via OpenRouter. Any tool-use-capable model works.
- **Viewer:** Direct OSD integration — no ext-apps sandbox, no polling, no iframe. Tool results containing IIIF data drive `viewer.open()` directly.

## Tech Stack

| Package | Role |
|---------|------|
| `ai` | Core: `streamText()` with tool execution + multi-step loops (`maxSteps`) |
| `@ai-sdk/openai-compatible` | OpenRouter adapter (OpenAI-format API) |
| `@ai-sdk/react` | `useChat()` hook — message history, streaming, loading/error state |
| `openseadragon` | IIIF deep-zoom viewer |
| `express` | Backend server |
| `vite` | Frontend build |
| `react` | UI framework |

## MCP Server Interface

The Rijksmuseum MCP+ server is deployed at:
- **Production:** `https://rijksmuseum-mcp-plus-production.up.railway.app`
- **Local:** `http://localhost:3000` (run `npm run serve` in the MCP server repo)

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mcp` | `POST` | Streamable HTTP — all MCP protocol messages |
| `/health` | `GET` | Health check |
| `/viewer?iiif={id}&title={title}` | `GET` | Standalone OSD viewer (we won't use this — we have our own) |
| `/similar/:uuid` | `GET` | find_similar HTML pages (30-min TTL) |

### MCP Protocol Basics

Tool list and tool execution both go through `POST /mcp` using JSON-RPC:

```json
// List tools
{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}

// Call a tool
{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {
  "name": "search_artwork",
  "arguments": { "type": "painting", "creator": "Rembrandt van Rijn" }
}}
```

Response content is in `result.content[]` — typically `type: "text"` with JSON in the `text` field, plus optional `structuredContent` (same data, typed). For this client, parse `text` field JSON.

### Available Tools (13 + 1 feature-gated)

**Search & Discovery:**
- `search_artwork` — keyword, artist, period, medium, facets, compact mode
- `semantic_search` — natural language conceptual search (831K embeddings)
- `collection_stats` — distributional queries (19 dimensions, cross-domain filters)
- `browse_set` — browse curated collection sets
- `search_provenance` — structured provenance chain search

**Artwork Details:**
- `get_artwork_details` — full Linked Art metadata
- `get_artwork_image` — IIIF viewer (returns viewUUID + IIIF URL — we intercept this)
- `inspect_artwork_image` — region crop as base64
- `get_artwork_bibliography` — scholarly references

**Classification & Curation:**
- `lookup_iconclass` — Iconclass iconographic vocabulary
- `list_curated_sets` — exhibitions and scholarly groupings
- `get_recent_changes` — collection change tracking

**Viewer (ext-apps, may not apply directly):**
- `navigate_viewer` — viewport navigation + overlays (tied to ext-apps model)
- `poll_viewer_commands` — internal, ext-apps only

**Feature-gated:**
- `find_similar` — 6-signal similarity comparison (requires `ENABLE_FIND_SIMILAR=true`)

All tools use strict Zod schemas — unknown parameters are rejected with clear errors.

### Viewer Integration

When `get_artwork_image` is called, the MCP server returns a IIIF manifest URL (pattern: `https://iiif.micr.io/{uuid}/info.json`) and a title. Instead of opening the server's viewer page, we feed this directly to our OSD instance:

```js
viewer.open(`https://iiif.micr.io/${uuid}/info.json`);
```

For `navigate_viewer` commands (zoom to region, add overlay), translate the parameters to direct OSD API calls rather than going through the server's queue system.

### Tool Schema → OpenAI Format

The MCP server returns tool schemas as JSON Schema (derived from Zod). To pass them to OpenRouter/OpenAI format:

```js
// MCP tool schema
{ name: "search_artwork", inputSchema: { type: "object", properties: {...}, required: [...] } }

// OpenAI tool format
{ type: "function", function: { name: "search_artwork", description: "...", parameters: { type: "object", properties: {...}, required: [...] } } }
```

The `description` field from MCP maps directly. The `inputSchema` becomes `parameters`.

## Authentication

- OpenRouter API key: stored server-side via `OPENROUTER_API_KEY` env var. Never exposed to the client.
- Client access: users enter a password ("sk-c-5", case-insensitive) which is validated server-side before proxying LLM requests.
- Password persisted in `localStorage` for convenience across reloads.
- Only two models are allowed: Claude Sonnet 4.6 (default) and Mistral Large.
- No authentication on the MCP server (it's open).

## Build & Run

```bash
npm install
npm run dev          # Vite dev server + backend
npm run build        # Production build
npm start            # Production server
```

## Deploy

Railway (same project as the MCP server, separate service). `PORT` env var set automatically.

## Rules

- The MCP server repo is a separate project — never modify it from here.
- OpenSeadragon is bundled (not CDN) — follow the same pattern as the MCP server's viewer.
- Keep the backend thin — it's a proxy, not business logic.
- All tool-call errors should surface clearly in the chat UI (they help users compare model quality).
