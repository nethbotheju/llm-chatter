import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { nanoid } from "nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const body = await request.json();
  const { role, content, thinking, attachments } = body;

  const message = await prisma.message.create({
    data: {
      id: nanoid(),
      conversationId,
      role,
      content,
      thinking,
      attachments: attachments ? JSON.stringify(attachments) : null,
    },
  });

  // Update conversation's updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const body = await request.json();
  const { messageId, content } = body;

  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  const message = await prisma.message.update({
    where: { id: messageId, conversationId },
    data: { content },
  });

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

  await prisma.message.delete({
    where: { id: messageId, conversationId },
  });

  return NextResponse.json({ success: true });
}
