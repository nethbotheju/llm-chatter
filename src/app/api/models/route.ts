import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { models, providers } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  const includeDisabled = searchParams.get("all") === "true";

  const conditions = [];
  
  if (providerId) {
    conditions.push(eq(models.providerId, providerId));
  }
  
  if (!includeDisabled) {
    conditions.push(eq(models.enabled, true));
    conditions.push(eq(providers.enabled, true));
  }

  let query = db.select({
    id: models.id,
    name: models.name,
    providerId: models.providerId,
    capabilities: models.capabilities,
    catalogModelId: models.catalogModelId,
    metadata: models.metadata,
    enabled: models.enabled,
    createdAt: models.createdAt,
    updatedAt: models.updatedAt,
    provider: {
      id: providers.id,
      name: providers.name,
      type: providers.type,
      enabled: providers.enabled,
    }
  })
  .from(models)
  .innerJoin(providers, eq(models.providerId, providers.id));

  if (conditions.length > 0) {
    query.where(and(...conditions));
  }

  query.orderBy(asc(providers.name), asc(models.name));

  const result = await query;
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, providerId, capabilities, metadata, enabled } = body;

    if (!name || !providerId) {
      return NextResponse.json(
        { error: "Name and providerId are required" },
        { status: 400 }
      );
    }

    // Check if model already exists for this provider
    const existing = await db.select().from(models)
      .where(and(eq(models.providerId, providerId), eq(models.name, name)))
      .get();

    if (existing) {
      return NextResponse.json(
        { error: "Model with this name already exists for this provider" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const createdModel = await db.insert(models).values({
      id: nanoid(),
      name,
      providerId,
      capabilities: JSON.stringify(capabilities || ["chat"]),
      metadata: metadata ?? null,
      enabled: enabled ?? true,
      createdAt: now,
      updatedAt: now,
    }).returning().get();

    const providerObj = await db.select({
      id: providers.id,
      name: providers.name,
      type: providers.type,
      enabled: providers.enabled,
    }).from(providers).where(eq(providers.id, providerId)).get();

    const model = {
      ...createdModel,
      provider: providerObj,
    };

    return NextResponse.json(model);
  } catch (error) {
    console.error("Failed to create model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, capabilities, metadata, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
    }

    const existingModel = await db.select().from(models).where(eq(models.id, id)).get();
    if (!existingModel) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      capabilities?: string;
      metadata?: string | null;
      enabled?: boolean;
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (capabilities !== undefined) {
      updateData.capabilities = JSON.stringify(capabilities);
    }
    if (metadata !== undefined) updateData.metadata = metadata;
    if (enabled !== undefined) updateData.enabled = enabled;

    const updatedModel = await db.update(models)
      .set(updateData)
      .where(eq(models.id, id))
      .returning()
      .get();

    const providerObj = await db.select({
      id: providers.id,
      name: providers.name,
      type: providers.type,
      enabled: providers.enabled,
    }).from(providers).where(eq(providers.id, updatedModel.providerId)).get();

    const model = {
      ...updatedModel,
      provider: providerObj,
    };

    return NextResponse.json(model);
  } catch (error) {
    console.error("Failed to update model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
    }

    await db.delete(models).where(eq(models.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
