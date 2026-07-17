import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage, FileUIPart, Tool } from "ai";
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";
import { getRuntimeModel } from "./provider-client";
import { getBuiltinTools } from "../builtin-tools/registry";
import { kindForMediaType, type AttachmentKind } from "@llm-chatter/contracts";
import type { ChatRuntimeInput, ResolvedToolSource } from "./types";
import { MAX_TOOL_STEPS } from "./types";

export async function streamChatRuntime(
  input: ChatRuntimeInput,
  options?: { signal?: AbortSignal },
): Promise<any> {
  const {
    messages,
    model: modelName,
    provider,
    assistantConfig,
    modelSupportsTools,
    acceptedAttachmentKinds,
    toolStore,
  } = input;

  const model = getRuntimeModel({
    model: modelName,
    provider,
  });

  const modelMessages = inlineDataUrlAssets(
    await convertToModelMessages(
      filterUnsupportedAttachments(messages, acceptedAttachmentKinds),
    ),
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
    onFinish: cleanup,
    onError: (err) => {
      console.error("[chat-runtime] stream error:", err);
      cleanup();
    },
    ...(tools && Object.keys(tools).length > 0
      ? {
          tools,
          stopWhen: stepCountIs(MAX_TOOL_STEPS),
        }
      : {}),
  });

  return result;
}

// Drop file parts the selected model can't process so the request always
// succeeds even when the conversation history carries attachments (e.g. the
// user switched to a text-only model mid-thread). Undefined kinds => leave
// messages untouched (backwards compatible / unknown capability).
function filterUnsupportedAttachments(
  messages: UIMessage[],
  acceptedKinds: AttachmentKind[] | undefined,
): UIMessage[] {
  if (acceptedKinds === undefined) return messages;
  return messages.map((m) => ({
    ...m,
    parts: m.parts.filter((p) => {
      if (p.type !== "file") return true;
      const kind = kindForMediaType((p as FileUIPart).mediaType);
      return kind !== null && acceptedKinds.includes(kind);
    }),
  }));
}

// convertToModelMessages copies a FileUIPart's data URL into FilePart.data as a
// "data:...;base64,..." string. The SDK's prompt pipeline treats any value that
// parses as a URL (data: included) as a remote asset to download, but the
// download validator only accepts http(s), so inline data URLs throw
// AI_DownloadError and the request never reaches the provider. Decode those
// data URLs into inline bytes here so they stay on the inline base64 path.
// Runs in Node (web route + electron utility process), so Buffer is available.
function inlineDataUrlAssets(
  messages: Awaited<ReturnType<typeof convertToModelMessages>>,
): Awaited<ReturnType<typeof convertToModelMessages>> {
  return messages.map((message) => {
    if (message.role !== "user" || !Array.isArray(message.content)) {
      return message;
    }
    return {
      ...message,
      content: message.content.map((part) => {
        if (part.type !== "file" && part.type !== "image") return part;
        const value = part.type === "image" ? part.image : part.data;
        if (typeof value !== "string" || !value.startsWith("data:")) return part;
        const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
        if (!match) return part;
        const [, declaredMediaType, isBase64, body] = match;
        const bytes = new Uint8Array(
          Buffer.from(body, isBase64 ? "base64" : "utf8"),
        );
        const mediaType = part.mediaType ?? declaredMediaType;
        return part.type === "image"
          ? { ...part, image: bytes, mediaType }
          : { ...part, data: bytes, mediaType };
      }),
    };
  });
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
