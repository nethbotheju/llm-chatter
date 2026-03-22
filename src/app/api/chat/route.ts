import { streamText } from "ai";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { getProviderClient } from "@/lib/ai/client";
import { nanoid } from "nanoid";

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

    const providerClient = getProviderClient(model.provider);
    const aiModel = providerClient(model.name);

    // Build messages array with system prompt
    const formattedMessages = assistantConfig.systemPrompt
      ? [{ id: nanoid(), role: "system" as const, content: assistantConfig.systemPrompt }, ...messages]
      : messages;

    const result = streamText({
      model: aiModel,
      messages: formattedMessages,
      temperature: assistantConfig.temperature,
      topP: assistantConfig.topP,
      onFinish: async ({ text, finishReason }) => {
        if (conversationId && finishReason === "stop") {
          // Save the assistant's message
          await prisma.message.create({
            data: {
              id: nanoid(),
              conversationId,
              role: "assistant",
              content: text,
            },
          });

          // Update conversation's updatedAt
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        }
      },
    });

    return result.toTextStreamResponse();
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
