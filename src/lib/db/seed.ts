import { prisma } from "./client";
import { nanoid } from "nanoid";

const defaultAssistants = [
  {
    name: "General",
    systemPrompt:
      "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses.",
    temperature: 0.7,
    topP: 1.0,
    isDefault: true,
  },
  {
    name: "Code Expert",
    systemPrompt:
      "You are an expert software developer. Provide clean, efficient, and well-documented code. Explain your reasoning and consider edge cases.",
    temperature: 0.3,
    topP: 0.95,
  },
  {
    name: "Creative Writer",
    systemPrompt:
      "You are a creative writing assistant. Be imaginative, expressive, and help craft engaging content. Think outside the box.",
    temperature: 0.9,
    topP: 1.0,
  },
  {
    name: "Analyst",
    systemPrompt:
      "You are a data analyst and critical thinker. Provide structured, logical analysis. Be thorough and consider multiple perspectives.",
    temperature: 0.5,
    topP: 0.9,
  },
];

export async function seedAssistants() {
  const existingCount = await prisma.assistant.count();

  if (existingCount === 0) {
    console.log("Seeding default assistants...");

    for (const assistant of defaultAssistants) {
      await prisma.assistant.create({
        data: {
          id: nanoid(),
          ...assistant,
          enabled: true,
        },
      });
    }

    console.log(`Created ${defaultAssistants.length} default assistants`);
  }
}

export async function seedDatabase() {
  await seedAssistants();
}
