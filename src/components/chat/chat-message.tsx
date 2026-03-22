"use client";

import { useState } from "react";
import { User, Bot, Copy, Pencil, Check, X } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { ThinkingBlock } from "./thinking-block";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string | null;
  thinkingDuration?: number;
  isStreaming?: boolean;
  onEdit?: (id: string, newContent: string) => void;
}

export function ChatMessage({
  id,
  role,
  content,
  thinking,
  thinkingDuration,
  isStreaming,
  onEdit,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content && onEdit) {
      onEdit(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex gap-4 px-4 py-6",
        isUser ? "bg-background" : "bg-muted/50"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md",
          isUser ? "bg-primary text-primary-foreground" : "bg-secondary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {thinking && (
          <ThinkingBlock content={thinking} duration={thinkingDuration} />
        )}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="mr-1 h-4 w-4" />
                Save & Regenerate
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : isStreaming ? (
              <span className="animate-pulse">Thinking...</span>
            ) : null}
          </div>
        )}
      </div>
      {!isStreaming && !isEditing && content && (
        <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {isUser && onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
