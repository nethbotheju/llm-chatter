import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");
  const includeDisabled = searchParams.get("all") === "true";

  const where: { enabled?: boolean; providerId?: string; provider?: { enabled: boolean } } = {};
  
  if (providerId) {
    where.providerId = providerId;
  }
  
  if (!includeDisabled) {
    where.enabled = true;
    where.provider = { enabled: true };
  }

  const models = await prisma.model.findMany({
    where,
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          type: true,
          enabled: true,
        },
      },
    },
    orderBy: [{ provider: { name: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(models);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, providerId, capabilities, enabled } = body;

    if (!name || !providerId) {
      return NextResponse.json(
        { error: "Name and providerId are required" },
        { status: 400 }
      );
    }

    // Check if model already exists for this provider
    const existing = await prisma.model.findUnique({
      where: {
        providerId_name: { providerId, name },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Model with this name already exists for this provider" },
        { status: 400 }
      );
    }

    const model = await prisma.model.create({
      data: {
        id: nanoid(),
        name,
        providerId,
        capabilities: JSON.stringify(capabilities || ["chat"]),
        enabled: enabled ?? true,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            enabled: true,
          },
        },
      },
    });

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
    const { id, name, capabilities, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
    }

    const existingModel = await prisma.model.findUnique({ where: { id } });
    if (!existingModel) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      capabilities?: string;
      enabled?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (capabilities !== undefined) {
      updateData.capabilities = JSON.stringify(capabilities);
    }
    if (enabled !== undefined) updateData.enabled = enabled;

    const model = await prisma.model.update({
      where: { id },
      data: updateData,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            enabled: true,
          },
        },
      },
    });

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

    await prisma.model.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
