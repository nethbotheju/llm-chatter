import { NextResponse } from "next/server";
import {
  fetchCatalogBlob,
  projectProviderModels,
  isImportableProvider,
} from "@llm-chatter/ai-runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const blob = await fetchCatalogBlob();
    const provider = blob[id];

    if (!provider || !isImportableProvider(provider)) {
      return NextResponse.json(
        { error: "Provider not found in catalog" },
        { status: 404 },
      );
    }

    return NextResponse.json(projectProviderModels(provider));
  } catch (error) {
    console.error("Failed to list catalog models:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog models" },
      { status: 500 },
    );
  }
}
