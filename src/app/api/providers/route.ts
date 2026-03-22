import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { nanoid } from "nanoid";
import { encrypt } from "@/lib/ai/encryption";

function sanitizeProvider(provider: {
  apiKeyEncrypted: string | null;
  [key: string]: unknown;
}) {
  return {
    ...provider,
    apiKeyEncrypted: undefined,
    hasApiKey: !!provider.apiKeyEncrypted,
  };
}

export async function GET() {
  const providers = await prisma.provider.findMany({
    include: {
      models: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(providers.map(sanitizeProvider));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, baseUrl, apiKey, enabled } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const provider = await prisma.provider.create({
      data: {
        id: nanoid(),
        name,
        type,
        baseUrl: baseUrl || null,
        apiKeyEncrypted: apiKey ? encrypt(apiKey) : null,
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json(sanitizeProvider(provider));
  } catch (error) {
    console.error("Failed to create provider:", error);
    return NextResponse.json(
      { error: "Failed to create provider" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, baseUrl, apiKey, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    }

    const existingProvider = await prisma.provider.findUnique({ where: { id } });
    if (!existingProvider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      type?: string;
      baseUrl?: string | null;
      apiKeyEncrypted?: string | null;
      enabled?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl || null;
    if (apiKey !== undefined) {
      updateData.apiKeyEncrypted = apiKey ? encrypt(apiKey) : null;
    }
    if (enabled !== undefined) updateData.enabled = enabled;

    const provider = await prisma.provider.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(sanitizeProvider(provider));
  } catch (error) {
    console.error("Failed to update provider:", error);
    return NextResponse.json(
      { error: "Failed to update provider" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Provider ID is required" }, { status: 400 });
    }

    await prisma.provider.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete provider:", error);
    return NextResponse.json(
      { error: "Failed to delete provider" },
      { status: 500 }
    );
  }
}
