import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@llm-chatter/db";
import { models, providers, conversations, assistants, messages, mcpServers } from "@llm-chatter/db";
import { eq } from "drizzle-orm";
import { decrypt, encrypt } from "@llm-chatter/ai-runtime";
import {
  streamChatRuntime,
  resolveChatConfig,
  persistAssistantMessage,
  ChatError,
  toChatError,
  type ChatConfigStore,
  type ChatPersistenceStore,
  type ChatToolStore,
} from "@llm-chatter/ai-runtime";
import { type ConfigCipher } from "@llm-chatter/ai-runtime";
import { toResolvedToolSource } from "@llm-chatter/ai-runtime";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages: chatMessages, modelId, conversationId } = body;

    if (!modelId) {
      throw new ChatError({
        code: "MODEL_ID_REQUIRED",
        message: "Model ID is required",
        status: 400,
        retryable: false,
      });
    }

    const webStore: ChatConfigStore = {
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

    const webPersistenceStore: ChatPersistenceStore = {
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
      touchConversation: async (convoId) => {
        await db.update(conversations)
          .set({ updatedAt: new Date().toISOString() })
          .where(eq(conversations.id, convoId));
      },
    };

    const cipher: ConfigCipher = { encrypt, decrypt };
    const webToolStore: ChatToolStore = {
      listEnabledToolSources: async () => {
        const rows = await db.select().from(mcpServers).where(eq(mcpServers.enabled, true));
        return rows.map((r) => toResolvedToolSource(r, cipher));
      },
    };

    const config = await resolveChatConfig({ modelId, conversationId }, webStore);

    const result = await streamChatRuntime({
      messages: chatMessages,
      model: config.model,
      provider: config.provider,
      assistantConfig: config.assistantConfig,
      modelSupportsTools: config.modelSupportsTools,
      acceptedAttachmentKinds: config.acceptedAttachmentKinds,
      toolStore: webToolStore,
    });

    return result.toUIMessageStreamResponse({
      generateMessageId: () => nanoid(),
      messageMetadata: () => ({
        modelName: config.model,
      }),
      onFinish: async ({ responseMessage }: { responseMessage: any }) => {
        if (!conversationId) return;
        try {
          await persistAssistantMessage(
            {
              messageId: responseMessage.id,
              conversationId,
              parts: responseMessage.parts,
              metadata: responseMessage.metadata,
            },
            webPersistenceStore,
          );
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
      },
    });
  } catch (error) {
    const dto = toChatError(error).toDTO();
    console.error("[chat] request failed:", dto.code, dto.message);
    return new Response(JSON.stringify(dto), {
      status: dto.status ?? 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
