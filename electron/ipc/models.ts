import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { nanoid } from "nanoid";

export function registerModelsIpc() {
  ipcMain.handle("models:getAll", async (_e, args?: {
    providerId?: string;
    includeDisabled?: boolean;
  }) => {
    const prisma = getPrisma();
    const where: Record<string, unknown> = {};
    if (args?.providerId) where.providerId = args.providerId;
    if (!args?.includeDisabled) {
      where.enabled = true;
      where.provider = { enabled: true };
    }
    return prisma.model.findMany({
      where,
      include: {
        provider: { select: { id: true, name: true, type: true, enabled: true } },
      },
      orderBy: [{ provider: { name: "asc" } }, { name: "asc" }],
    });
  });

  ipcMain.handle("models:create", async (_e, input: {
    name: string;
    providerId: string;
    capabilities?: string[];
    enabled?: boolean;
  }) => {
    const prisma = getPrisma();
    return prisma.model.create({
      data: {
        id: nanoid(),
        name: input.name,
        providerId: input.providerId,
        capabilities: JSON.stringify(input.capabilities || ["chat"]),
        enabled: input.enabled ?? true,
      },
      include: {
        provider: { select: { id: true, name: true, type: true, enabled: true } },
      },
    });
  });

  ipcMain.handle("models:update", async (_e, input: {
    id: string;
    name?: string;
    capabilities?: string[];
    enabled?: boolean;
  }) => {
    const prisma = getPrisma();
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.capabilities !== undefined) data.capabilities = JSON.stringify(input.capabilities);
    if (input.enabled !== undefined) data.enabled = input.enabled;
    return prisma.model.update({
      where: { id: input.id },
      data,
      include: {
        provider: { select: { id: true, name: true, type: true, enabled: true } },
      },
    });
  });

  ipcMain.handle("models:delete", async (_e, id: string) => {
    const prisma = getPrisma();
    await prisma.model.delete({ where: { id } });
  });
}
