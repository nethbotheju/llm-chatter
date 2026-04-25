"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import type { ChatTransport, UIMessage } from "ai";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { ModelSelector } from "@/components/chat/model-selector";
import { AssistantSelector } from "@/components/chat/assistant-selector";
import { TopAppBar } from "@/components/layout/top-app-bar";
import {
  useTransport,
  useModels,
  useAssistants,
  useConversations,
  useConversationMessages,
  useChatOptions,
  useChatActions,
  useKeyboardShortcuts,
} from "@/hooks";
import { toUIConversation } from "@/types";
import type { Assistant } from "@/lib/services";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { transport, transportReady } = useTransport();

  if (!transportReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <ChatLayoutInner transport={transport}>
      {children}
    </ChatLayoutInner>
  );
}

function ChatLayoutInner({
  transport,
  children,
}: {
  transport: ChatTransport<UIMessage> | undefined;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const {
    models,
    selectedModelId,
    setSelectedModelId,
    selectedModel,
    hasVisionModel,
    fetchModels,
  } = useModels();

  const {
    assistants,
    currentAssistant,
    setCurrentAssistant,
    selectAssistant,
    fetchAssistants,
  } = useAssistants();

  const {
    conversations,
    fetchConversations,
    deleteConversation,
  } = useConversations();

  const chatOptions = useChatOptions(transport, fetchConversations, currentConversationId);
  const chat = useChat(chatOptions);

  const { isNewChat } = useConversationMessages(
    chat.setMessages,
    setCurrentAssistant,
    setCurrentConversationId,
  );

  const {
    handleNewChat,
    handleSendMessage,
    handleEditMessage,
    handleStop,
  } = useChatActions({
    chat,
    selectedModelId,
    currentAssistant,
    currentConversationId,
    setCurrentConversationId,
    setCurrentAssistant,
    assistants,
    fetchConversations,
  });

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (id === currentConversationId) {
      handleNewChat();
    }
  }, [deleteConversation, currentConversationId, handleNewChat]);

  const handleSelectAssistant = useCallback((assistant: Assistant) => {
    if (!currentConversationId) {
      selectAssistant(assistant);
    }
  }, [currentConversationId, selectAssistant]);

  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/c/${id}`);
  }, [router]);

  useKeyboardShortcuts({ onNewChat: handleNewChat });

  useEffect(() => {
    fetchConversations();
    fetchModels();
    fetchAssistants();
  }, [fetchConversations, fetchModels, fetchAssistants]);

  const modelName = selectedModel?.name || null;
  const isLoading = chat.status === "submitted" || chat.status === "streaming";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)]">
      <Sidebar
        conversations={conversations.map(toUIConversation)}
        activeConversationId={currentConversationId || undefined}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className="relative ml-64 flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden overscroll-none custom-scrollbar scroll-smooth scroll-pb-28">
        <TopAppBar
          assistantName={currentAssistant?.name || null}
          modelName={modelName}
          assistantDropdown={
            <button className="flex items-center gap-1 text-sm font-semibold text-white">
              {currentAssistant?.name || "Select"}
            </button>
          }
          modelDropdown={
            <ModelSelector
              models={models}
              selectedModelId={selectedModelId}
              onSelectModel={setSelectedModelId}
              disabled={isLoading}
              compact
            />
          }
        />

        {isNewChat && chat.messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <AssistantSelector
              assistants={assistants}
              selectedAssistant={currentAssistant}
              onSelect={handleSelectAssistant}
            />
          </div>
        ) : (
          <ChatMessages
            messages={chat.messages}
            isLoading={isLoading}
            onEditMessage={handleEditMessage}
            modelName={modelName ?? undefined}
          />
        )}

        <footer className="pointer-events-none sticky bottom-0 z-30 pb-6 mt-auto">
          <div className="pointer-events-auto mx-auto max-w-4xl px-6 md:px-12">
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStop}
              isLoading={isLoading}
              disabled={models.length === 0 || !currentAssistant}
              hasVisionModel={hasVisionModel}
            />
          </div>
        </footer>
      </main>

      {children}
    </div>
  );
}
