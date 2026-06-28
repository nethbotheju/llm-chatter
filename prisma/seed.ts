import { PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";
import { seedProviders, seedAssistants, seedMcpServers } from "./seed-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const existingProviders = await prisma.provider.count();
  if (existingProviders > 0) {
    console.log("Providers already seeded, skipping provider/assistant seed...");
  } else {
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
      console.log(`Created provider: ${provider.name}`);
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
      console.log(`Created assistant: ${assistant.name}`);
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
    console.log(`Ensured MCP server: ${mcp.name}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
