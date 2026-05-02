"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "llm-chatter:sidebar-collapsed";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // localStorage unavailable
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed));
    } catch {
      // localStorage unavailable
    }
  }, [isCollapsed, mounted]);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return { isCollapsed, toggle, mounted } as const;
}
