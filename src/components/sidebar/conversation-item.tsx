"use client";

import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
        "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
        isActive && "bg-muted"
      )}
      onClick={onClick}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 truncate">
        <div className="truncate font-medium">
          {title || "New conversation"}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(createdAt, { addSuffix: true })}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100"
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
