import { db } from "../src/lib/db/client";
import { providers, models, assistants, mcpServers } from "../src/lib/db/schema";
import { count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { seedProviders, seedAssistants, seedMcpServers } from "./seed-data";

async function main() {
  console.log("Seeding database...");

  const existingProvidersResult = await db.select({ value: count() }).from(providers);
  const existingProviders = existingProvidersResult[0]?.value ?? 0;

  if (existingProviders > 0) {
    console.log("Providers already seeded, skipping provider/assistant seed...");
  } else {
    const now = new Date().toISOString();
    for (const provider of seedProviders) {
      const providerId = nanoid();
      await db.insert(providers).values({
        id: providerId,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });

      for (const model of provider.models) {
        await db.insert(models).values({
          id: nanoid(),
          name: model.name,
          providerId,
          capabilities: JSON.stringify(model.capabilities),
          enabled: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      console.log(`Created provider: ${provider.name}`);
    }

    for (const assistant of seedAssistants) {
      await db.insert(assistants).values({
        id: nanoid(),
        name: assistant.name,
        systemPrompt: assistant.systemPrompt,
        temperature: assistant.temperature,
        topP: assistant.topP,
        isDefault: assistant.isDefault,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`Created assistant: ${assistant.name}`);
    }
  }

  const now = new Date().toISOString();
  for (const mcp of seedMcpServers) {
    // Check if MCP server exists
    const existingMcp = await db.select().from(mcpServers).where(eq(mcpServers.slug, mcp.slug)).get();
    if (!existingMcp) {
      await db.insert(mcpServers).values({
        id: nanoid(),
        name: mcp.name,
        slug: mcp.slug,
        transport: mcp.transport,
        config: JSON.stringify(mcp.config),
        enabled: mcp.enabled,
        isBuiltin: mcp.isBuiltin,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`Ensured MCP server: ${mcp.name}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  });
