import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import type { DiscoverMcpToolsInput, DiscoveredTool } from "../services/types";

function buildTransport(input: DiscoverMcpToolsInput) {
  if (input.transport === "stdio") {
    return new StdioMCPTransport({
      command: input.command ?? "",
      args: input.args ?? [],
      env: input.env,
    });
  }
  const type = input.transport as "http" | "sse";
  return { type, url: input.url ?? "", headers: input.headers };
}

export async function discoverMcpTools(
  input: DiscoverMcpToolsInput,
): Promise<DiscoveredTool[]> {
  let client: MCPClient | undefined;
  try {
    client = await createMCPClient({
      transport: buildTransport(input),
      onUncaughtError: () => {},
    });
    const toolset = await client.tools();
    return Object.entries(toolset).map(([name, def]) => ({
      name,
      description: (def as { description?: string }).description,
    }));
  } finally {
    await client?.close().catch(() => {});
  }
}
