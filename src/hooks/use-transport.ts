"use client";

import { useState, useEffect } from "react";
import type { ChatTransport } from "ai";
import type { UIMessage } from "ai";
import { isElectron } from "@/lib/services";
import { ElectronChatTransport } from "@/lib/services/chat-transport";

export function useTransport() {
  const [transport, setTransport] = useState<ChatTransport<UIMessage> | undefined>(undefined);
  const [transportReady, setTransportReady] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (isElectron()) {
        setTransport(new ElectronChatTransport());
      }
      setTransportReady(true);
    });
  }, []);

  return { transport, transportReady };
}
