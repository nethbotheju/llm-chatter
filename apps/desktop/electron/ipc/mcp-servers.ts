import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { mcpServers } from "@llm-chatter/db";
import { eq, desc, asc } from "drizzle-orm";
import { encrypt, decrypt } from "../db/encryption";
import { nanoid } from "nanoid";
import { type ConfigCipher } from "@llm-chatter/ai-runtime";
import type {
  CreateMcpServerInputDTO as CreateMcpServerInput,
  UpdateMcpServerInputDTO as UpdateMcpServerInput,
  DiscoverMcpToolsInputDTO as DiscoverMcpToolsInput,
} from "@llm-chatter/contracts";
import {
  slugify,
  validateUserTransport,
  buildCreateData,
  buildUpdateData,
  toMcpServerDTO,
} from "@llm-chatter/ai-runtime";
import { discoverMcpTools } from "@llm-chatter/ai-runtime";

const cipher: ConfigCipher = { encrypt, decrypt };

export function registerMcpServersIpc() {
  ipcMain.handle("mcpServers:getAll", async () => {
    const db = getDb();
    const rows = await db.select().from(mcpServers).orderBy(desc(mcpServers.isBuiltin), asc(mcpServers.createdAt));
    return rows.map(toMcpServerDTO);
  });

  ipcMain.handle("mcpServers:create", async (_e, input: CreateMcpServerInput) => {
    const error = validateUserTransport(input);
    if (error) throw new Error(error);

    const db = getDb();
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

    return toMcpServerDTO(created);
  });

  ipcMain.handle("mcpServers:update", async (_e, input: UpdateMcpServerInput) => {
    const db = getDb();
    const existing = await db.select().from(mcpServers).where(eq(mcpServers.id, input.id)).get();
    if (!existing) throw new Error("MCP server not found");

    const data = buildUpdateData(existing, input, cipher);
    const updated = await db.update(mcpServers)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(mcpServers.id, input.id))
      .returning()
      .get();

    return toMcpServerDTO(updated);
  });

  ipcMain.handle("mcpServers:delete", async (_e, id: string) => {
    const db = getDb();
    const existing = await db.select().from(mcpServers).where(eq(mcpServers.id, id)).get();
    if (!existing) throw new Error("MCP server not found");
    if (existing.isBuiltin) throw new Error("Built-in servers cannot be deleted");
    await db.delete(mcpServers).where(eq(mcpServers.id, id));
  });

  ipcMain.handle("mcpServers:discover", async (_e, input: DiscoverMcpToolsInput) => {
    const error = validateUserTransport(input);
    if (error) throw new Error(error);
    return discoverMcpTools(input);
  });
}
