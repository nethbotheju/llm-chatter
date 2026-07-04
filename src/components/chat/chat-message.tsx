"use client";

import { useState } from "react";
import type { UIMessage, FileUIPart } from "ai";
import { Copy, Pencil, Check, X, FileText, ExternalLink } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { ThinkingBlock } from "./thinking-block";
import { ToolInvocationBlock } from "./tool-invocation-block";
import { TypingDots } from "./typing-dots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { kindForMediaType } from "@/lib/models";

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
  const userFileParts = isUser
    ? (parts.filter((p): p is FileUIPart => p.type === "file") as FileUIPart[])
    : [];
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
        {userFileParts.length > 0 && !isEditing && (
          <div className="flex max-w-[85%] flex-wrap justify-end gap-2">
            {userFileParts.map((part, index) => {
              const kind = kindForMediaType(part.mediaType);
              if (kind === "image") {
                return (
                  <img
                    key={index}
                    src={part.url}
                    alt={part.filename || "Attachment"}
                    className="max-h-48 max-w-[85%] rounded-xl border border-[var(--outline-variant)]/20 object-contain"
                  />
                );
              }
              return (
                <a
                  key={index}
                  href={part.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={part.filename}
                  className="flex max-w-[85%] items-center gap-3 rounded-xl border border-[var(--outline-variant)]/20 bg-[var(--surface-container-high)]/60 px-4 py-3 transition-colors hover:bg-[var(--surface-container-highest)]/60"
                >
                  <FileText className="h-6 w-6 shrink-0 text-[var(--on-surface-variant)]" />
                  <span className="truncate text-sm text-[var(--on-surface)]">
                    {part.filename || "Document"}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)]" />
                </a>
              );
            })}
          </div>
        )}
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
          userText && (
            <div className="group relative max-w-[85%]">
              <div className="rounded-3xl border border-[var(--outline-variant)]/10 bg-[var(--surface-container-highest)]/60 px-6 py-4 text-base leading-relaxed text-[var(--on-surface)]">
                {userText}
              </div>
              <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {onEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleCopy(userText)}
                  className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  // AI message
  const hasContent = parts.some(
    (p) => p.type === "text" && p.text.trim().length > 0,
  );
  const hasOutput = parts.some(
    (p) =>
      (p.type === "text" && p.text.trim().length > 0) ||
      p.type === "reasoning" ||
      (typeof p.type === "string" &&
        (p.type === "dynamic-tool" || p.type.startsWith("tool-"))),
  );

  return (
    <div className="flex flex-col items-start">
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
        <div className="group w-full">
          <div className="space-y-3">
            {parts.map((part, index) => {
              switch (part.type) {
                case "text":
                  return part.text ? (
                    <div key={index}>
                      <MarkdownRenderer content={part.text} />
                    </div>
                  ) : null;
                case "reasoning":
                  return (
                    <ThinkingBlock
                      key={index}
                      content={part.text}
                      state={part.state ?? "done"}
                    />
                  );
                default:
                  if (
                    typeof part.type === "string" &&
                    (part.type === "dynamic-tool" || part.type.startsWith("tool-"))
                  ) {
                    return (
                      <ToolInvocationBlock
                        key={index}
                        part={part as unknown as Parameters<typeof ToolInvocationBlock>[0]["part"]}
                      />
                    );
                  }
                  return null;
              }
            })}

            {!hasOutput && isStreaming && <TypingDots />}
          </div>

          {!isStreaming && (
            <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <div className="flex items-center gap-0.5">
                {hasContent && (
                  <button
                    onClick={() => handleCopy(getUserText(message))}
                    className="rounded-md p-1.5 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              {messageModelName && (
                <span className="ml-auto px-1 text-xs font-medium text-[var(--on-surface-variant)]/70">
                  {messageModelName}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
