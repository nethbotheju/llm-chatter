export interface AssistantMessageRecord {
  id: string;
  conversationId: string;
  parts: string;
  metadata: string | null;
}

export interface ChatPersistenceStore {
  upsertAssistantMessage(rec: AssistantMessageRecord): Promise<void>;
  touchConversation(conversationId: string): Promise<void>;
}

export interface PersistAssistantMessageInput {
  messageId: string;
  conversationId: string;
  parts: unknown;
  metadata?: unknown;
}

export async function persistAssistantMessage(
  input: PersistAssistantMessageInput,
  store: ChatPersistenceStore,
): Promise<void> {
  await store.upsertAssistantMessage({
    id: input.messageId,
    conversationId: input.conversationId,
    parts: JSON.stringify(input.parts),
    metadata: input.metadata != null ? JSON.stringify(input.metadata) : null,
  });
  await store.touchConversation(input.conversationId);
}
