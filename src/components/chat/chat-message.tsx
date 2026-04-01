"use client";

import { useState } from "react";
import { Copy, Pencil, Check, X, Sparkles } from "lucide-react";
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
  modelName?: string;
  onEdit?: (id: string, newContent: string) => void;
}

export function ChatMessage({
  id,
  role,
  content,
  thinking,
  thinkingDuration,
  isStreaming,
  modelName,
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

  if (isUser) {
    return (
      <div className="flex flex-col items-end gap-3">
        {isEditing ? (
          <div className="w-full max-w-[85%] space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px] border-[var(--outline-variant)]/20 bg-[var(--surface-container-highest)]/60 text-[var(--on-surface)]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit} className="bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90">
                <Check className="mr-1 h-4 w-4" />
                Save & Regenerate
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="text-[var(--on-surface-variant)]">
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative max-w-[85%]">
            <div className="rounded-3xl border border-[var(--outline-variant)]/10 bg-[var(--surface-container-highest)]/60 px-6 py-4 text-base leading-relaxed text-[var(--on-surface)]">
              {content}
            </div>
            <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleCopy}
                className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // AI message
  return (
    <div className="flex flex-col items-start gap-4">
      {/* AI avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--primary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary-foreground)]" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white">
          {modelName || "AI"}
        </span>
      </div>

      {/* Thinking block */}
      {thinking && (
        <ThinkingBlock content={thinking} duration={thinkingDuration} />
      )}

      {/* Content */}
      {isEditing ? (
        <div className="w-full space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] border-[var(--outline-variant)]/20 bg-[var(--surface-container-low)]"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSaveEdit}>
              <Check className="mr-1 h-4 w-4" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="group relative w-full">
          {content ? (
            <div className="prose prose-sm max-w-none prose-invert prose-headings:text-white prose-p:text-neutral-300 prose-strong:text-white prose-code:text-[var(--primary)]">
              <MarkdownRenderer content={content} />
            </div>
          ) : isStreaming ? (
            <span className="animate-pulse text-[var(--on-surface-variant)]">Thinking...</span>
          ) : null}

          {/* Action buttons */}
          {!isStreaming && content && (
            <div className="absolute -bottom-8 left-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-white"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
