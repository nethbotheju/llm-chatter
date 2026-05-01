"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  onNewChat: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts({ onNewChat, onToggleSidebar }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        onNewChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        window.location.href = "/settings";
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onToggleSidebar?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, onToggleSidebar]);
}
