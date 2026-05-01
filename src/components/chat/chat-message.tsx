"use client";

import { useState } from "react";
import type { UIMessage } from "ai";
import { Copy, Pencil, Check, X, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { ThinkingBlock } from "./thinking-block";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
  modelName?: string;
  onEdit?: (id: string, newContent: string) => void;
}

function getUserText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatMessage({
  message,
  isStreaming,
  modelName,
  onEdit,
}: ChatMessageProps) {
  const { id, role, parts } = message;
  const messageModelName =
    (message.metadata as { modelName?: string } | undefined)?.modelName ||
    modelName;
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const userText = isUser ? getUserText(message) : "";
  const [editContent, setEditContent] = useState(userText);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== userText && onEdit) {
      onEdit(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(userText);
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
              {userText}
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
                onClick={() => handleCopy(userText)}
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
  const hasContent = parts.some(
    (p) => p.type === "text" && p.text.trim().length > 0,
  );

  return (
    <div className="flex flex-col items-start gap-4">
      {/* AI avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--primary)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary-foreground)]" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white">
          {messageModelName || "AI"}
        </span>
      </div>

      {/* Parts rendering */}
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
        <div className="group relative w-full space-y-3">
          {parts.map((part, index) => {
            switch (part.type) {
              case "text":
                return part.text ? (
                  <div key={index} className="prose prose-sm max-w-none prose-invert prose-headings:text-white prose-p:text-neutral-300 prose-strong:text-white prose-code:text-[var(--primary)]">
                    <MarkdownRenderer content={part.text} />
                  </div>
                ) : null;
              case "reasoning":
                return (
                  <ThinkingBlock
                    key={index}
                    content={part.text}
                    defaultExpanded={part.state === "streaming"}
                  />
                );
              default:
                return null;
            }
          })}

          {/* Streaming indicator when no content yet */}
          {!hasContent && isStreaming && (
            <span className="animate-pulse text-[var(--on-surface-variant)]">Thinking...</span>
          )}

          {/* Action buttons */}
          {!isStreaming && hasContent && (
            <div className="absolute -bottom-8 left-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => handleCopy(getUserText(message))}
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
