"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./chat-message";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string | null;
  thinkingDuration?: number;
}

interface ChatMessagesProps {
  messages: Message[];
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
    <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar">
      <div className="mx-auto w-full max-w-4xl space-y-12 px-6 py-8 md:px-12">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            id={message.id}
            role={message.role}
            content={message.content}
            thinking={message.thinking}
            thinkingDuration={message.thinkingDuration}
            isStreaming={isLoading && message === messages[messages.length - 1]}
            modelName={message.role === "assistant" ? modelName : undefined}
            onEdit={message.role === "user" ? onEditMessage : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
