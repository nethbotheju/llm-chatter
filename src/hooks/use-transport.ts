"use client";

import { useState, useEffect } from "react";
import { DefaultChatTransport, type ChatTransport } from "ai";
import type { UIMessage } from "ai";
import { isTauri, isElectron, getChatTransportConfig } from "@/lib/services";
import { ElectronChatTransport } from "@/lib/services/chat-transport";

export function useTransport() {
  const [transport, setTransport] = useState<ChatTransport<UIMessage> | undefined>(undefined);
  const [transportReady, setTransportReady] = useState(false);

  useEffect(() => {
    if (isTauri()) {
      getChatTransportConfig()
        .then((config) => {
          if (config) {
            setTransport(new DefaultChatTransport({
              api: config.apiUrl,
              headers: config.headers,
            }));
          }
          setTransportReady(true);
        })
        .catch((err) => {
          console.error("[Desktop] Failed to resolve sidecar transport:", err);
          setTransportReady(true);
        });
      return;
    }

    // Electron and web: defer to microtask to avoid synchronous setState in effect body,
    // matching the async pattern used by the Tauri branch above.
    Promise.resolve().then(() => {
      if (isElectron()) {
        setTransport(new ElectronChatTransport());
      }
      setTransportReady(true);
    });
  }, []);

  return { transport, transportReady };
}
