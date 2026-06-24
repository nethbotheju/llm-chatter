"use client";

import { useEffect, useCallback } from "react";
import { isElectron } from "@/lib/runtime";

interface UseKeyboardShortcutsOptions {
  onNewChat: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts({ onNewChat, onToggleSidebar }: UseKeyboardShortcutsOptions) {
  const handleNewChat = useCallback(() => {
    onNewChat();
  }, [onNewChat]);

  const handleToggleSidebar = useCallback(() => {
    onToggleSidebar?.();
  }, [onToggleSidebar]);

  useEffect(() => {
    const electron = isElectron();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        // In Electron, the menu accelerator handles Cmd+N and sends
        // a shortcut:new-chat IPC event. Skip the keydown handler to
        // avoid double-firing.
        if (!electron) onNewChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        window.location.href = "/settings";
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        // Same as Cmd+N — menu accelerator handles Cmd+B in Electron.
        if (!electron) onToggleSidebar?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNewChat, onToggleSidebar]);

  useEffect(() => {
    if (!isElectron()) return;
    const api = window.electronAPI!;

    const cleanup1 = api.onShortcut("new-chat", handleNewChat);
    const cleanup2 = api.onShortcut("toggle-sidebar", handleToggleSidebar);

    return () => {
      cleanup1();
      cleanup2();
    };
  }, [handleNewChat, handleToggleSidebar]);
}
