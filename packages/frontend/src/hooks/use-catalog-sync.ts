"use client";

import { useEffect, useRef } from "react";
import { ensureInit, getProviderCatalogService } from "@llm-chatter/services";

// Staleness-on-open catalog sync. Fires once per app session on mount and lets
// the server/IPC layer decide what's stale (lastSyncedAt > 24h). Non-blocking
// and silent — failures are logged but never surface to the user. This catches
// up imported providers whenever the app is opened, even after long absences.
export function useCatalogSync() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    ensureInit()
      .then(() => getProviderCatalogService().syncAll())
      .catch((error) => {
        console.error("Catalog auto-sync failed:", error);
      });
  }, []);
}
