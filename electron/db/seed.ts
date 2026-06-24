import { getPrisma } from "./client";
import { nanoid } from "nanoid";

const defaultProviders = [
  {
    id: nanoid(),
    name: "OpenAI",
    type: "openai",
    baseUrl: null,
    models: [
      { name: "gpt-4o", capabilities: ["chat", "vision", "tools"] },
      { name: "gpt-4o-mini", capabilities: ["chat", "vision", "tools"] },
      { name: "o1", capabilities: ["chat"] },
      { name: "o1-mini", capabilities: ["chat"] },
      { name: "o1-preview", capabilities: ["chat"] },
    ],
  },
  {
    id: nanoid(),
    name: "Anthropic",
    type: "anthropic",
    baseUrl: null,
    models: [
      { name: "claude-3-5-sonnet-latest", capabilities: ["chat", "vision", "tools"] },
      { name: "claude-3-opus-latest", capabilities: ["chat", "vision", "tools"] },
      { name: "claude-3-haiku-latest", capabilities: ["chat", "vision", "tools"] },
    ],
  },
  {
    id: nanoid(),
    name: "Google",
    type: "google",
    baseUrl: null,
    models: [
      { name: "gemini-2.0-flash", capabilities: ["chat", "vision", "tools"] },
      { name: "gemini-1.5-pro", capabilities: ["chat", "vision", "tools"] },
      { name: "gemini-1.5-flash", capabilities: ["chat", "vision", "tools"] },
    ],
  },
];

const defaultAssistants = [
  {
    id: nanoid(),
    name: "General",
    systemPrompt: "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses.",
    temperature: 0.7,
    topP: 1.0,
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Code Expert",
    systemPrompt: "You are an expert software developer. Provide clean, efficient, and well-documented code. Explain your reasoning and consider edge cases.",
    temperature: 0.3,
    topP: 0.95,
    isDefault: false,
  },
  {
    id: nanoid(),
    name: "Creative Writer",
    systemPrompt: "You are a creative writing assistant. Be imaginative, expressive, and help craft engaging content. Think outside the box.",
    temperature: 0.9,
    topP: 1.0,
    isDefault: false,
  },
  {
    id: nanoid(),
    name: "Analyst",
    systemPrompt: "You are a data analyst and critical thinker. Provide structured, logical analysis. Be thorough and consider multiple perspectives.",
    temperature: 0.5,
    topP: 0.9,
    isDefault: false,
  },
];

export async function seedDatabase() {
  const prisma = getPrisma();

  const providerCount = await prisma.provider.count();
  if (providerCount > 0) return;

  for (const provider of defaultProviders) {
    await prisma.provider.create({
      data: {
        id: provider.id,
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

  for (const assistant of defaultAssistants) {
    await prisma.assistant.create({
      data: {
        id: assistant.id,
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
