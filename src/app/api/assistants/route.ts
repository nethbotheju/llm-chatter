import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const assistant = await prisma.assistant.findUnique({
      where: { id },
    });
    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }
    return NextResponse.json(assistant);
  }

  const assistants = await prisma.assistant.findMany({
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json(assistants);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, systemPrompt, temperature, topP, isDefault, enabled } = body;

  if (!name || !systemPrompt) {
    return NextResponse.json(
      { error: "Name and system prompt are required" },
      { status: 400 }
    );
  }

  // If this is set as default, unset any existing default
  if (isDefault) {
    await prisma.assistant.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const assistant = await prisma.assistant.create({
    data: {
      id: nanoid(),
      name,
      systemPrompt,
      temperature: temperature ?? 0.7,
      topP: topP ?? 1.0,
      isDefault: isDefault ?? false,
      enabled: enabled ?? true,
    },
  });

  return NextResponse.json(assistant);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, name, systemPrompt, temperature, topP, isDefault, enabled, image } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const existing = await prisma.assistant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
  }

  // If setting as default, unset others
  if (isDefault && !existing.isDefault) {
    await prisma.assistant.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const assistant = await prisma.assistant.update({
    where: { id },
    data: {
      name: name ?? existing.name,
      systemPrompt: systemPrompt ?? existing.systemPrompt,
      temperature: temperature ?? existing.temperature,
      topP: topP ?? existing.topP,
      isDefault: isDefault ?? existing.isDefault,
      enabled: enabled ?? existing.enabled,
      image: image !== undefined ? image : existing.image,
    },
  });

  return NextResponse.json(assistant);
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // Check if this is the only assistant
  const count = await prisma.assistant.count();
  if (count <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the last assistant" },
      { status: 400 }
    );
  }

  // If deleting the default, set another as default
  const assistant = await prisma.assistant.findUnique({ where: { id } });
  if (assistant?.isDefault) {
    const another = await prisma.assistant.findFirst({
      where: { id: { not: id } },
    });
    if (another) {
      await prisma.assistant.update({
        where: { id: another.id },
        data: { isDefault: true },
      });
    }
  }

  await prisma.assistant.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
