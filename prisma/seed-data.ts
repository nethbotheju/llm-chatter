export interface SeedModel {
  name: string;
  capabilities: string[];
}

export interface SeedProvider {
  name: string;
  type: string;
  baseUrl: string | null;
  models: SeedModel[];
}

export interface SeedAssistant {
  name: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  isDefault: boolean;
}

export interface SeedMcpServer {
  name: string;
  slug: string;
  transport: string;
  config: Record<string, unknown>;
  enabled: boolean;
  isBuiltin: boolean;
}

export const seedProviders: SeedProvider[] = [
  {
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

export const seedAssistants: SeedAssistant[] = [
  {
    name: "General",
    systemPrompt: "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses.",
    temperature: 0.7,
    topP: 1.0,
    isDefault: true,
  },
  {
    name: "Code Expert",
    systemPrompt: "You are an expert software developer. Provide clean, efficient, and well-documented code. Explain your reasoning and consider edge cases.",
    temperature: 0.3,
    topP: 0.95,
    isDefault: false,
  },
  {
    name: "Creative Writer",
    systemPrompt: "You are a creative writing assistant. Be imaginative, expressive, and help craft engaging content. Think outside the box.",
    temperature: 0.9,
    topP: 1.0,
    isDefault: false,
  },
  {
    name: "Analyst",
    systemPrompt: "You are a data analyst and critical thinker. Provide structured, logical analysis. Be thorough and consider multiple perspectives.",
    temperature: 0.5,
    topP: 0.9,
    isDefault: false,
  },
];

export const seedMcpServers: SeedMcpServer[] = [
  {
    name: "Web Tools",
    slug: "web-tools",
    transport: "builtin",
    enabled: true,
    isBuiltin: true,
    config: {
      enabled: ["web_search", "web_fetch"],
      configs: {},
    },
  },
];
