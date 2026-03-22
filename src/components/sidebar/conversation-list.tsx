"use client";

import { ConversationItem } from "./conversation-item";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: Date;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          {...conversation}
          isActive={conversation.id === activeId}
          onClick={() => onSelect(conversation.id)}
          onDelete={() => onDelete(conversation.id)}
        />
      ))}
    </div>
  );
}
