"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { ChatMessage } from "./chat-message";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading?: boolean;
  onEditMessage?: (id: string, newContent: string) => void;
  modelName?: string;
}

export function ChatMessages({ messages, isLoading, onEditMessage, modelName }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-4xl px-6 py-8 md:px-12">
        <div className="space-y-8">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={isLoading && message === messages[messages.length - 1]}
              modelName={message.role === "assistant" ? modelName : undefined}
              onEdit={message.role === "user" ? onEditMessage : undefined}
            />
          ))}
        </div>
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
