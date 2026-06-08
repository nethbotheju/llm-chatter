import { ipcMain } from "electron";
import { getPrisma } from "../db/client";
import { encrypt } from "../db/encryption";
import { nanoid } from "nanoid";

interface SanitizedProvider {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  hasApiKey: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function sanitize(p: {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyEncrypted: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SanitizedProvider {
  const { apiKeyEncrypted, ...rest } = p;
  return { ...rest, hasApiKey: !!apiKeyEncrypted };
}

async function validateProviderApiKey(input: {
  type: string;
  apiKey: string;
  baseUrl?: string | null;
}): Promise<{ valid: boolean; error?: string }> {
  const { type, apiKey } = input;
  const baseUrl =
    input.baseUrl ||
    (() => {
      switch (type) {
        case "openai":
        case "openai-compatible":
          return "https://api.openai.com/v1";
        case "anthropic":
        case "anthropic-compatible":
          return "https://api.anthropic.com";
        case "google":
          return "https://generativelanguage.googleapis.com";
        default:
          return null;
      }
    })();

  if (!baseUrl) return { valid: false, error: "No base URL configured" };

  try {
    let response: Response;

    switch (type) {
      case "openai":
      case "openai-compatible": {
        const url = `${baseUrl}/chat/completions`;
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Reply with: ok" }],
            max_tokens: 5,
          }),
        });
        break;
      }
      case "anthropic":
      case "anthropic-compatible": {
        const url = `${baseUrl}/v1/messages`;
        response = await fetch(url, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            messages: [{ role: "user", content: "Reply with: ok" }],
            max_tokens: 5,
          }),
        });
        break;
      }
      case "google": {
        const url = `${baseUrl}/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Reply with: ok" }] }],
          }),
        });
        break;
      }
      default:
        return { valid: false, error: `Unknown provider type: ${type}` };
    }

    if (response.ok) return { valid: true };
    const body = await response.text();
    return {
      valid: false,
      error: `HTTP ${response.status}: ${body.slice(0, 200)}`,
    };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : "Validation failed" };
  }
}

export function registerProvidersIpc() {
  ipcMain.handle("providers:getAll", async () => {
    const prisma = getPrisma();
    const providers = await prisma.provider.findMany({
      include: { models: true },
      orderBy: { name: "asc" },
    });
    return providers.map(sanitize);
  });

  ipcMain.handle("providers:create", async (_e, input: {
    name: string;
    type: string;
    baseUrl?: string;
    apiKey?: string;
    enabled?: boolean;
  }) => {
    const prisma = getPrisma();
    const provider = await prisma.provider.create({
      data: {
        id: nanoid(),
        name: input.name,
        type: input.type,
        baseUrl: input.baseUrl || null,
        apiKeyEncrypted: input.apiKey ? encrypt(input.apiKey) : null,
        enabled: input.enabled ?? true,
      },
    });
    return sanitize(provider);
  });

  ipcMain.handle("providers:update", async (_e, input: {
    id: string;
    name?: string;
    type?: string;
    baseUrl?: string;
    apiKey?: string;
    enabled?: boolean;
  }) => {
    const prisma = getPrisma();
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.type !== undefined) data.type = input.type;
    if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl || null;
    if (input.apiKey !== undefined) {
      data.apiKeyEncrypted = input.apiKey ? encrypt(input.apiKey) : null;
    }
    if (input.enabled !== undefined) data.enabled = input.enabled;

    const provider = await prisma.provider.update({
      where: { id: input.id },
      data,
    });
    return sanitize(provider);
  });

  ipcMain.handle("providers:delete", async (_e, id: string) => {
    const prisma = getPrisma();
    await prisma.provider.delete({ where: { id } });
  });

  ipcMain.handle("providers:validate", async (_e, input: {
    type: string;
    apiKey: string;
    baseUrl?: string;
  }) => {
    return validateProviderApiKey(input);
  });
}
