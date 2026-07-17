import { NextRequest, NextResponse } from "next/server";
import { getProvidersList } from "@llm-chatter/ai-runtime";
import { getWebCatalogDir } from "@llm-chatter/ai-runtime";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase();

    const providers = await getProvidersList(getWebCatalogDir());

    const filtered = query
      ? providers.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.catalogId.toLowerCase().includes(query),
        )
      : providers;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Failed to list catalog providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch provider catalog" },
      { status: 500 },
    );
  }
}
