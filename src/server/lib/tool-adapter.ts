import { tool, jsonSchema } from 'ai';
import { listTools, callTool } from './mcp-client.js';

let cachedTools: { tools: Record<string, any>; fromList: object } | null = null;

// Handle navigate_viewer locally — the MCP server queues for ext-apps polling,
// but we have direct OSD access so we return the commands for the frontend.
function handleNavigateViewer(args: Record<string, unknown>): string {
  const commands = args.commands as Array<{
    action: string;
    region?: string;
    label?: string;
    color?: string;
  }>;

  const result = {
    viewUUID: args.viewUUID,
    queued: commands.length,
    commands, // pass through so frontend can act on them
  };

  return JSON.stringify({ text: `Navigated viewer (${commands.length} commands)`, structuredContent: result });
}

export async function buildTools() {
  const mcpTools = await listTools();

  if (cachedTools && cachedTools.fromList === mcpTools) return cachedTools.tools;

  const tools: Record<string, any> = {};
  for (const t of mcpTools) {
    // Skip poll_viewer_commands — it's internal to the ext-apps model
    if (t.name === 'poll_viewer_commands') continue;

    const execute = t.name === 'navigate_viewer'
      ? async (args: unknown) => handleNavigateViewer(args as Record<string, unknown>)
      : async (args: unknown) => callTool(t.name, args as Record<string, unknown>);

    tools[t.name] = tool({
      description: t.description,
      parameters: jsonSchema(t.inputSchema as any),
      execute,
    });
  }

  cachedTools = { tools, fromList: mcpTools };
  return tools;
}
