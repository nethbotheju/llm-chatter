import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { nanoid } from "nanoid";
import { decrypt } from "@/lib/ai/encryption";
import { streamChatRuntimeEvents } from "@/lib/chat-runtime";
import { parseChatEvent, providerTypeSchema } from "@/lib/contracts";

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

    // Get model with provider
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

    // Get assistant settings from conversation
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

    const stream = new ReadableStream({
      async start(controller) {
        let doneText = "";
        let finishReason: string | null = null;
        const encoder = new TextEncoder();
        const writeEvent = (event: unknown) => {
          const normalized = parseChatEvent(event);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(normalized)}\n\n`));
          return normalized;
        };

        try {
          for await (const event of streamChatRuntimeEvents({
            messages,
            model: model.name,
            provider: {
              type: providerTypeSchema.parse(model.provider.type),
              apiKey,
              baseUrl: model.provider.baseUrl,
            },
            assistantConfig,
          })) {
            const normalized = writeEvent(event);

            if (normalized.type === "done") {
              doneText = normalized.text;
              finishReason = normalized.finishReason ?? null;
            }

            if (normalized.type === "error") {
              throw new Error(normalized.error.message);
            }
          }

          if (conversationId && doneText && (!finishReason || finishReason === "stop")) {
            await prisma.message.create({
              data: {
                id: nanoid(),
                conversationId,
                role: "assistant",
                content: doneText,
              },
            });

            await prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            });
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
