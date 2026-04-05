import { z } from "zod";

export const providerTypeSchema = z.enum([
  "openai",
  "anthropic",
  "google",
  "openai-compatible",
  "anthropic-compatible",
]);

const isoDateSchema = z.string();

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: providerTypeSchema,
  baseUrl: z.string().nullable().optional(),
  hasApiKey: z.boolean(),
  enabled: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const providerListSchema = z.array(providerSchema);

export const modelProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  enabled: z.boolean(),
});

export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  providerId: z.string(),
  capabilities: z.string(),
  enabled: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  provider: modelProviderSchema,
});

export const modelListSchema = z.array(modelSchema);

export const assistantSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
  systemPrompt: z.string(),
  temperature: z.number(),
  topP: z.number(),
  enabled: z.boolean(),
  isDefault: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const assistantListSchema = z.array(assistantSchema);

export const messageRoleSchema = z.enum(["user", "assistant", "system"]);

export const messageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: messageRoleSchema,
  content: z.string(),
  thinking: z.string().nullable().optional(),
  attachments: z.string().nullable().optional(),
  createdAt: isoDateSchema,
});

export const messageListSchema = z.array(messageSchema);

export const conversationSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  assistantId: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const conversationListSchema = z.array(conversationSchema);

export const conversationWithCountSchema = conversationSchema.extend({
  _count: z.object({ messages: z.number() }),
});

export const conversationWithCountListSchema = z.array(conversationWithCountSchema);

export const conversationDetailSchema = conversationSchema.extend({
  messages: messageListSchema,
  assistant: assistantSchema.nullable(),
});

export const searchResultSchema = z.object({
  conversationId: z.string(),
  conversationTitle: z.string(),
  messageId: z.string(),
  snippet: z.string(),
  createdAt: isoDateSchema,
});

export const searchResultListSchema = z.array(searchResultSchema);

export const exportMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
  thinking: z.string().nullable().optional(),
  createdAt: isoDateSchema,
});

export const exportConversationSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  assistant: z.string(),
  createdAt: isoDateSchema,
  messages: z.array(exportMessageSchema),
});

export const exportDataSchema = z.object({
  exportedAt: isoDateSchema,
  conversations: z.array(exportConversationSchema),
});

export const statsSchema = z.object({
  conversations: z.number(),
  messages: z.number(),
});

export const chatMessageInputSchema = z.object({
  id: z.string(),
  role: messageRoleSchema,
  content: z.string(),
});

export const chatAssistantConfigSchema = z.object({
  systemPrompt: z.string().default(""),
  temperature: z.number().default(0.7),
  topP: z.number().default(1),
});

export const chatProviderConfigSchema = z.object({
  type: providerTypeSchema,
  apiKey: z.string().min(1),
  baseUrl: z.string().nullable().optional(),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageInputSchema),
  model: z.string().min(1),
  provider: chatProviderConfigSchema,
  assistantConfig: chatAssistantConfigSchema.optional(),
});

export const chatErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  status: z.number().int().nullable().optional(),
  retryable: z.boolean().optional(),
  details: z.string().nullable().optional(),
});

export const chatTokenEventSchema = z.object({
  type: z.literal("token"),
  token: z.string(),
});

export const chatDoneEventSchema = z.object({
  type: z.literal("done"),
  text: z.string(),
  finishReason: z.string().nullable().optional(),
});

export const chatErrorEventSchema = z.object({
  type: z.literal("error"),
  error: chatErrorSchema,
});

export const chatAbortEventSchema = z.object({
  type: z.literal("abort"),
});

export const chatEventSchema = z.discriminatedUnion("type", [
  chatTokenEventSchema,
  chatDoneEventSchema,
  chatErrorEventSchema,
  chatAbortEventSchema,
]);

export const chatEventListSchema = z.array(chatEventSchema);

export const createConversationInputSchema = z.object({
  assistantId: z.string().optional(),
  title: z.string().optional(),
});

export const createProviderInputSchema = z.object({
  name: z.string().min(1),
  type: providerTypeSchema,
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const updateProviderInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  type: providerTypeSchema.optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  enabled: z.boolean().optional(),
});

export const createModelInputSchema = z.object({
  name: z.string().min(1),
  providerId: z.string(),
  capabilities: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const updateModelInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const createAssistantInputSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const updateAssistantInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
  image: z.string().nullable().optional(),
});

export const validateProviderInputSchema = z.object({
  providerId: z.string().optional(),
  name: z.string().optional(),
  type: providerTypeSchema.optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
});

export type ProviderDTO = z.infer<typeof providerSchema>;
export type ModelDTO = z.infer<typeof modelSchema>;
export type AssistantDTO = z.infer<typeof assistantSchema>;
export type ConversationDTO = z.infer<typeof conversationSchema>;
export type ConversationDetailDTO = z.infer<typeof conversationDetailSchema>;
export type ConversationWithCountDTO = z.infer<typeof conversationWithCountSchema>;
export type MessageDTO = z.infer<typeof messageSchema>;
export type SearchResultDTO = z.infer<typeof searchResultSchema>;
export type ExportDataDTO = z.infer<typeof exportDataSchema>;
export type StatsDTO = z.infer<typeof statsSchema>;
export type ChatMessageInputDTO = z.infer<typeof chatMessageInputSchema>;
export type ChatAssistantConfigDTO = z.infer<typeof chatAssistantConfigSchema>;
export type ChatProviderConfigDTO = z.infer<typeof chatProviderConfigSchema>;
export type ChatRequestDTO = z.infer<typeof chatRequestSchema>;
export type ChatErrorDTO = z.infer<typeof chatErrorSchema>;
export type ChatEventDTO = z.infer<typeof chatEventSchema>;
export type CreateProviderInputDTO = z.infer<typeof createProviderInputSchema>;
export type UpdateProviderInputDTO = z.infer<typeof updateProviderInputSchema>;
export type CreateModelInputDTO = z.infer<typeof createModelInputSchema>;
export type UpdateModelInputDTO = z.infer<typeof updateModelInputSchema>;
export type CreateAssistantInputDTO = z.infer<typeof createAssistantInputSchema>;
export type UpdateAssistantInputDTO = z.infer<typeof updateAssistantInputSchema>;
export type CreateConversationInputDTO = z.infer<typeof createConversationInputSchema>;
export type ValidateProviderInputDTO = z.infer<typeof validateProviderInputSchema>;

export function parseProvider(input: unknown): ProviderDTO {
  return providerSchema.parse(input);
}

export function parseProviders(input: unknown): ProviderDTO[] {
  return providerListSchema.parse(input);
}

export function parseModel(input: unknown): ModelDTO {
  return modelSchema.parse(input);
}

export function parseModels(input: unknown): ModelDTO[] {
  return modelListSchema.parse(input);
}

export function parseAssistant(input: unknown): AssistantDTO {
  return assistantSchema.parse(input);
}

export function parseAssistants(input: unknown): AssistantDTO[] {
  return assistantListSchema.parse(input);
}

export function parseConversation(input: unknown): ConversationDTO {
  return conversationSchema.parse(input);
}

export function parseConversations(input: unknown): ConversationDTO[] {
  return conversationListSchema.parse(input);
}

export function parseConversationDetail(input: unknown): ConversationDetailDTO {
  return conversationDetailSchema.parse(input);
}

export function parseConversationsWithCount(input: unknown): ConversationWithCountDTO[] {
  return conversationWithCountListSchema.parse(input);
}

export function parseMessage(input: unknown): MessageDTO {
  return messageSchema.parse(input);
}

export function parseMessages(input: unknown): MessageDTO[] {
  return messageListSchema.parse(input);
}

export function parseSearchResults(input: unknown): SearchResultDTO[] {
  return searchResultListSchema.parse(input);
}

export function parseExportData(input: unknown): ExportDataDTO {
  return exportDataSchema.parse(input);
}

export function parseStats(input: unknown): StatsDTO {
  return statsSchema.parse(input);
}

export function parseChatRequest(input: unknown): ChatRequestDTO {
  return chatRequestSchema.parse(input);
}

export function parseChatEvent(input: unknown): ChatEventDTO {
  return chatEventSchema.parse(input);
}

export function parseChatEvents(input: unknown): ChatEventDTO[] {
  return chatEventListSchema.parse(input);
}
