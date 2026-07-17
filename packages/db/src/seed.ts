import type { DbClient } from "./client";
import { providers, models, assistants, mcpServers } from "./schema";
import { count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { seedProviders, seedAssistants, seedMcpServers } from "./seed-data";

export async function seedDatabase(db: DbClient) {
  const providerCountResult = db.select({ value: count() }).from(providers).get();
  const providerCount = providerCountResult?.value ?? 0;

  if (providerCount === 0) {
    const now = new Date().toISOString();
    for (const provider of seedProviders) {
      const providerId = nanoid();
      db.insert(providers)
        .values({
          id: providerId,
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      for (const model of provider.models) {
        db.insert(models)
          .values({
            id: nanoid(),
            name: model.name,
            providerId,
            capabilities: JSON.stringify(model.capabilities),
            enabled: true,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    }

    for (const assistant of seedAssistants) {
      db.insert(assistants)
        .values({
          id: nanoid(),
          name: assistant.name,
          systemPrompt: assistant.systemPrompt,
          temperature: assistant.temperature,
          topP: assistant.topP,
          isDefault: assistant.isDefault,
          enabled: true,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  }

  const now = new Date().toISOString();
  for (const mcp of seedMcpServers) {
    const existing = db.select().from(mcpServers).where(eq(mcpServers.slug, mcp.slug)).get();
    if (!existing) {
      db.insert(mcpServers)
        .values({
          id: nanoid(),
          name: mcp.name,
          slug: mcp.slug,
          transport: mcp.transport,
          config: JSON.stringify(mcp.config),
          enabled: mcp.enabled,
          isBuiltin: mcp.isBuiltin,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  }
}
