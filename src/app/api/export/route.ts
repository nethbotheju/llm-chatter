import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { conversations, messages, assistants } from "@/lib/db/schema";
import { desc, asc } from "drizzle-orm";

export async function GET() {
  try {
    const convos = await db.select().from(conversations).orderBy(desc(conversations.createdAt));
    const allMessages = await db.select().from(messages).orderBy(asc(messages.createdAt));
    const allAssistants = await db.select().from(assistants);

    const assistantsMap = new Map(allAssistants.map((a) => [a.id, a]));

    const exportData = {
      exportedAt: new Date().toISOString(),
      conversations: convos.map((conv) => {
        const assistant = assistantsMap.get(conv.assistantId);
        const convoMessages = allMessages.filter((m) => m.conversationId === conv.id);

        return {
          id: conv.id,
          title: conv.title,
          assistant: assistant?.name || "Unknown",
          createdAt: typeof conv.createdAt === "string" ? conv.createdAt : new Date(conv.createdAt).toISOString(),
          messages: convoMessages.map((msg) => ({
            role: msg.role,
            parts: msg.parts,
            metadata: msg.metadata,
            createdAt: typeof msg.createdAt === "string" ? msg.createdAt : new Date(msg.createdAt).toISOString(),
          })),
        };
      }),
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
