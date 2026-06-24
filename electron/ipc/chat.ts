import { ipcMain, utilityProcess, BrowserWindow, app } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getPrisma } from "../db/client";
import { decrypt } from "../db/encryption";
import { nanoid } from "nanoid";
import {
  resolveChatConfig,
  persistAssistantMessage,
  type ChatConfigStore,
  type ChatPersistenceStore,
} from "../../src/lib/chat-runtime";

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
      const store: ChatConfigStore = {
        findModelWithProvider: (id) =>
          prisma.model.findUnique({ where: { id }, include: { provider: true } }),
        findConversationWithAssistant: (id) =>
          prisma.conversation.findUnique({ where: { id }, include: { assistant: true } }),
        decrypt,
      };
      return resolveChatConfig(input, store);
    },
  );

  ipcMain.handle("chat:start", async (event, payload: {
    messages: { id: string; role: string; parts: unknown }[];
    model: string;
    provider: { type: string; apiKey: string; baseUrl: string | null };
    assistantConfig: { systemPrompt: string; temperature: number; topP: number };
    conversationId?: string | null;
  }) => {
    const streamId = randomUUID();
    const win =
      BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    if (!win) throw new Error("No active window");

    const conversationId = payload.conversationId ?? null;
    const messageId = nanoid();

    const prisma = getPrisma();
    const persistenceStore: ChatPersistenceStore = {
      upsertAssistantMessage: async (rec) => {
        await prisma.message.upsert({
          where: { id: rec.id },
          create: {
            id: rec.id,
            conversationId: rec.conversationId,
            role: "assistant",
            parts: rec.parts,
            metadata: rec.metadata,
          },
          update: {
            parts: rec.parts,
            metadata: rec.metadata,
          },
        });
      },
      touchConversation: async (id) => {
        await prisma.conversation.update({
          where: { id },
          data: { updatedAt: new Date() },
        });
      },
    };

    const child = utilityProcess.fork(getChatWorkerPath(), [], {
      serviceName: "chat-worker",
    });

    runningWorkers.set(streamId, child);

    child.on("message", (msg: { type: string; payload?: unknown }) => {
      if (msg.type === "chunk" && win && !win.isDestroyed()) {
        win.webContents.send(`chat:chunk:${streamId}`, msg.payload);
      }
      if (msg.type === "done") {
        (async () => {
          const donePayload = msg.payload as
            | { parts?: unknown; metadata?: unknown }
            | undefined;
          if (conversationId && donePayload?.parts != null) {
            try {
              await persistAssistantMessage(
                {
                  messageId,
                  conversationId,
                  parts: donePayload.parts,
                  metadata: donePayload.metadata,
                },
                persistenceStore,
              );
            } catch (error) {
              console.error("Failed to save assistant message:", error);
            }
          }
          if (win && !win.isDestroyed()) {
            win.webContents.send(`chat:done:${streamId}`);
          }
          runningWorkers.delete(streamId);
          child.kill();
        })();
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
        messageId,
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
