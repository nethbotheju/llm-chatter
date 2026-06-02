"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ConversationItem } from "./conversation-item";

import type { UIConversation } from "@/types";

interface GroupedConversations {
  today: UIConversation[];
  yesterday: UIConversation[];
  last7Days: UIConversation[];
  earlier: UIConversation[];
}

interface ConversationListProps {
  grouped: GroupedConversations;
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function Section({
  title,
  conversations,
  activeId,
  onSelect,
  onDelete,
}: {
  title: string;
  conversations: UIConversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-2 py-2">
        <span className="text-sm font-medium text-[var(--on-surface-variant)] opacity-70">
          {title}
        </span>
        <div className="h-px flex-1 bg-[var(--outline-variant)]/10" />
      </div>
      <div className="flex flex-col gap-0.5 pb-1">
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
    </div>
  );
}

export function ConversationList({
  grouped,
  activeId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  const [expanded, setExpanded] = useState(true);

  const total =
    grouped.today.length +
    grouped.yesterday.length +
    grouped.last7Days.length +
    grouped.earlier.length;

  if (total === 0) {
    return (
      <div className="px-2 py-6 text-center text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-1">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 px-2 py-2 text-left"
      >
        <span className="text-sm font-bold text-[var(--on-surface)]">
          History
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--on-surface-variant)] transition-transform duration-200 ${expanded ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {expanded && (
        <>
          <Section
            title="Today"
            conversations={grouped.today}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
          <Section
            title="Yesterday"
            conversations={grouped.yesterday}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
          <Section
            title="Previous 7 Days"
            conversations={grouped.last7Days}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
          <Section
            title="Earlier"
            conversations={grouped.earlier}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        </>
      )}
    </div>
  );
}
