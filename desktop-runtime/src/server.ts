import { createServer } from "node:http";
import { parse as parseUrl } from "node:url";
import {
  parseChatRequest,
  parseChatEvent,
  type ChatEventDTO,
} from "../../src/lib/contracts/index";
import { streamChatRuntimeEvents } from "../../src/lib/chat-runtime/index";

function writeSseEvent(
  res: import("node:http").ServerResponse,
  event: ChatEventDTO,
): void {
  const normalized = parseChatEvent(event);
  res.write(`data: ${JSON.stringify(normalized)}\n\n`);
}

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

async function run(): Promise<void> {
  const token = process.env.DESKTOP_RUNTIME_TOKEN;
  const port = Number(process.env.DESKTOP_RUNTIME_PORT || "0");

  if (!token) {
    throw new Error("DESKTOP_RUNTIME_TOKEN is required");
  }

  const server = createServer(async (req, res) => {
    try {
      const authorization = req.headers.authorization;
      if (authorization !== `Bearer ${token}`) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      const method = req.method || "GET";
      const pathname = parseUrl(req.url || "").pathname || "/";

      if (method === "GET" && pathname === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method !== "POST" || pathname !== "/chat") {
        sendJson(res, 404, { error: "Not found" });
        return;
      }

      const raw = await readJson(req);
      const input = parseChatRequest(raw);

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      for await (const event of streamChatRuntimeEvents(input)) {
        writeSseEvent(res, event);
      }

      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 500, { error: message });
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
