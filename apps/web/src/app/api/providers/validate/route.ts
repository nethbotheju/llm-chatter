import { NextRequest, NextResponse } from "next/server";
import { db, providers } from "@llm-chatter/db";
import { eq } from "drizzle-orm";
import { getRuntimeModel } from "@llm-chatter/ai-runtime";
import { generateText } from "ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, type, baseUrl, apiKey } = body;

    let testApiKey = apiKey;
    let testType = type;
    let testBaseUrl = baseUrl;

    if (providerId) {
      const provider = await db.select().from(providers).where(eq(providers.id, providerId)).get();
      if (!provider) {
        return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      }
      testType = type ?? provider.type;
      testBaseUrl = baseUrl ?? provider.baseUrl;
      if (!testApiKey) {
        return NextResponse.json({
          valid: false,
          error: "API key required for validation",
        });
      }
    } else {
      if (!testType) {
        return NextResponse.json({ error: "Provider type is required" }, { status: 400 });
      }
    }

    const testModels: Record<string, string> = {
      openai: "gpt-4o-mini",
      "openai-compatible": "gpt-3.5-turbo",
      anthropic: "claude-3-haiku-20240307",
      "anthropic-compatible": "claude-3-haiku-20240307",
      google: "gemini-1.5-flash",
    };

    try {
      const modelId = testModels[testType] || "gpt-4o-mini";
      const model = getRuntimeModel({
        model: modelId,
        provider: {
          type: testType,
          apiKey: testApiKey,
          baseUrl: testBaseUrl ?? null,
        },
      });

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
      { status: 500 },
    );
  }
}
