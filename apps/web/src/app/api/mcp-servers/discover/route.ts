import { NextRequest } from "next/server";
import { validateUserTransport } from "@llm-chatter/ai-runtime";
import { discoverMcpTools } from "@llm-chatter/ai-runtime";
import type { DiscoverMcpToolsInput } from "@llm-chatter/services";

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as DiscoverMcpToolsInput;

    const validationError = validateUserTransport(input);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tools = await discoverMcpTools(input);
    return Response.json(tools);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("MCP discover error:", message);
    return new Response(
      JSON.stringify({ error: `Failed to connect: ${message.slice(0, 300)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
