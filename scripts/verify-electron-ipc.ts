import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { Module } from "node:module";

const TEST_USER_DATA = join(tmpdir(), `electron-ipc-test-${Date.now()}`);
mkdirSync(TEST_USER_DATA, { recursive: true });
globalThis.__TEST_USER_DATA__ = TEST_USER_DATA;

const originalResolve = (Module as unknown as {
  _resolveFilename: (req: string, ...args: unknown[]) => string;
})._resolveFilename;

(Module as unknown as {
  _resolveFilename: (req: string, ...args: unknown[]) => string;
})._resolveFilename = function (request: string, ...args: unknown[]) {
  if (request === "electron") {
    return require.resolve("./electron-mock.js");
  }
  return originalResolve.call(this, request, ...args);
};

const { ipcMain } = require("electron");
const { registerAllIpc } = require("../electron/ipc/index.js");
const { getPrisma } = require("../electron/db/client.js");
const { runMigrations } = require("../electron/db/migrations.js");
const { decrypt } = require("../electron/db/encryption.js");
const prisma = getPrisma();

const handlers = (globalThis as { __IPC_HANDLERS__?: Map<string, unknown> }).__IPC_HANDLERS__!;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string) {
  console.log(`  ✓ ${name}`);
  passed++;
}

function fail(name: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.log(`  ✗ ${name}: ${msg}`);
  failed++;
  failures.push(`${name}: ${msg}`);
}

async function call(channel: string, ...args: unknown[]) {
  const handler = handlers.get(channel) as ((event: unknown, ...args: unknown[]) => Promise<unknown>) | undefined;
  if (!handler) throw new Error(`No handler registered for ${channel}`);
  return handler(null, ...args);
}

async function expectThrow(fn: () => Promise<unknown>, matcher: string | RegExp) {
  try {
    await fn();
    throw new Error("Expected to throw but did not");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const match = typeof matcher === "string" ? msg.includes(matcher) : matcher.test(msg);
    if (!match) {
      throw new Error(`Expected error matching ${matcher} but got: ${msg}`);
    }
  }
}

async function main() {
  registerAllIpc();
  const registeredChannels = Array.from(handlers.keys());
  console.log(`\n=== Phase 2 Round-Trip Test ===`);
  console.log(`Registered ${registeredChannels.length} IPC channels: ${registeredChannels.join(", ")}\n`);

  await runMigrations();

  await testProviders();
  await testModels();
  await testAssistants();
  await testConversations();
  await testSearch();
  await testExport();
  await testStats();
  await testReset();
  await testEncryption();

  await prisma.$disconnect().catch(() => {});
  rmSync(TEST_USER_DATA, { recursive: true, force: true });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    console.log("Failures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }

  process.exit(0);
}

async function testProviders() {
  console.log("1. Providers");
  try {
    const initial = (await call("providers:getAll")) as Array<{ id: string; hasApiKey: boolean }>;
    const seedCount = initial.length;
    if (seedCount === 0) throw new Error("Seed did not create default providers");

    const created = (await call("providers:create", {
      name: "Test OpenAI",
      type: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test-12345",
      enabled: true,
    })) as { id: string; name: string; type: string; hasApiKey: boolean; baseUrl: string | null };

    if (created.name !== "Test OpenAI") throw new Error(`Name mismatch: ${created.name}`);
    if (created.type !== "openai") throw new Error(`Type mismatch: ${created.type}`);
    if (!created.hasApiKey) throw new Error("hasApiKey should be true after create with apiKey");
    if (created.baseUrl !== "https://api.openai.com/v1") throw new Error("baseUrl not saved");
    ok("create provider with API key");

    const fetched = (await call("providers:getAll")) as Array<{ id: string; hasApiKey: boolean }>;
    if (fetched.length !== seedCount + 1) throw new Error(`Expected ${seedCount + 1} providers, got ${fetched.length}`);
    const target = fetched.find((p) => p.id === created.id);
    if (!target) throw new Error("Created provider not found in getAll");
    if (!target.hasApiKey) throw new Error("Persisted provider lost hasApiKey flag");
    ok("getAll returns created provider with hasApiKey");

    const updated = (await call("providers:update", {
      id: created.id,
      name: "Test OpenAI Renamed",
    })) as { id: string; name: string; hasApiKey: boolean };

    if (updated.name !== "Test OpenAI Renamed") throw new Error("Update did not change name");
    if (!updated.hasApiKey) throw new Error("Update lost apiKey when only changing name");
    ok("update provider name (preserves apiKey)");

    const noKey = (await call("providers:create", {
      name: "Test NoKey",
      type: "openai",
    })) as { id: string; hasApiKey: boolean };

    if (noKey.hasApiKey) throw new Error("hasApiKey should be false when not provided");
    ok("create provider without API key (hasApiKey=false)");

    const clearKey = (await call("providers:update", {
      id: noKey.id,
      apiKey: "",
    })) as { hasApiKey: boolean };

    if (clearKey.hasApiKey) throw new Error("hasApiKey should be false after setting apiKey to empty string");
    ok("update with empty apiKey clears hasApiKey");

    const result = (await call("providers:validate", {
      type: "openai",
      apiKey: "sk-invalid-test-key-does-not-exist",
      baseUrl: "https://api.openai.com/v1",
    })) as { valid: boolean; error?: string };

    if (result.valid) throw new Error("Validation should fail for invalid key");
    if (!result.error) throw new Error("Error message missing");
    ok("validate with invalid key returns valid:false");

    await call("providers:delete", created.id);
    await call("providers:delete", noKey.id);

    const afterDelete = (await call("providers:getAll")) as unknown[];
    if (afterDelete.length !== seedCount) throw new Error("Delete did not remove provider");
    ok("delete providers");
  } catch (e) {
    fail("Providers round-trip", e);
  }
}

async function testModels() {
  console.log("\n2. Models");
  try {
    const providers = (await call("providers:getAll")) as Array<{ id: string; name: string; type: string }>;
    const openai = providers.find((p) => p.type === "openai");
    if (!openai) throw new Error("OpenAI provider not found (seed issue?)");

    const allModels = (await call("models:getAll", { providerId: openai.id })) as Array<{ id: string; name: string; enabled: boolean; providerId: string }>;
    const initialCount = allModels.length;
    if (initialCount === 0) throw new Error("Seed did not create default models");

    const created = (await call("models:create", {
      name: "gpt-test-model",
      providerId: openai.id,
      capabilities: ["chat", "tools"],
      enabled: true,
    })) as { id: string; name: string; capabilities: string; provider: { id: string; name: string; type: string; enabled: boolean } };

    if (created.name !== "gpt-test-model") throw new Error("Name mismatch");
    if (created.provider.id !== openai.id) throw new Error("Provider relation not loaded");
    ok("create model with provider relation");

    const parsed = JSON.parse(created.capabilities);
    if (!Array.isArray(parsed) || !parsed.includes("chat")) throw new Error("Capabilities not stored");
    ok("capabilities stored as JSON array");

    const updated = (await call("models:update", {
      id: created.id,
      enabled: false,
    })) as { enabled: boolean };
    if (updated.enabled) throw new Error("Toggle enabled=false failed");
    ok("toggle model enabled");

    const onlyEnabled = (await call("models:getAll", { providerId: openai.id })) as Array<{ id: string }>;
    if (onlyEnabled.some((m) => m.id === created.id)) throw new Error("Disabled model should not appear without includeDisabled");
    ok("getAll filters disabled by default");

    const all = (await call("models:getAll", { providerId: openai.id, includeDisabled: true })) as Array<{ id: string }>;
    if (!all.some((m) => m.id === created.id)) throw new Error("Disabled model should appear with includeDisabled");
    ok("getAll with includeDisabled returns disabled models");

    await call("models:delete", created.id);
    const after = (await call("models:getAll", { providerId: openai.id, includeDisabled: true })) as Array<{ id: string }>;
    if (after.some((m) => m.id === created.id)) throw new Error("Delete did not remove model");
    ok("delete model");
  } catch (e) {
    fail("Models round-trip", e);
  }
}

async function testAssistants() {
  console.log("\n3. Assistants");
  try {
    const initial = (await call("assistants:getAll")) as Array<{ id: string; name: string; isDefault: boolean }>;
    if (initial.length < 4) throw new Error("Seed did not create default assistants");
    const defaultCount = initial.filter((a) => a.isDefault).length;
    if (defaultCount !== 1) throw new Error(`Expected exactly 1 default, got ${defaultCount}`);
    ok("seed creates 4 assistants with exactly 1 default");

    const created = (await call("assistants:create", {
      name: "Test Assistant",
      systemPrompt: "You are a test assistant",
      temperature: 0.5,
      topP: 0.9,
      enabled: true,
    })) as { id: string; name: string; isDefault: boolean; systemPrompt: string };

    if (created.name !== "Test Assistant") throw new Error("Name mismatch");
    if (created.isDefault) throw new Error("New assistant should not be default");
    ok("create assistant");

    const fetched = (await call("assistants:get", created.id)) as { name: string };
    if (fetched.name !== "Test Assistant") throw new Error("get() failed");
    ok("get assistant by id");

    const updated = (await call("assistants:update", {
      id: created.id,
      isDefault: true,
    })) as { isDefault: boolean };

    if (!updated.isDefault) throw new Error("isDefault not set");
    const afterUpdate = (await call("assistants:getAll")) as Array<{ id: string; isDefault: boolean }>;
    const newDefaults = afterUpdate.filter((a) => a.isDefault);
    if (newDefaults.length !== 1 || newDefaults[0].id !== created.id) {
      throw new Error("Setting new default should unset previous default");
    }
    ok("update isDefault atomically switches default");

    const secondAssistant = (await call("assistants:create", {
      name: "Second Test",
      systemPrompt: "Test 2",
    })) as { id: string };

    await call("assistants:delete", updated.id);

    const allAfter = (await call("assistants:getAll")) as Array<{ id: string; isDefault: boolean }>;
    if (allAfter.length !== initial.length + 1) throw new Error(`Expected ${initial.length + 1} assistants (seed + 1 test), got ${allAfter.length}`);
    if (!allAfter.some((a) => a.isDefault)) throw new Error("No default after deleting default");
    if (allAfter.filter((a) => a.isDefault).length !== 1) throw new Error("Multiple defaults after delete");
    const newDefaultId = allAfter.find((a) => a.isDefault)!.id;
    if (newDefaultId === updated.id) throw new Error("Deleted assistant is still default");
    ok("deleting default promotes another assistant");

    const keepOne = allAfter.find((a) => a.id === secondAssistant.id)!;
    for (const a of allAfter) {
      if (a.id !== keepOne.id) {
        await call("assistants:delete", a.id);
      }
    }
    const lastCheck = (await call("assistants:getAll")) as Array<{ id: string }>;
    if (lastCheck.length !== 1) throw new Error(`Expected 1 assistant, got ${lastCheck.length}`);

    await expectThrow(() => call("assistants:delete", keepOne.id), "Cannot delete the last assistant");
    ok("cannot delete last assistant when only 1 remains");
  } catch (e) {
    fail("Assistants round-trip", e);
  }
}

async function testConversations() {
  console.log("\n4. Conversations + Messages");
  try {
    const assistants = (await call("assistants:getAll")) as Array<{ id: string; isDefault: boolean }>;
    const defaultAssistant = assistants.find((a) => a.isDefault);
    if (!defaultAssistant) throw new Error("No default assistant");

    const created = (await call("conversations:create", {
      title: "Test Conversation",
    })) as { id: string; title: string | null; assistantId: string; messages: unknown[]; assistant: { id: string; name: string } };

    if (created.title !== "Test Conversation") throw new Error("Title not saved");
    if (created.assistantId !== defaultAssistant.id) throw new Error("Default assistant not used when none specified");
    if (created.assistant.id !== defaultAssistant.id) throw new Error("Assistant relation not loaded");
    if (created.messages.length !== 0) throw new Error("New conversation should have no messages");
    ok("create conversation uses default assistant when none specified");

    const userMsg = (await call("messages:create", {
      conversationId: created.id,
      role: "user",
      parts: JSON.stringify([{ type: "text", text: "Hello" }]),
    })) as { id: string; role: string; parts: string; conversationId: string };

    if (userMsg.role !== "user") throw new Error("Role mismatch");
    if (userMsg.conversationId !== created.id) throw new Error("conversationId mismatch");
    ok("create user message");

    const assistantMsg = (await call("messages:create", {
      conversationId: created.id,
      role: "assistant",
      parts: JSON.stringify([{ type: "text", text: "Hi there!" }]),
      metadata: JSON.stringify({ model: "gpt-4o-mini" }),
    })) as { id: string; role: string };

    if (assistantMsg.role !== "assistant") throw new Error("Role mismatch");
    ok("create assistant message with metadata");

    const messages = (await call("messages:get", created.id)) as Array<{ id: string; role: string }>;
    if (messages.length !== 2) throw new Error(`Expected 2 messages, got ${messages.length}`);
    if (messages[0].id !== userMsg.id || messages[1].id !== assistantMsg.id) {
      throw new Error("Messages not returned in correct order");
    }
    ok("get messages in chronological order");

    await call("messages:update", {
      messageId: userMsg.id,
      conversationId: created.id,
      parts: JSON.stringify([{ type: "text", text: "Hello (edited)" }]),
    });
    const afterEdit = (await call("messages:get", created.id)) as Array<{ id: string; parts: string }>;
    const edited = afterEdit.find((m) => m.id === userMsg.id);
    if (!edited) throw new Error("Message disappeared after update");
    if (JSON.parse(edited.parts)[0].text !== "Hello (edited)") throw new Error("Edit did not persist");
    ok("update message parts persists");

    await call("messages:delete", { messageId: assistantMsg.id, conversationId: created.id });
    const afterDelete = (await call("messages:get", created.id)) as Array<{ id: string }>;
    if (afterDelete.some((m) => m.id === assistantMsg.id)) throw new Error("Message not deleted");
    ok("delete message");

    const allConvs = (await call("conversations:getAll")) as Array<{ id: string; _count: { messages: number } }>;
    const target = allConvs.find((c) => c.id === created.id);
    if (!target) throw new Error("Created conversation not in list");
    if (target._count.messages !== 1) throw new Error(`Expected 1 message, got ${target._count.messages}`);
    ok("conversation.getAll includes _count.messages");

    const detail = (await call("conversations:get", created.id)) as { id: string; messages: unknown[]; assistant: unknown };
    if (detail.id !== created.id) throw new Error("get returned wrong conversation");
    if (!Array.isArray(detail.messages) || detail.messages.length !== 1) throw new Error("Detail messages wrong");
    if (!detail.assistant) throw new Error("Detail assistant missing");
    ok("conversation.get returns full detail with messages and assistant");

    const updated2 = (await call("conversations:update", { id: created.id, title: "Renamed Title" })) as { title: string | null };
    if (updated2.title !== "Renamed Title") throw new Error("Title update failed");
    ok("update conversation title");

    await call("conversations:delete", created.id);
    const allAfter = (await call("conversations:getAll")) as Array<{ id: string }>;
    if (allAfter.some((c) => c.id === created.id)) throw new Error("Conversation not deleted");
    ok("delete conversation");
  } catch (e) {
    fail("Conversations + Messages round-trip", e);
  }
}

async function testSearch() {
  console.log("\n5. Search");
  try {
    const conv = (await call("conversations:create", {})) as { id: string };
    const uniqueWord = `uniqueword${Date.now()}`;

    await call("messages:create", {
      conversationId: conv.id,
      role: "user",
      parts: JSON.stringify([{ type: "text", text: `This message contains ${uniqueWord} for searching` }]),
    });
    await call("messages:create", {
      conversationId: conv.id,
      role: "assistant",
      parts: JSON.stringify([{ type: "text", text: `Reply discussing the ${uniqueWord} topic` }]),
    });

    const results = (await call("search:messages", uniqueWord)) as Array<{ conversationId: string; messageId: string; snippet: string; createdAt: string; conversationTitle: string }>;

    if (results.length === 0) throw new Error(`No results for ${uniqueWord}`);
    if (results.length !== 2) throw new Error(`Expected 2 results (both messages), got ${results.length}`);
    if (!results[0].snippet.includes(uniqueWord)) throw new Error("Snippet does not contain search term");
    ok(`search returns ${results.length} results with snippets`);

    const short = (await call("search:messages", "a")) as unknown[];
    if (short.length !== 0) throw new Error("Short query (<2 chars) should return empty");
    ok("search with query <2 chars returns empty");

    const noResults = (await call("search:messages", `nonexistent${Date.now()}`)) as unknown[];
    if (noResults.length !== 0) throw new Error("Unknown query should return empty");
    ok("search with no matches returns empty");

    await call("conversations:delete", conv.id);
  } catch (e) {
    fail("Search round-trip", e);
  }
}

async function testExport() {
  console.log("\n6. Export");
  try {
    const data = (await call("export:data")) as { exportedAt: string; conversations: Array<{ id: string; title: string | null; assistant: string; createdAt: string; messages: Array<{ role: string; parts: string; metadata: string | null; createdAt: string }> }> };

    if (!data.exportedAt) throw new Error("exportedAt missing");
    if (!Array.isArray(data.conversations)) throw new Error("conversations should be array");

    if (data.conversations.length > 0) {
      const first = data.conversations[0];
      if (typeof first.id !== "string") throw new Error("conversation.id should be string");
      if (typeof first.assistant !== "string") throw new Error("assistant should be string (name)");
      if (!Array.isArray(first.messages)) throw new Error("messages should be array");
      if (first.messages.length > 0) {
        const msg = first.messages[0];
        if (typeof msg.role !== "string") throw new Error("message.role should be string");
        if (typeof msg.parts !== "string") throw new Error("message.parts should be string");
      }
    }
    ok(`export returns valid shape with ${data.conversations.length} conversations`);
  } catch (e) {
    fail("Export round-trip", e);
  }
}

async function testStats() {
  console.log("\n7. Stats");
  try {
    const stats = (await call("stats:get")) as { conversations: number; messages: number };
    if (typeof stats.conversations !== "number") throw new Error("conversations should be number");
    if (typeof stats.messages !== "number") throw new Error("messages should be number");

    const realStats = await prisma.conversation.count();
    if (stats.conversations !== realStats) throw new Error(`Stats conversation count ${stats.conversations} != DB ${realStats}`);
    ok(`stats returns correct counts (${stats.conversations} conversations, ${stats.messages} messages)`);
  } catch (e) {
    fail("Stats round-trip", e);
  }
}

async function testReset() {
  console.log("\n8. Reset");
  try {
    const before = (await call("stats:get")) as { conversations: number; messages: number };
    await call("reset:data");
    const after = (await call("stats:get")) as { conversations: number; messages: number };

    if (after.conversations !== 0) throw new Error(`After reset, expected 0 conversations, got ${after.conversations}`);
    if (after.messages !== 0) throw new Error(`After reset, expected 0 messages, got ${after.messages}`);

    const reSeeded = (await call("providers:getAll")) as unknown[];
    if (reSeeded.length === 0) throw new Error("Reset did not re-seed default providers");
    ok("reset wipes data and re-seeds defaults");
  } catch (e) {
    fail("Reset round-trip", e);
  }
}

async function testEncryption() {
  console.log("\n9. Encryption");
  try {
    const provider = (await call("providers:create", {
      name: "Encryption Test",
      type: "openai",
      apiKey: "sk-supersecret-key-12345",
    })) as { id: string; hasApiKey: boolean };

    if (!provider.hasApiKey) throw new Error("hasApiKey should be true");

    const raw = await prisma.provider.findUniqueOrThrow({ where: { id: provider.id } });
    if (!raw.apiKeyEncrypted) throw new Error("apiKeyEncrypted is null");

    const encrypted = raw.apiKeyEncrypted;
    if (encrypted.includes("sk-supersecret")) throw new Error("API key stored in plaintext!");
    if (!/^[0-9a-f]+$/i.test(encrypted)) throw new Error("Encrypted value should be hex");

    const decrypted = decrypt(encrypted);
    if (decrypted !== "sk-supersecret-key-12345") {
      throw new Error(`Decryption failed: expected original key, got ${decrypted}`);
    }
    ok("API key encrypted in DB and decrypts correctly");

    await call("providers:delete", provider.id);
  } catch (e) {
    fail("Encryption round-trip", e);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
