import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { nanoid } from "nanoid";

export function registerAssistantsIpc() {
  ipcMain.handle("assistants:getAll", async () => {
    const prisma = getPrisma();
    return prisma.assistant.findMany({
      orderBy: { isDefault: "desc" },
    });
  });

  ipcMain.handle("assistants:get", async (_e, id: string) => {
    const prisma = getPrisma();
    return prisma.assistant.findUniqueOrThrow({ where: { id } });
  });

  ipcMain.handle("assistants:create", async (_e, input: {
    name: string;
    systemPrompt: string;
    temperature?: number;
    topP?: number;
    isDefault?: boolean;
    enabled?: boolean;
  }) => {
    const prisma = getPrisma();
    const isDefault = input.isDefault ?? false;

    if (isDefault) {
      await prisma.assistant.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.assistant.create({
      data: {
        id: nanoid(),
        name: input.name,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature ?? 0.7,
        topP: input.topP ?? 1.0,
        isDefault,
        enabled: input.enabled ?? true,
      },
    });
  });

  ipcMain.handle("assistants:update", async (_e, input: {
    id: string;
    name?: string;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
    isDefault?: boolean;
    enabled?: boolean;
    image?: string | null;
  }) => {
    const prisma = getPrisma();

    if (input.isDefault === true) {
      await prisma.assistant.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt;
    if (input.temperature !== undefined) data.temperature = input.temperature;
    if (input.topP !== undefined) data.topP = input.topP;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.image !== undefined) data.image = input.image;

    return prisma.assistant.update({
      where: { id: input.id },
      data,
    });
  });

  ipcMain.handle("assistants:delete", async (_e, id: string) => {
    const prisma = getPrisma();

    const count = await prisma.assistant.count();
    if (count <= 1) {
      throw new Error("Cannot delete the last assistant");
    }

    const assistant = await prisma.assistant.findUniqueOrThrow({ where: { id } });

    if (assistant.isDefault) {
      const nextDefault = await prisma.assistant.findFirst({
        where: { id: { not: id } },
      });
      if (nextDefault) {
        await prisma.assistant.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    await prisma.assistant.delete({ where: { id } });
  });
}
