import { ipcMain, utilityProcess, BrowserWindow, app } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/client";
import { models, providers, conversations, assistants, messages, mcpServers } from "@llm-chatter/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "../db/encryption";
import { nanoid } from "nanoid";
import {
  resolveChatConfig,
  persistAssistantMessage,
  type ChatConfigStore,
  type ChatPersistenceStore,
  type ChatToolStore,
  type ResolvedToolSource,
} from "../chat-runtime";
import { type ConfigCipher } from "@llm-chatter/ai-runtime";
import { toResolvedToolSource } from "@llm-chatter/ai-runtime";

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
      const db = getDb();
      const store: ChatConfigStore = {
        findModelWithProvider: async (id) => {
          const modelRow = await db.select().from(models).where(eq(models.id, id)).get();
          if (!modelRow) return null;
          const providerRow = await db.select().from(providers).where(eq(providers.id, modelRow.providerId)).get();
          return {
            ...modelRow,
            provider: providerRow || null,
          };
        },
        findConversationWithAssistant: async (id) => {
          const conversationRow = await db.select().from(conversations).where(eq(conversations.id, id)).get();
          if (!conversationRow) return null;
          const assistantRow = await db.select().from(assistants).where(eq(assistants.id, conversationRow.assistantId)).get();
          return {
            ...conversationRow,
            assistant: assistantRow || null,
          };
        },
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
    modelSupportsTools?: boolean;
    acceptedAttachmentKinds?: ("image" | "pdf")[];
  }) => {
    const streamId = randomUUID();
    const win =
      BrowserWindow.fromWebContents(event.sender) ?? getMainWindow();
    if (!win) throw new Error("No active window");

    const conversationId = payload.conversationId ?? null;
    const messageId = nanoid();

    const db = getDb();
    const persistenceStore: ChatPersistenceStore = {
      upsertAssistantMessage: async (rec) => {
        await db.insert(messages)
          .values({
            id: rec.id,
            conversationId: rec.conversationId,
            role: "assistant",
            parts: rec.parts,
            metadata: rec.metadata || null,
            createdAt: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: messages.id,
            set: {
              parts: rec.parts,
              metadata: rec.metadata || null,
            }
          });
      },
      touchConversation: async (id) => {
        await db.update(conversations)
          .set({ updatedAt: new Date().toISOString() })
          .where(eq(conversations.id, id));
      },
    };

    const child = utilityProcess.fork(getChatWorkerPath(), [], {
      serviceName: "chat-worker",
    });

    runningWorkers.set(streamId, child);

    let toolSources: ResolvedToolSource[] = [];
    if (payload.modelSupportsTools) {
      try {
        const cipher: ConfigCipher = { encrypt, decrypt };
        const rows = await db.select().from(mcpServers).where(eq(mcpServers.enabled, true));
        toolSources = rows.map((r) => toResolvedToolSource(r, cipher));
      } catch (error) {
        console.error("Failed to resolve tool sources:", error);
      }
    }

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
        modelSupportsTools: payload.modelSupportsTools,
        acceptedAttachmentKinds: payload.acceptedAttachmentKinds,
        toolSources,
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
