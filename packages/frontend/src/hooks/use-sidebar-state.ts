"use client";

import { useState, useEffect, useCallback } from "react";
import { getAppConfigService, ensureInit } from "@llm-chatter/services";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await ensureInit();
        const stored = await getAppConfigService().get<boolean>(SIDEBAR_COLLAPSED_KEY);
        if (active) setIsCollapsed(stored === true);
      } catch {
        // keep default (expanded)
      }
      if (active) setMounted(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      void getAppConfigService().set(SIDEBAR_COLLAPSED_KEY, next);
      return next;
    });
  }, []);

  return { isCollapsed, toggle, mounted } as const;
}
