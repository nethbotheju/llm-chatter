"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { FileUIPart } from "ai";
import { ArrowUp, Square, Plus, Mic, X, FileText } from "lucide-react";
import {
  validateAttachmentFile,
  kindForMediaType,
  type AttachmentKind,
} from "@/lib/models";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, attachments?: FileUIPart[]) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  acceptedKinds?: AttachmentKind[];
  acceptedMimeAccept?: string;
}

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "image",
  pdf: "PDF",
};

export function ChatInput({
  onSend,
  onStop,
  isLoading,
  disabled,
  acceptedKinds = [],
  acceptedMimeAccept = "",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileUIPart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const attachmentsEnabled = acceptedKinds.length > 0;

  // Auto-resize the textarea while preserving the scroll position of every
  // scrollable ancestor. Without this, Chromium (and therefore the Electron
  // desktop build) scrolls the focused textarea into view as it grows, yanking
  // the user back to the bottom of the history when they had scrolled up to
  // read older messages.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollableAncestors: HTMLElement[] = [];
    let el: HTMLElement | null = textarea.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(style.overflowY + style.overflow)) {
        scrollableAncestors.push(el);
      }
      el = el.parentElement;
    }

    const scrollTops = scrollableAncestors.map((ancestor) => ancestor.scrollTop);

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    scrollableAncestors.forEach((ancestor, i) => {
      ancestor.scrollTop = scrollTops[i];
    });
  }, [input]);

  // Electron's Chromium aggressively scrolls a focused textarea into view on
  // every keystroke, even when the textarea height does not change. Capture the
  // scroll position on each input event and restore it in the next frame so
  // typing while reading older messages does not pull the view back down.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const scrollableAncestors: HTMLElement[] = [];
    let el: HTMLElement | null = textarea.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (/(auto|scroll|overlay)/.test(style.overflowY + style.overflow)) {
        scrollableAncestors.push(el);
      }
      el = el.parentElement;
    }

    let rafId: number | null = null;
    const onBeforeInput = () => {
      const scrollTops = scrollableAncestors.map((ancestor) => ancestor.scrollTop);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        scrollableAncestors.forEach((ancestor, i) => {
          ancestor.scrollTop = scrollTops[i];
        });
      });
    };

    textarea.addEventListener("beforeinput", onBeforeInput);
    return () => {
      textarea.removeEventListener("beforeinput", onBeforeInput);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Shared attachment ingestion for the picker, drag-drop and clipboard paste.
  // Validates each file against the model's accepted kinds and reports the
  // first rejection as an inline error above the input.
  const addFiles = async (files: File[]) => {
    if (files.length === 0) return;

    if (acceptedKinds.length === 0) {
      setError("This model doesn't support attachments.");
      return;
    }

    const supported = acceptedKinds.map((k) => KIND_LABEL[k]).join(" or ");
    const errors: string[] = [];

    for (const file of files) {
      const kind = kindForMediaType(file.type);
      if (!kind) {
        errors.push(`"${file.name}" is not a supported file type.`);
        continue;
      }
      if (!acceptedKinds.includes(kind)) {
        errors.push(`This model only supports ${supported} attachments.`);
        continue;
      }
      const result = validateAttachmentFile(file);
      if (!result.ok) {
        errors.push(result.error!);
        continue;
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const part: FileUIPart = {
        type: "file",
        mediaType: file.type,
        filename: file.name,
        url: dataUrl,
      };
      setAttachments((prev) => [...prev, part]);
    }

    setError(errors.length > 0 ? errors[0] : null);
  };

  const handleSubmit = () => {
    const canSubmit = (input.trim() || attachments.length > 0) && !isLoading && !disabled;
    if (canSubmit) {
      onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
      setInput("");
      setAttachments([]);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await addFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Insert pasted image/file data as an attachment; let plain-text pastes fall
  // through to the textarea unchanged.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length === 0) return;

    e.preventDefault();
    void addFiles(files);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = (input.trim() || attachments.length > 0) && !disabled;

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-2">
          {attachments.map((att, index) => {
            const kind = kindForMediaType(att.mediaType);
            return (
              <div key={index} className="relative">
                {kind === "image" ? (
                  <img
                    src={att.url}
                    alt={att.filename || "Attachment"}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-44 items-center gap-2 rounded-lg border border-[var(--outline-variant)]/30 bg-[var(--surface-container-high)]/60 px-3">
                    <FileText className="h-6 w-6 shrink-0 text-[var(--on-surface-variant)]" />
                    <span className="truncate text-xs text-[var(--on-surface)]">
                      {att.filename || "Document"}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:opacity-90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mb-2 px-3 text-xs text-[var(--destructive)]">{error}</div>
      )}

      <div className="chat-input-glass rounded-[32px] border border-[var(--outline-variant)]/30 shadow-2xl">
        {/* Input row */}
        <div className="flex items-center p-2">
          {attachmentsEnabled && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedMimeAccept}
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isLoading}
                title="Attach files"
                className="ml-2 mr-0 rounded-full p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)] disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </>
          )}

          <div className={cn("flex flex-1 items-center pr-4", attachmentsEnabled ? "pl-2" : "pl-6")}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
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
                    : "bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] opacity-50",
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
