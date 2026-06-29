import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage, Tool } from "ai";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { getRuntimeModel } from "./provider-client";
import { getBuiltinTools } from "../builtin-tools/registry";
import type { ChatRuntimeInput, ResolvedToolSource } from "./types";
import { MAX_TOOL_STEPS } from "./types";

export async function streamChatRuntime(
  input: ChatRuntimeInput,
  options?: { signal?: AbortSignal },
) {
  const {
    messages,
    model: modelName,
    provider,
    assistantConfig,
    modelSupportsTools,
    toolStore,
  } = input;

  const model = getRuntimeModel({
    model: modelName,
    provider,
  });

  const modelMessages = await convertToModelMessages(
    messages as UIMessage[],
  );

  const system = assistantConfig?.systemPrompt || undefined;
  const temperature = assistantConfig?.temperature ?? 0.7;
  const topP = assistantConfig?.topP ?? 1;

  const mcpClients: MCPClient[] = [];
  let tools: Record<string, Tool> | undefined;
  try {
    tools = await resolveTools(
      modelSupportsTools ?? false,
      toolStore,
      mcpClients,
    );
  } catch (err) {
    await closeClients(mcpClients);
    throw err;
  }

  const cleanup = () => closeClients(mcpClients);

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    temperature,
    topP,
    abortSignal: options?.signal,
    ...(tools && Object.keys(tools).length > 0
      ? {
          tools,
          stopWhen: stepCountIs(MAX_TOOL_STEPS),
          onFinish: cleanup,
          onError: cleanup,
        }
      : {}),
  });

  return result;
}

async function resolveTools(
  modelSupportsTools: boolean,
  toolStore: ChatRuntimeInput["toolStore"],
  clients: MCPClient[],
): Promise<Record<string, Tool> | undefined> {
  if (!modelSupportsTools || !toolStore) return undefined;

  const sources = await toolStore.listEnabledToolSources();
  const merged: Record<string, Tool> = {};

  for (const source of sources) {
    if (!source.enabled) continue;
    try {
      if (source.transport === "builtin" && source.builtinConfig) {
        const builtinTools = getBuiltinTools({
          enabled: source.builtinConfig.enabled,
          configs: source.builtinConfig.configs,
        });
        Object.assign(merged, builtinTools);
      } else if (
        source.transport === "stdio" ||
        source.transport === "http" ||
        source.transport === "sse"
      ) {
        const remoteTools = await connectMcpServer(source, clients);
        for (const [name, tool] of Object.entries(remoteTools)) {
          merged[`${source.slug}__${name}`] = tool;
        }
      }
    } catch (err) {
      console.error(`Failed to load MCP tools from "${source.slug}":`, err);
    }
  }

  return merged;
}

async function connectMcpServer(
  source: ResolvedToolSource,
  clients: MCPClient[],
): Promise<Record<string, Tool>> {
  const client = await createMCPClient({
    transport: buildMcpTransport(source),
    onUncaughtError: (err) =>
      console.error(`MCP "${source.slug}" uncaught error:`, err),
  });
  clients.push(client);
  const toolset = await client.tools();
  return toolset as Record<string, Tool>;
}

function buildMcpTransport(source: ResolvedToolSource) {
  switch (source.transport) {
    case "stdio":
      return new StdioMCPTransport({
        command: source.command ?? "",
        args: source.args ?? [],
        env: source.env,
      });
    case "http":
      return {
        type: "http" as const,
        url: source.url ?? "",
        headers: source.headers,
      };
    case "sse":
      return {
        type: "sse" as const,
        url: source.url ?? "",
        headers: source.headers,
      };
    default:
      throw new Error(`Unsupported MCP transport: ${source.transport}`);
  }
}

async function closeClients(clients: MCPClient[]): Promise<void> {
  await Promise.all(clients.map((c) => c.close().catch(() => {})));
}
