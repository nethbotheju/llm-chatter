import { NextRequest } from "next/server";
import { validateUserTransport } from "@/lib/mcp/server-config";
import { discoverMcpTools } from "@/lib/mcp/discover";
import type { DiscoverMcpToolsInput } from "@/lib/services/types";

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
