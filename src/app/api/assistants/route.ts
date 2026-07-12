import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { assistants } from "@/lib/db/schema";
import { eq, desc, not, count } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (id) {
    const assistant = await db.select().from(assistants).where(eq(assistants.id, id)).get();
    if (!assistant) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }
    return NextResponse.json(assistant);
  }

  const allAssistants = await db.select().from(assistants).orderBy(desc(assistants.isDefault));
  return NextResponse.json(allAssistants);
}

export async function POST(request: NextRequest) {
  try {
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
      await db.update(assistants)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(assistants.isDefault, true));
    }

    const now = new Date().toISOString();
    const assistant = await db.insert(assistants).values({
      id: nanoid(),
      name,
      systemPrompt,
      temperature: temperature ?? 0.7,
      topP: topP ?? 1.0,
      isDefault: isDefault ?? false,
      enabled: enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    return NextResponse.json(assistant);
  } catch (error) {
    console.error("Failed to create assistant:", error);
    return NextResponse.json(
      { error: "Failed to create assistant" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, systemPrompt, temperature, topP, isDefault, enabled, image } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await db.select().from(assistants).where(eq(assistants.id, id)).get();
    if (!existing) {
      return NextResponse.json({ error: "Assistant not found" }, { status: 404 });
    }

    // If setting as default, unset others
    if (isDefault && !existing.isDefault) {
      await db.update(assistants)
        .set({ isDefault: false, updatedAt: new Date().toISOString() })
        .where(eq(assistants.isDefault, true));
    }

    const assistant = await db.update(assistants)
      .set({
        name: name ?? existing.name,
        systemPrompt: systemPrompt ?? existing.systemPrompt,
        temperature: temperature ?? existing.temperature,
        topP: topP ?? existing.topP,
        isDefault: isDefault ?? existing.isDefault,
        enabled: enabled ?? existing.enabled,
        image: image !== undefined ? image : existing.image,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assistants.id, id))
      .returning()
      .get();

    return NextResponse.json(assistant);
  } catch (error) {
    console.error("Failed to update assistant:", error);
    return NextResponse.json(
      { error: "Failed to update assistant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Check if this is the only assistant
    const countResult = await db.select({ value: count() }).from(assistants).get();
    const assistantCount = countResult?.value ?? 0;
    if (assistantCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last assistant" },
        { status: 400 }
      );
    }

    // If deleting the default, set another as default
    const assistant = await db.select().from(assistants).where(eq(assistants.id, id)).get();
    if (assistant?.isDefault) {
      const another = await db.select().from(assistants).where(not(eq(assistants.id, id))).get();
      if (another) {
        await db.update(assistants)
          .set({ isDefault: true, updatedAt: new Date().toISOString() })
          .where(eq(assistants.id, another.id));
      }
    }

    await db.delete(assistants).where(eq(assistants.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete assistant:", error);
    return NextResponse.json(
      { error: "Failed to delete assistant" },
      { status: 500 }
    );
  }
}
