import { getPrisma } from "./client";
import { nanoid } from "nanoid";
import { seedProviders, seedAssistants, seedMcpServers } from "../../prisma/seed-data";

export async function seedDatabase() {
  const prisma = getPrisma();

  const providerCount = await prisma.provider.count();
  if (providerCount === 0) {
    for (const provider of seedProviders) {
      await prisma.provider.create({
        data: {
          id: nanoid(),
          name: provider.name,
          type: provider.type,
          baseUrl: provider.baseUrl,
          enabled: true,
          models: {
            create: provider.models.map((model) => ({
              id: nanoid(),
              name: model.name,
              capabilities: JSON.stringify(model.capabilities),
              enabled: true,
            })),
          },
        },
      });
    }

    for (const assistant of seedAssistants) {
      await prisma.assistant.create({
        data: {
          id: nanoid(),
          name: assistant.name,
          systemPrompt: assistant.systemPrompt,
          temperature: assistant.temperature,
          topP: assistant.topP,
          isDefault: assistant.isDefault,
          enabled: true,
        },
      });
    }
  }

  for (const mcp of seedMcpServers) {
    await prisma.mcpServer.upsert({
      where: { slug: mcp.slug },
      create: {
        id: nanoid(),
        name: mcp.name,
        slug: mcp.slug,
        transport: mcp.transport,
        config: JSON.stringify(mcp.config),
        enabled: mcp.enabled,
        isBuiltin: mcp.isBuiltin,
      },
      update: {},
    });
  }
}
