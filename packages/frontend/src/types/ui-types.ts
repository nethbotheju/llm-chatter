import type { Model, Assistant, ConversationWithCount } from "@llm-chatter/services";

/**
 * Conversation representation for UI components (e.g. sidebar).
 * `createdAt` is a Date for component-side usage.
 */
export interface UIConversation {
  id: string;
  title: string | null;
  createdAt: Date;
}

/**
 * Transform a raw service Conversation into a UI-ready one.
 */
export function toUIConversation(c: ConversationWithCount): UIConversation {
  return {
    id: c.id,
    title: c.title,
    createdAt: new Date(c.createdAt),
  };
}

/**
 * Model enriched with its provider details — used by model selectors.
 */
export type ModelWithProvider = Model;

/**
 * Re-export commonly-used service types for convenience.
 */
export type { Model, Assistant, ConversationWithCount } from "@llm-chatter/services";
