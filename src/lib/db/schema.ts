import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const providers = sqliteTable("Provider", {
  id:              text("id").primaryKey(),
  name:            text("name").notNull(),
  type:            text("type").notNull(),
  baseUrl:         text("baseUrl"),
  apiKeyEncrypted: text("apiKeyEncrypted"),
  catalogId:       text("catalogId").unique(),
  lastSyncedAt:    text("lastSyncedAt"),
  enabled:         integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt:       text("createdAt").notNull(),
  updatedAt:       text("updatedAt").notNull(),
});

export const models = sqliteTable("Model", {
  id:             text("id").primaryKey(),
  name:           text("name").notNull(),
  providerId:     text("providerId").notNull().references(() => providers.id, { onDelete: "cascade" }),
  capabilities:   text("capabilities").notNull(), // JSON array as string
  catalogModelId: text("catalogModelId"),
  metadata:       text("metadata"),               // JSON blob as string
  enabled:        integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt:      text("createdAt").notNull(),
  updatedAt:      text("updatedAt").notNull(),
}, (table) => [
  uniqueIndex("Model_providerId_name_key").on(table.providerId, table.name),
]);

export const assistants = sqliteTable("Assistant", {
  id:           text("id").primaryKey(),
  name:         text("name").notNull(),
  image:        text("image"),
  systemPrompt: text("systemPrompt").notNull(),
  temperature:  real("temperature").notNull().default(0.7),
  topP:         real("topP").notNull().default(1.0),
  enabled:      integer("enabled", { mode: "boolean" }).notNull().default(true),
  isDefault:    integer("isDefault", { mode: "boolean" }).notNull().default(false),
  createdAt:    text("createdAt").notNull(),
  updatedAt:    text("updatedAt").notNull(),
});

export const conversations = sqliteTable("Conversation", {
  id:          text("id").primaryKey(),
  title:       text("title"),
  assistantId: text("assistantId").notNull().references(() => assistants.id),
  createdAt:   text("createdAt").notNull(),
  updatedAt:   text("updatedAt").notNull(),
}, (table) => [
  index("Conversation_assistantId_idx").on(table.assistantId),
  index("Conversation_createdAt_idx").on(table.createdAt),
]);

export const messages = sqliteTable("Message", {
  id:             text("id").primaryKey(),
  conversationId: text("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role:           text("role").notNull(),
  parts:          text("parts").notNull(),     // JSON array as string
  metadata:       text("metadata"),            // JSON blob as string
  createdAt:      text("createdAt").notNull(),
}, (table) => [
  index("Message_conversationId_idx").on(table.conversationId),
  index("Message_createdAt_idx").on(table.createdAt),
]);

export const mcpServers = sqliteTable("McpServer", {
  id:        text("id").primaryKey(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  transport: text("transport").notNull(),
  command:   text("command"),
  args:      text("args"),      // JSON array as string
  env:       text("env"),       // JSON blob as string (encrypted)
  url:       text("url"),
  headers:   text("headers"),   // JSON blob as string (encrypted)
  config:    text("config"),    // JSON blob as string
  enabled:   integer("enabled", { mode: "boolean" }).notNull().default(true),
  isBuiltin: integer("isBuiltin", { mode: "boolean" }).notNull().default(false),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

export const appConfig = sqliteTable("AppConfig", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(), // JSON string
  updatedAt: text("updatedAt").notNull(),
});
