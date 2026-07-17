import { NextRequest, NextResponse } from "next/server";
import { importProvider } from "@llm-chatter/ai-runtime";
import { createWebCatalogStore } from "@llm-chatter/ai-runtime";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { catalogId, apiKey, baseUrlOverride } = body;

    if (!catalogId || !apiKey) {
      return NextResponse.json(
        { error: "catalogId and apiKey are required" },
        { status: 400 },
      );
    }

    const result = await importProvider(createWebCatalogStore(), {
      catalogId,
      apiKey,
      baseUrlOverride,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to import provider";
    console.error("Catalog import error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
