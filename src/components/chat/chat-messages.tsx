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
}

export function ChatMessages({ messages, isLoading, onEditMessage }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Start a conversation</h1>
        <p className="text-muted-foreground">
          Send a message to begin chatting with the AI.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          id={message.id}
          role={message.role}
          content={message.content}
          thinking={message.thinking}
          thinkingDuration={message.thinkingDuration}
          isStreaming={isLoading && message === messages[messages.length - 1]}
          onEdit={onEditMessage}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
