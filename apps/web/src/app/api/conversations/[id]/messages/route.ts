import { NextRequest, NextResponse } from "next/server";
import { db } from "@llm-chatter/db";
import { messages, conversations } from "@llm-chatter/db";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const body = await request.json();
  const { role, parts, metadata } = body;

  const now = new Date().toISOString();
  const message = await db.insert(messages).values({
    id: nanoid(),
    conversationId,
    role,
    parts,
    metadata: metadata ?? null,
    createdAt: now,
  }).returning().get();

  await db.update(conversations)
    .set({ updatedAt: now })
    .where(eq(conversations.id, conversationId));

  return NextResponse.json(message);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const body = await request.json();
  const { messageId, parts } = body;

  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  const message = await db.update(messages)
    .set({ parts })
    .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
    .returning()
    .get();

  return NextResponse.json(message);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");

  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  await db.delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)));

  return NextResponse.json({ success: true });
}
