import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@llm-chatter/db";
import { mcpServers } from "@llm-chatter/db";
import { eq, desc, asc } from "drizzle-orm";
import { encrypt, decrypt } from "@llm-chatter/ai-runtime";
import {
  type ConfigCipher,
} from "@llm-chatter/ai-runtime";
import type { CreateMcpServerInput, UpdateMcpServerInput } from "@llm-chatter/services";
import {
  slugify,
  validateUserTransport,
  buildCreateData,
  buildUpdateData,
  toMcpServerDTO,
} from "@llm-chatter/ai-runtime";

const cipher: ConfigCipher = { encrypt, decrypt };

export async function GET() {
  const rows = await db.select().from(mcpServers).orderBy(desc(mcpServers.isBuiltin), asc(mcpServers.createdAt));
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
    while (await db.select().from(mcpServers).where(eq(mcpServers.slug, slug)).get()) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const now = new Date().toISOString();
    const created = await db.insert(mcpServers).values({
      id: nanoid(),
      ...buildCreateData(input, slug, cipher),
      createdAt: now,
      updatedAt: now,
    }).returning().get();

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

    const existing = await db.select().from(mcpServers).where(eq(mcpServers.id, id)).get();
    if (!existing) {
      return new Response(JSON.stringify({ error: "MCP server not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = buildUpdateData(existing, input, cipher);
    const updated = await db.update(mcpServers)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(mcpServers.id, id))
      .returning()
      .get();

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

    const existing = await db.select().from(mcpServers).where(eq(mcpServers.id, id)).get();
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

    await db.delete(mcpServers).where(eq(mcpServers.id, id));
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("MCP server delete error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete MCP server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
