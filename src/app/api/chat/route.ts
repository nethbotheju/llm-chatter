import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/client";
import { decrypt } from "@/lib/ai/encryption";
import { encrypt } from "@/lib/ai/encryption";
import {
  streamChatRuntime,
  resolveChatConfig,
  persistAssistantMessage,
  ChatError,
  type ChatConfigStore,
  type ChatPersistenceStore,
  type ChatToolStore,
} from "@/lib/chat-runtime";
import { type ConfigCipher } from "@/lib/builtin-tools";
import { toResolvedToolSource } from "@/lib/mcp/server-config";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, modelId, conversationId } = body;

    if (!modelId) {
      return new Response(JSON.stringify({ error: "Model ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const webStore: ChatConfigStore = {
      findModelWithProvider: (id) =>
        prisma.model.findUnique({ where: { id }, include: { provider: true } }),
      findConversationWithAssistant: (id) =>
        prisma.conversation.findUnique({ where: { id }, include: { assistant: true } }),
      decrypt,
    };

    const webPersistenceStore: ChatPersistenceStore = {
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
      touchConversation: async (conversationId) => {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      },
    };

    const cipher: ConfigCipher = { encrypt, decrypt };
    const webToolStore: ChatToolStore = {
      listEnabledToolSources: async () => {
        const rows = await prisma.mcpServer.findMany({ where: { enabled: true } });
        return rows.map((r) => toResolvedToolSource(r, cipher));
      },
    };

    let config;
    try {
      config = await resolveChatConfig({ modelId, conversationId }, webStore);
    } catch (error) {
      if (error instanceof ChatError && error.status != null) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: error.status,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw error;
    }

    const result = await streamChatRuntime({
      messages,
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
      onFinish: async ({ responseMessage }) => {
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
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred during chat" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
