import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { encrypt, decrypt } from "../db/encryption";
import { nanoid } from "nanoid";
import { type ConfigCipher } from "../../src/lib/builtin-tools";
import type {
  CreateMcpServerInputDTO as CreateMcpServerInput,
  UpdateMcpServerInputDTO as UpdateMcpServerInput,
  DiscoverMcpToolsInputDTO as DiscoverMcpToolsInput,
} from "../../src/lib/contracts";
import {
  slugify,
  validateUserTransport,
  buildCreateData,
  buildUpdateData,
  toMcpServerDTO,
} from "../../src/lib/mcp/server-config";
import { discoverMcpTools } from "../../src/lib/mcp/discover";

const cipher: ConfigCipher = { encrypt, decrypt };

export function registerMcpServersIpc() {
  ipcMain.handle("mcpServers:getAll", async () => {
    const prisma = getPrisma();
    const rows = await prisma.mcpServer.findMany({
      orderBy: [{ isBuiltin: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(toMcpServerDTO);
  });

  ipcMain.handle("mcpServers:create", async (_e, input: CreateMcpServerInput) => {
    const error = validateUserTransport(input);
    if (error) throw new Error(error);

    const prisma = getPrisma();
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
    return toMcpServerDTO(created);
  });

  ipcMain.handle("mcpServers:update", async (_e, input: UpdateMcpServerInput) => {
    const prisma = getPrisma();
    const existing = await prisma.mcpServer.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error("MCP server not found");

    const data = buildUpdateData(existing, input, cipher);
    const updated = await prisma.mcpServer.update({ where: { id: input.id }, data });
    return toMcpServerDTO(updated);
  });

  ipcMain.handle("mcpServers:delete", async (_e, id: string) => {
    const prisma = getPrisma();
    const existing = await prisma.mcpServer.findUnique({ where: { id } });
    if (!existing) throw new Error("MCP server not found");
    if (existing.isBuiltin) throw new Error("Built-in servers cannot be deleted");
    await prisma.mcpServer.delete({ where: { id } });
  });

  ipcMain.handle("mcpServers:discover", async (_e, input: DiscoverMcpToolsInput) => {
    const error = validateUserTransport(input);
    if (error) throw new Error(error);
    return discoverMcpTools(input);
  });
}
