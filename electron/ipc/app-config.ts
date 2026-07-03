import { ipcMain } from "electron";
import { getPrisma } from "../db/client";

export function registerAppConfigIpc() {
  ipcMain.handle("appConfig:getAll", async () => {
    const prisma = getPrisma();
    const rows = await prisma.appConfig.findMany();
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        map[row.key] = JSON.parse(row.value);
      } catch {
        map[row.key] = row.value;
      }
    }
    return map;
  });

  ipcMain.handle(
    "appConfig:set",
    async (_e, input: { key: string; value: unknown }) => {
      const prisma = getPrisma();
      await prisma.appConfig.upsert({
        where: { key: input.key },
        create: { key: input.key, value: JSON.stringify(input.value) },
        update: { value: JSON.stringify(input.value) },
      });
    },
  );

  ipcMain.handle("appConfig:remove", async (_e, key: string) => {
    const prisma = getPrisma();
    await prisma.appConfig.deleteMany({ where: { key } });
  });
}
