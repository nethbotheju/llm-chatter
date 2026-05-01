"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface UseKeyboardShortcutsOptions {
  onNewChat: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts({ onNewChat, onToggleSidebar }: UseKeyboardShortcutsOptions) {
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onToggleSidebar?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, onToggleSidebar, router]);
}
