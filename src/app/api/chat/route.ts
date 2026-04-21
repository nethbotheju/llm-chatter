import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { decrypt } from "@/lib/ai/encryption";
import { streamChatRuntime } from "@/lib/chat-runtime";
import { providerTypeSchema } from "@/lib/contracts";

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

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { provider: true },
    });

    if (!model || !model.provider) {
      return new Response(JSON.stringify({ error: "Model not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!model.provider.enabled || !model.enabled) {
      return new Response(JSON.stringify({ error: "Model or provider is disabled" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let assistantConfig = {
      systemPrompt: "",
      temperature: 0.7,
      topP: 1.0,
    };

    if (conversationId) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { assistant: true },
      });

      if (conversation?.assistant) {
        assistantConfig = {
          systemPrompt: conversation.assistant.systemPrompt,
          temperature: conversation.assistant.temperature,
          topP: conversation.assistant.topP,
        };
      }
    }

    const apiKeyEncrypted = model.provider.apiKeyEncrypted;
    if (!apiKeyEncrypted) {
      return new Response(JSON.stringify({ error: "Provider API key is not configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = decrypt(apiKeyEncrypted);

    const result = await streamChatRuntime({
      messages,
      model: model.name,
      provider: {
        type: providerTypeSchema.parse(model.provider.type),
        apiKey,
        baseUrl: model.provider.baseUrl,
      },
      assistantConfig,
    });

    return result.toUIMessageStreamResponse({
      onFinish: async ({ responseMessage }) => {
        if (conversationId) {
          try {
            await prisma.message.create({
              data: {
                id: responseMessage.id,
                conversationId,
                role: "assistant",
                parts: JSON.stringify(responseMessage.parts),
                metadata: responseMessage.metadata ? JSON.stringify(responseMessage.metadata) : null,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });
          } catch (error) {
            console.error("Failed to save assistant message:", error);
          }
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
