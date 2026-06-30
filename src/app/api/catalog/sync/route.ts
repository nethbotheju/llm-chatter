import { NextRequest, NextResponse } from "next/server";
import { syncProvider, syncStaleProviders } from "@/lib/catalog";
import { createWebCatalogStore } from "@/lib/catalog/server";

const SYNC_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const store = createWebCatalogStore();

    if (body?.all) {
      const results = await syncStaleProviders(store, SYNC_THRESHOLD_MS);
      return NextResponse.json(results);
    }

    const { providerId } = body;
    if (!providerId) {
      return NextResponse.json(
        { error: "providerId is required (or { all: true })" },
        { status: 400 },
      );
    }

    const result = await syncProvider(store, { providerId });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to sync providers";
    console.error("Catalog sync error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
