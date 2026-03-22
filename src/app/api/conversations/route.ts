import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        assistant: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  }

  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { assistantId, title } = body;

  // Get default assistant if not specified
  let finalAssistantId = assistantId;
  if (!finalAssistantId) {
    const defaultAssistant = await prisma.assistant.findFirst({
      where: { isDefault: true },
    });
    finalAssistantId = defaultAssistant?.id;
  }

  if (!finalAssistantId) {
    return NextResponse.json(
      { error: "No assistant available" },
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.create({
    data: {
      id: nanoid(),
      title: title || null,
      assistantId: finalAssistantId,
    },
    include: {
      assistant: true,
    },
  });

  return NextResponse.json(conversation);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, title } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title },
  });

  return NextResponse.json(conversation);
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const deleteAll = searchParams.get("all");

  if (deleteAll === "true") {
    // Delete all conversations
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.conversation.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
