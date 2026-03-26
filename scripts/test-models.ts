/**
 * Test each curated model against the MCP tool set.
 *
 * For each model: send a prompt that should trigger a tool call,
 * check if the model produces a valid tool_call, execute it,
 * and report success/failure.
 *
 * Usage: OPENROUTER_API_KEY=sk-or-... npx tsx scripts/test-models.ts
 */

const MCP_SERVER_URL = 'https://rijksmuseum-mcp-plus-production.up.railway.app';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'qwen/qwen3-coder:free',
  'openai/gpt-5.4-mini',
  'google/gemini-2.5-flash',
  'deepseek/deepseek-v3.2',
  'mistralai/mistral-small-2603',
  'qwen/qwen3.5-122b-a10b',
  'openai/gpt-5.4',
  'openai/gpt-5.1',
  'anthropic/claude-sonnet-4.6',
  'google/gemini-2.5-pro',
  'mistralai/mistral-large-2512',
  'anthropic/claude-opus-4.6',
  'openai/gpt-5.4-pro',
];

// Test prompts — each designed to trigger a specific tool
const TEST_CASES = [
  { prompt: 'Search for paintings by Vermeer', expectedTool: 'search_artwork' },
  { prompt: 'Show me The Night Watch by Rembrandt', expectedTool: 'get_artwork_image' },
  { prompt: 'How many paintings are in the collection?', expectedTool: 'collection_stats' },
];

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ── MCP helpers ──

async function mcpRpc(method: string, params?: Record<string, unknown>) {
  const res = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  });
  const text = await res.text();
  for (const line of text.split('\n').reverse()) {
    if (!line.startsWith('data: ')) continue;
    const json = JSON.parse(line.slice(6));
    if (json.error) throw new Error(json.error.message);
    return json.result;
  }
  throw new Error('No response');
}

async function fetchTools(): Promise<McpTool[]> {
  const result = await mcpRpc('tools/list');
  return result.tools;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const result = await mcpRpc('tools/call', { name, arguments: args });
  const content: Array<{ type: string; text?: string }> = result.content;
  return content.filter(c => c.type === 'text' && c.text).map(c => c.text!).join('\n');
}

// ── OpenRouter helpers ──

function toOpenAITools(mcpTools: McpTool[]) {
  return mcpTools
    .filter(t => t.name !== 'poll_viewer_commands')
    .map(t => ({
      type: 'function' as const,
      function: { name: t.name, description: t.description, parameters: t.inputSchema },
    }));
}

async function chatWithModel(
  apiKey: string,
  model: string,
  tools: ReturnType<typeof toOpenAITools>,
  prompt: string,
): Promise<{ toolName: string | null; toolArgs: Record<string, unknown> | null; error: string | null; rawResponse?: any }> {
  try {
    const res = await fetch(OPENROUTER_URL, {
      signal: AbortSignal.timeout(30_000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant for exploring the Rijksmuseum collection. Use the available tools to answer questions.' },
          { role: 'user', content: prompt },
        ],
        tools,
        tool_choice: 'auto',
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { toolName: null, toolArgs: null, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    if (!choice) return { toolName: null, toolArgs: null, error: 'No choices in response' };

    const toolCalls = choice.message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const content = choice.message?.content?.slice(0, 100) ?? '(empty)';
      return { toolName: null, toolArgs: null, error: `No tool call — replied with text: ${content}` };
    }

    const tc = toolCalls[0];
    const args = typeof tc.function.arguments === 'string'
      ? JSON.parse(tc.function.arguments)
      : tc.function.arguments;

    return { toolName: tc.function.name, toolArgs: args, error: null };
  } catch (e: any) {
    return { toolName: null, toolArgs: null, error: e.message };
  }
}

// ── Main ──

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('Set OPENROUTER_API_KEY env var');
    process.exit(1);
  }

  console.log('Fetching MCP tools...');
  const mcpTools = await fetchTools();
  const tools = toOpenAITools(mcpTools);
  console.log(`${tools.length} tools loaded\n`);

  const results: Array<{
    model: string;
    prompt: string;
    expectedTool: string;
    toolCalled: string | null;
    toolCallValid: boolean;
    toolExecOk: boolean;
    error: string | null;
    latencyMs: number;
  }> = [];

  for (const model of MODELS) {
    const isFree = model.includes(':free') || model === 'openrouter/free';
    let skipRemaining = false;

    for (const tc of TEST_CASES) {
      if (skipRemaining) {
        results.push({ model, prompt: tc.prompt, expectedTool: tc.expectedTool, toolCalled: null, toolCallValid: false, toolExecOk: false, error: 'skipped (first test failed)', latencyMs: 0 });
        console.log(`  ${model} × ${tc.expectedTool}... SKIP`);
        continue;
      }

      const label = `${model} × ${tc.expectedTool}`;
      process.stdout.write(`  ${label}...`);
      const start = Date.now();

      const { toolName, toolArgs, error } = await chatWithModel(apiKey, model, tools, tc.prompt);
      let toolCallValid = false;
      let toolExecOk = false;

      if (toolName && toolArgs) {
        toolCallValid = true;
        // Try executing the tool call against the MCP server
        try {
          const result = await callTool(toolName, toolArgs);
          toolExecOk = !result.includes('MCP error') && !result.includes('Input validation error');
        } catch {
          toolExecOk = false;
        }
      }

      const latencyMs = Date.now() - start;
      const status = toolExecOk ? '  OK' : toolCallValid ? ' EXEC_FAIL' : ' NO_TOOL';
      console.log(`${status}  (${(latencyMs / 1000).toFixed(1)}s)${toolName ? `  called=${toolName}` : ''}${error ? `  err=${error.slice(0, 80)}` : ''}`);

      results.push({
        model,
        prompt: tc.prompt,
        expectedTool: tc.expectedTool,
        toolCalled: toolName,
        toolCallValid,
        toolExecOk,
        error,
        latencyMs,
      });

      // Fail fast for free models: if first test fails, skip the rest
      if (isFree && !toolExecOk && tc === TEST_CASES[0]) {
        skipRemaining = true;
      }
    }
  }

  // Summary table
  console.log('\n\n=== SUMMARY ===\n');
  console.log('Model'.padEnd(50), 'search'.padEnd(12), 'image'.padEnd(12), 'stats'.padEnd(12));
  console.log('-'.repeat(86));

  for (const model of MODELS) {
    const row = results.filter(r => r.model === model);
    const cells = TEST_CASES.map(tc => {
      const r = row.find(r => r.expectedTool === tc.expectedTool);
      if (!r) return '?';
      if (r.toolExecOk) return 'OK';
      if (r.toolCallValid) return 'EXEC_FAIL';
      return 'NO_TOOL';
    });
    console.log(model.padEnd(50), ...cells.map(c => c.padEnd(12)));
  }

  // Write JSON results
  const outPath = 'scripts/test-models-results.json';
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results written to ${outPath}`);
}

main();
