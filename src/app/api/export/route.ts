import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        assistant: {
          select: { name: true },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        assistant: conv.assistant.name,
        createdAt: conv.createdAt.toISOString(),
        messages: conv.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          thinking: msg.thinking,
          createdAt: msg.createdAt.toISOString(),
        })),
      })),
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
