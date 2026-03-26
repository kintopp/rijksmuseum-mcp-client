export const MCP_SERVER_URL =
  process.env.MCP_SERVER_URL ??
  'https://rijksmuseum-mcp-plus-production.up.railway.app';

let toolCache: { tools: McpTool[]; expiry: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let nextRpcId = 1;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface McpContent {
  type: string;
  text?: string;
}

async function rpc(method: string, params?: Record<string, unknown>) {
  const res = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextRpcId++,
      method,
      ...(params ? { params } : {}),
    }),
  });
  if (!res.ok) throw new Error(`MCP server error: ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';

  // Streamable HTTP: server may respond with SSE
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    // Parse SSE — find the last "data:" line with a JSON-RPC response
    for (const line of text.split('\n').reverse()) {
      if (!line.startsWith('data: ')) continue;
      const json = JSON.parse(line.slice(6));
      if (json.error) throw new Error(`MCP RPC error: ${json.error.message}`);
      return json.result;
    }
    throw new Error('No JSON-RPC response found in SSE stream');
  }

  // Plain JSON response
  const json = await res.json();
  if (json.error) throw new Error(`MCP RPC error: ${json.error.message}`);
  return json.result;
}

export async function listTools(): Promise<McpTool[]> {
  if (toolCache && Date.now() < toolCache.expiry) return toolCache.tools;
  const result = await rpc('tools/list');
  const tools: McpTool[] = result.tools;
  toolCache = { tools, expiry: Date.now() + CACHE_TTL };
  return tools;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const result = await rpc('tools/call', { name, arguments: args });
  const content: McpContent[] = result.content;
  const text = content
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text!)
    .join('\n');

  // Include structuredContent so the frontend can extract IIIF URLs etc.
  if (result.structuredContent) {
    return JSON.stringify({ text, structuredContent: result.structuredContent });
  }
  return text;
}
