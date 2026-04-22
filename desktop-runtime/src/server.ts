import { createServer } from "node:http";
import { parse as parseUrl } from "node:url";
import { streamChatRuntime } from "../../src/lib/chat-runtime/index";

function sendJson(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJson(req: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  const body = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(body);
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function run(): Promise<void> {
  const token = process.env.DESKTOP_RUNTIME_TOKEN;
  const port = Number(process.env.DESKTOP_RUNTIME_PORT || "0");

  if (!token) {
    throw new Error("DESKTOP_RUNTIME_TOKEN is required");
  }

  const server = createServer(async (req, res) => {
    const cors = corsHeaders();

    try {
      const method = req.method || "GET";
      const pathname = parseUrl(req.url || "").pathname || "/";

      // Handle CORS preflight BEFORE auth check
      if (method === "OPTIONS") {
        Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
        res.statusCode = 204;
        res.end();
        return;
      }

      const authorization = req.headers.authorization;
      if (authorization !== `Bearer ${token}`) {
        Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      if (method === "GET" && pathname === "/health") {
        Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method !== "POST" || pathname !== "/chat") {
        Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      const raw = await readJson(req);
      process.stderr.write(`[sidecar] /chat request received. Body keys: ${Object.keys(raw as object).join(", ")}\n`);
      const { messages, model, provider, assistantConfig } = raw as {
        messages: unknown[];
        model: string;
        provider: { type: string; apiKey: string; baseUrl?: string | null };
        assistantConfig?: { systemPrompt?: string; temperature?: number; topP?: number };
      };

      process.stderr.write(`[sidecar] model=${model} providerType=${provider?.type} hasApiKey=${!!provider?.apiKey} messages=${messages?.length}\n`);

      const result = await streamChatRuntime({
        messages: messages as Parameters<typeof streamChatRuntime>[0]["messages"],
        model,
        provider: {
          type: provider.type as "openai" | "anthropic" | "google" | "openai-compatible" | "anthropic-compatible",
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl ?? undefined,
        },
        assistantConfig: assistantConfig
          ? {
              systemPrompt: assistantConfig.systemPrompt ?? "",
              temperature: assistantConfig.temperature ?? 0.7,
              topP: assistantConfig.topP ?? 1,
            }
          : undefined,
      });

      process.stderr.write(`[sidecar] streamChatRuntime resolved, creating response...\n`);
      const response = result.toUIMessageStreamResponse({
        sendReasoning: true,
      });

      process.stderr.write(`[sidecar] Response status=${response.status} hasBody=${!!response.body}\n`);

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

      if (!response.body) {
        res.end();
        return;
      }

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      process.stderr.write(`[sidecar] ERROR: ${message}\n`);

      if (!res.headersSent) {
        Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
        sendJson(res, 500, { error: message });
      } else {
        res.end();
      }
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      process.stdout.write(`DESKTOP_RUNTIME_READY:${address.port}\n`);
    }
  });
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`desktop-runtime failed: ${message}\n`);
  process.exit(1);
});
