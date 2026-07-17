import { ipcMain } from "electron";
import { getDb } from "../db/client";
import { appConfig } from "@llm-chatter/db";
import { eq } from "drizzle-orm";

export function registerAppConfigIpc() {
  ipcMain.handle("appConfig:getAll", async () => {
    const db = getDb();
    const rows = await db.select().from(appConfig);
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
      const db = getDb();
      const now = new Date().toISOString();
      await db.insert(appConfig)
        .values({
          key: input.key,
          value: JSON.stringify(input.value),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: appConfig.key,
          set: {
            value: JSON.stringify(input.value),
            updatedAt: now,
          },
        });
    },
  );

  ipcMain.handle("appConfig:remove", async (_e, key: string) => {
    const db = getDb();
    await db.delete(appConfig).where(eq(appConfig.key, key));
  });
}
