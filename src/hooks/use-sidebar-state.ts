"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "llm-chatter:sidebar-collapsed";

function getStoredCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch {
    return false;
  }
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useSidebarState() {
  const isCollapsed = useSyncExternalStore(
    subscribeToStorage,
    () => getStoredCollapsed(),
    () => false,
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const toggle = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(!isCollapsed));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      // localStorage unavailable
    }
  }, [isCollapsed]);

  return { isCollapsed, toggle, mounted } as const;
}
