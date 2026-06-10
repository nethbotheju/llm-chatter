import { ipcMain, utilityProcess, BrowserWindow, app } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../db/client";
import { decrypt } from "../db/encryption";

const __dirname = dirname(fileURLToPath(import.meta.url));

const runningWorkers = new Map<string, Electron.UtilityProcess>();

function getChatWorkerPath(): string {
  if (app.isPackaged) {
    return join(__dirname, "chat-worker.cjs");
  }
  return join(__dirname, "../../dist-electron/main/chat-worker.mjs");
}

export function registerChatIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle(
    "chat:resolve",
    async (
      _e,
      input: { modelId: string; conversationId?: string | null },
    ) => {
      const prisma = getPrisma();
      const model = await prisma.model.findUnique({
        where: { id: input.modelId },
        include: { provider: true },
      });
      if (!model || !model.provider) throw new Error("Model not found");
      if (!model.enabled || !model.provider.enabled)
        throw new Error("Model disabled");

      const apiKeyEncrypted = model.provider.apiKeyEncrypted;
      if (!apiKeyEncrypted) throw new Error("API key not configured");
      const apiKey = decrypt(apiKeyEncrypted);

      let assistantConfig = {
        systemPrompt: "",
        temperature: 0.7,
        topP: 1.0,
      };
      if (input.conversationId) {
        const conv = await prisma.conversation.findUnique({
          where: { id: input.conversationId },
          include: { assistant: true },
        });
        if (conv?.assistant) {
          assistantConfig = {
            systemPrompt: conv.assistant.systemPrompt,
            temperature: conv.assistant.temperature,
            topP: conv.assistant.topP,
          };
        }
      }

      return {
        model: model.name,
        provider: {
          type: model.provider.type,
          apiKey,
          baseUrl: model.provider.baseUrl,
        },
        assistantConfig,
      };
    },
  );

  ipcMain.handle("chat:start", async (event, payload) => {
    const streamId = randomUUID();
    const win =
      BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    if (!win) throw new Error("No active window");

    const child = utilityProcess.fork(getChatWorkerPath(), [], {
      serviceName: "chat-worker",
    });

    runningWorkers.set(streamId, child);

    child.on("message", (msg: { type: string; payload?: unknown }) => {
      if (msg.type === "chunk" && win && !win.isDestroyed()) {
        win.webContents.send(`chat:chunk:${streamId}`, msg.payload);
      }
      if (msg.type === "done") {
        if (win && !win.isDestroyed()) {
          win.webContents.send(`chat:done:${streamId}`);
        }
        runningWorkers.delete(streamId);
        child.kill();
      }
      if (msg.type === "error") {
        if (win && !win.isDestroyed()) {
          win.webContents.send(`chat:error:${streamId}`, msg.payload);
        }
        runningWorkers.delete(streamId);
        child.kill();
      }
    });

    child.on("exit", (code) => {
      console.error(`Chat worker exited with code ${code}`);
      runningWorkers.delete(streamId);
    });

    child.postMessage({
      type: "start",
      payload: {
        messages: payload.messages,
        model: payload.model,
        provider: payload.provider,
        assistantConfig: payload.assistantConfig,
      },
    });

    return streamId;
  });

  ipcMain.handle("chat:abort", async (_e, streamId: string) => {
    const worker = runningWorkers.get(streamId);
    if (worker) {
      worker.postMessage({ type: "abort" });
      setTimeout(() => {
        if (runningWorkers.has(streamId)) {
          worker.kill();
          runningWorkers.delete(streamId);
        }
      }, 2000);
    }
  });
}
