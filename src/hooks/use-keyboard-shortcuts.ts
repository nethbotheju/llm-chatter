"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface UseKeyboardShortcutsOptions {
  onNewChat: () => void;
}

export function useKeyboardShortcuts({ onNewChat }: UseKeyboardShortcutsOptions) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        onNewChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, router]);
}
