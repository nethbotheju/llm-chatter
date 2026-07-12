import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { conversations, messages, assistants } from "@/lib/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const conversation = await db.select().from(conversations).where(eq(conversations.id, id)).get();

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const convoMessages = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    const convoAssistant = await db.select().from(assistants).where(eq(assistants.id, conversation.assistantId)).get();

    const result = {
      ...conversation,
      messages: convoMessages,
      assistant: convoAssistant,
    };

    return NextResponse.json(result);
  }

  const allConvos = await db.select({
    id: conversations.id,
    title: conversations.title,
    assistantId: conversations.assistantId,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
    messageCount: sql<number>`(select count(*) from ${messages} where ${messages.conversationId} = ${conversations.id})`
  }).from(conversations).orderBy(desc(conversations.updatedAt));

  const result = allConvos.map(c => ({
    id: c.id,
    title: c.title,
    assistantId: c.assistantId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    _count: {
      messages: Number(c.messageCount)
    }
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assistantId, title } = body;

    // Get default assistant if not specified
    let finalAssistantId = assistantId;
    if (!finalAssistantId) {
      const defaultAssistant = await db.select().from(assistants).where(eq(assistants.isDefault, true)).get();
      finalAssistantId = defaultAssistant?.id;
    }

    if (!finalAssistantId) {
      return NextResponse.json(
        { error: "No assistant available" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const createdConvo = await db.insert(conversations).values({
      id: nanoid(),
      title: title || null,
      assistantId: finalAssistantId,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    const convoAssistant = await db.select().from(assistants).where(eq(assistants.id, finalAssistantId)).get();

    const result = {
      ...createdConvo,
      messages: [],
      assistant: convoAssistant,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const updatedConvo = await db.update(conversations)
      .set({ title, updatedAt: new Date().toISOString() })
      .where(eq(conversations.id, id))
      .returning()
      .get();

    const convoMessages = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    const convoAssistant = await db.select().from(assistants).where(eq(assistants.id, updatedConvo.assistantId)).get();

    const result = {
      ...updatedConvo,
      messages: convoMessages,
      assistant: convoAssistant,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const deleteAll = searchParams.get("all");

    if (deleteAll === "true") {
      // Delete all conversations
      await db.delete(messages);
      await db.delete(conversations);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await db.delete(conversations).where(eq(conversations.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
