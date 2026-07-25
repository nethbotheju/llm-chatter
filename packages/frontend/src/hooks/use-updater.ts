"use client";

import { useCallback, useEffect, useState } from "react";
import { isElectron } from "@llm-chatter/services";
import type { UpdaterStatus } from "@llm-chatter/contracts";

const IDLE: UpdaterStatus = { state: "idle" };

export function useUpdater() {
  const [status, setStatus] = useState<UpdaterStatus>(IDLE);

  const supported =
    typeof window !== "undefined" &&
    isElectron() &&
    !!window.electronAPI?.updater;

  useEffect(() => {
    if (!supported) return;
    const api = window.electronAPI!.updater!;
    void api.getStatus().then(setStatus);
    const off = api.onStatus(setStatus);
    return off;
  }, [supported]);

  const checkForUpdates = useCallback(() => {
    if (supported) void window.electronAPI!.updater!.checkForUpdates();
  }, [supported]);

  const installUpdate = useCallback(() => {
    if (supported) void window.electronAPI!.updater!.installUpdate();
  }, [supported]);

  return { status, supported, checkForUpdates, installUpdate };
}
