"use client";

import { useState, useEffect } from "react";
import { DefaultChatTransport, type ChatTransport } from "ai";
import type { UIMessage } from "ai";
import { isTauri, getChatTransportConfig } from "@/lib/services";

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
    } else {
      setTransportReady(true);
    }
  }, []);

  return { transport, transportReady };
}
