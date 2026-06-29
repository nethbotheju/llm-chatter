import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db/client";
import { encrypt, decrypt } from "@/lib/ai/encryption";
import {
  type ConfigCipher,
} from "@/lib/builtin-tools";
import type { CreateMcpServerInput, UpdateMcpServerInput } from "@/lib/services/types";
import {
  slugify,
  validateUserTransport,
  buildCreateData,
  buildUpdateData,
  toMcpServerDTO,
  toResolvedToolSource,
} from "@/lib/mcp/server-config";

const cipher: ConfigCipher = { encrypt, decrypt };

export async function GET() {
  const rows = await prisma.mcpServer.findMany({
    orderBy: [{ isBuiltin: "desc" }, { createdAt: "asc" }],
  });
  return Response.json(rows.map(toMcpServerDTO));
}

export async function POST(request: NextRequest) {
  try {
    const input = (await request.json()) as CreateMcpServerInput;

    const validationError = validateUserTransport(input);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseSlug = slugify(input.name);
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.mcpServer.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const created = await prisma.mcpServer.create({
      data: { id: nanoid(), ...buildCreateData(input, slug, cipher) },
    });
    return Response.json(toMcpServerDTO(created));
  } catch (error) {
    console.error("MCP server create error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create MCP server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const input = (await request.json()) as UpdateMcpServerInput;
    const { id } = input;
    if (!id) {
      return new Response(JSON.stringify({ error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await prisma.mcpServer.findUnique({ where: { id } });
    if (!existing) {
      return new Response(JSON.stringify({ error: "MCP server not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = buildUpdateData(existing, input, cipher);
    const updated = await prisma.mcpServer.update({ where: { id }, data });
    return Response.json(toMcpServerDTO(updated));
  } catch (error) {
    console.error("MCP server update error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update MCP server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return new Response(JSON.stringify({ error: "ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await prisma.mcpServer.findUnique({ where: { id } });
    if (!existing) {
      return new Response(JSON.stringify({ error: "MCP server not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (existing.isBuiltin) {
      return new Response(
        JSON.stringify({ error: "Built-in servers cannot be deleted" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await prisma.mcpServer.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("MCP server delete error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete MCP server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
