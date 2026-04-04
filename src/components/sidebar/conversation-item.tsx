"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  id: string;
  title: string | null;
  createdAt: Date;
  isActive?: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  id,
  title,
  createdAt,
  isActive,
  onClick,
  onDelete,
}: ConversationItemProps) {
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg px-4 py-2 text-sm transition-colors",
        isActive
          ? "bg-[var(--surface-bright)] text-[var(--primary)]"
          : "text-neutral-400 hover:bg-[var(--surface-container-high)] hover:text-neutral-100"
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <div className="flex-1 truncate">
        <span className="truncate font-medium">
          {title || "New conversation"}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
