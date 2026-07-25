"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUpdater } from "../../hooks/use-updater";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import type { UpdaterStatus } from "@llm-chatter/contracts";

const AUTO_HIDE_MS: Partial<Record<UpdaterStatus["state"], number>> = {
  "not-available": 4000,
  error: 6000,
};

export function UpdateBanner() {
  const { status, supported, installUpdate } = useUpdater();
  const [dismissedState, setDismissedState] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setDismissedState(null);

    const delay = AUTO_HIDE_MS[status.state];
    if (delay) {
      timerRef.current = setTimeout(
        () => setDismissedState(status.state),
        delay,
      );
    }
  }, [status]);

  if (!supported || status.state === "idle") return null;
  if (dismissedState === status.state) return null;

  const dismiss = () => setDismissedState(status.state);

  const { icon, title, body } = bannerContent(status);

  return (
    <div className="titlebar-no-drag fixed right-4 top-4 z-[100] w-[22rem] max-w-[calc(100vw-2rem)]">
      <div className="glass-card flex items-start gap-3 p-4 shadow-2xl">
        <div className="mt-0.5 shrink-0">{icon}</div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-[var(--on-surface)]">
            {title}
          </p>
          {body && (
            <p className="text-xs text-[var(--on-surface-variant)]">{body}</p>
          )}
          {status.state === "downloading" && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-container-highest)]">
              <div
                className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
                style={{ width: `${status.percent}%` }}
              />
            </div>
          )}
          {status.state === "downloaded" && (
            <button
              type="button"
              onClick={installUpdate}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[var(--on-primary)] transition-colors hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Restart now
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-highest)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function bannerContent(status: UpdaterStatus): {
  icon: ReactNode;
  title: string;
  body?: string;
} {
  switch (status.state) {
    case "checking":
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />,
        title: "Checking for updates…",
      };
    case "not-available":
      return {
        icon: (
          <CheckCircle2 className="h-5 w-5 text-[var(--primary)]" />
        ),
        title: "You're up to date",
        body: "llm Chatter is on the latest version.",
      };
    case "available":
      return {
        icon: <Download className="h-5 w-5 text-[var(--primary)]" />,
        title: `Update v${status.version} available`,
        body: "Downloading in the background…",
      };
    case "downloading":
      return {
        icon: <Download className="h-5 w-5 text-[var(--primary)]" />,
        title: `Downloading v${status.version}`,
        body: `${status.percent}% complete`,
      };
    case "downloaded":
      return {
        icon: <Download className="h-5 w-5 text-[var(--primary)]" />,
        title: `Update v${status.version} ready`,
        body: "Restart to apply the update.",
      };
    case "error":
      return {
        icon: (
          <AlertCircle className="h-5 w-5 text-[var(--destructive)]" />
        ),
        title: "Couldn't check for updates",
        body: status.message,
      };
    default:
      return { icon: null, title: "" };
  }
}
