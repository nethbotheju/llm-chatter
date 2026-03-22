import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getProviderClient } from "@/lib/ai/client";
import { generateText } from "ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, name, type, baseUrl, apiKey } = body;

    let provider;
    let testApiKey = apiKey;
    let testType = type;
    let testBaseUrl = baseUrl;

    // If providerId is provided, fetch existing provider
    if (providerId) {
      provider = await prisma.provider.findUnique({ where: { id: providerId } });
      if (!provider) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      }
      // Use provided values or fall back to existing
      testType = type ?? provider.type;
      testBaseUrl = baseUrl ?? provider.baseUrl;
      // If apiKey not provided, we can't validate (encrypted)
      if (!testApiKey) {
        return NextResponse.json({ 
          valid: false, 
          error: "API key required for validation" 
        });
      }
    } else {
      // New provider validation
      if (!testType) {
        return NextResponse.json({ error: "Provider type is required" }, { status: 400 });
      }
    }

    // Create a temporary provider object for validation
    const tempProvider = {
      id: "temp",
      name: name ?? "test",
      type: testType,
      baseUrl: testBaseUrl || null,
      apiKeyEncrypted: null,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const client = getProviderClient({
        ...tempProvider,
        apiKeyEncrypted: testApiKey,
      } as Parameters<typeof getProviderClient>[0]);

      // Get a test model based on provider type
      const testModels: Record<string, string> = {
        openai: "gpt-4o-mini",
        "openai-compatible": "gpt-3.5-turbo",
        anthropic: "claude-3-haiku-20240307",
        "anthropic-compatible": "claude-3-haiku-20240307",
        google: "gemini-1.5-flash",
      };

      const modelId = testModels[testType] || "gpt-4o-mini";
      const model = client(modelId);

      await generateText({
        model,
        prompt: "Reply with just: ok",
      });

      return NextResponse.json({ valid: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation failed";
      return NextResponse.json({ valid: false, error: message });
    }
  } catch (error) {
    console.error("Provider validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate provider" },
      { status: 500 }
    );
  }
}
