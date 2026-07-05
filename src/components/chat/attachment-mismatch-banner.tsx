"use client";

import { useMemo, useState } from "react";
import type { UIMessage, FileUIPart } from "ai";
import { AlertTriangle, X } from "lucide-react";
import { kindForMediaType, type AttachmentKind } from "@/lib/models";

interface AttachmentMismatchBannerProps {
  messages: UIMessage[];
  acceptedKinds: AttachmentKind[];
  modelName: string | null;
}

const KIND_LABEL: Record<AttachmentKind, string> = {
  image: "images",
  pdf: "PDFs",
};

export function AttachmentMismatchBanner({
  messages,
  acceptedKinds,
  modelName,
}: AttachmentMismatchBannerProps) {
  const presentKinds = useMemo(() => {
    const set = new Set<AttachmentKind>();
    for (const m of messages) {
      for (const part of m.parts) {
        if (part.type !== "file") continue;
        const kind = kindForMediaType((part as FileUIPart).mediaType);
        if (kind) set.add(kind);
      }
    }
    return set;
  }, [messages]);

  const mismatched = useMemo(
    () => [...presentKinds].filter((k) => !acceptedKinds.includes(k)),
    [presentKinds, acceptedKinds],
  );

  const signature = mismatched.map((k) => k).sort().join(",");
  const [dismissed, setDismissed] = useState(false);
  const [lastSignature, setLastSignature] = useState(signature);
  if (signature !== lastSignature) {
    setLastSignature(signature);
    setDismissed(false);
  }

  if (mismatched.length === 0 || dismissed) return null;

  const label = mismatched.map((k) => KIND_LABEL[k]).join(" and ");
  const modelPhrase = modelName
    ? `${modelName} can't process`
    : "the selected model can't process";

  return (
    <div className="mb-2 flex items-start gap-2 rounded-2xl border border-[var(--outline-variant)]/30 bg-[var(--chat-input-bg)] px-3 py-2 text-sm text-[var(--on-surface-variant)] backdrop-blur-xl">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tertiary)]" />
      <p className="flex-1 leading-relaxed">
        This conversation has{" "}
        <span className="font-medium text-[var(--on-surface)]">{label}</span> that{" "}
        {modelPhrase}. They&apos;ll be left out of your next message. Switch to a
        model that supports them for full context.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-highest)]"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
