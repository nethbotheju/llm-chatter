"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Plus, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Attachment {
  id: string;
  type: "image";
  url: string;
  file?: File;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  hasVisionModel?: boolean;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  disabled,
  hasVisionModel = true,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    const canSubmit = (input.trim() || attachments.length > 0) && !isLoading && !disabled;
    if (canSubmit) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
      setInput("");
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_SIZE) {
        console.warn(`Image ${file.name} exceeds 5MB limit`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type: "image",
          url: reader.result as string,
          file,
        };
        setAttachments((prev) => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = (input.trim() || attachments.length > 0) && !disabled;

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-2">
          {attachments.map((att) => (
            <div key={att.id} className="relative">
              <img
                src={att.url}
                alt="Attachment"
                className="h-20 w-20 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:opacity-90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className="chat-input-glass rounded-[32px] border border-[var(--outline-variant)]/30 shadow-2xl"
      >
        {/* Input row */}
        <div className="flex items-center p-2">
          {hasVisionModel && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isLoading}
                className="ml-2 mr-0 rounded-full p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </>
          )}

          <div className={cn("flex flex-1 items-center pr-4", hasVisionModel ? "pl-2" : "pl-6")}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={disabled}
              rows={1}
              className="max-h-48 min-h-[44px] w-full resize-none border-none bg-transparent py-2 text-base text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/50 focus:outline-none focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-2 pr-2">
            <button
              type="button"
              className="p-2 text-[var(--on-surface-variant)] transition-colors hover:text-[var(--on-surface)]"
            >
              <Mic className="h-5 w-5" />
            </button>

            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--destructive)] text-[var(--destructive-foreground)] transition-all hover:opacity-90 active:scale-95"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95",
                  canSend
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                    : "bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] opacity-50"
                )}
              >
                <ArrowUp className="h-5 w-5 font-bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
