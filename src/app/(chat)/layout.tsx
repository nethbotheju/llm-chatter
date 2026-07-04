"use client";

import { useState, useEffect, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import type { ChatTransport, UIMessage } from "ai";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { AttachmentMismatchBanner } from "@/components/chat/attachment-mismatch-banner";
import { ModelSelector } from "@/components/chat/model-selector";
import { AssistantSelector } from "@/components/chat/assistant-selector";
import { TopAppBar } from "@/components/layout/top-app-bar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useTransport,
  useModels,
  useAssistants,
  useConversations,
  useConversationMessages,
  useChatOptions,
  useChatActions,
  useKeyboardShortcuts,
  useSidebarState,
  useCatalogSync,
} from "@/hooks";
import { toUIConversation } from "@/types";
import { isElectron } from "@/lib/runtime";
import type { Assistant } from "@/lib/services";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { transport, transportReady } = useTransport();
  useCatalogSync();

  if (!transportReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface)]">
        <div className="text-[var(--muted-foreground)]">Loading...</div>
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
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const {
    models,
    selectedModelId,
    setSelectedModelId,
    selectedModel,
    acceptedAttachmentKinds,
    acceptedMimeAccept,
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

  const { isNewChat, skipFetchRef } = useConversationMessages(
    chat.setMessages,
    setCurrentAssistant,
    setCurrentConversationId,
    currentConversationId,
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
    skipFetchRef,
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
    window.history.pushState(null, '', `/c/${id}`);
    setCurrentConversationId(id);
  }, []);

  const { isCollapsed, toggle: toggleSidebar, mounted } = useSidebarState();

  // Prevent hydration mismatch: always render expanded during SSR/hydration,
  // then transition to the stored collapsed state after mount.
  const effectiveCollapsed = mounted && isCollapsed;

  useKeyboardShortcuts({ onNewChat: handleNewChat, onToggleSidebar: toggleSidebar });

  useEffect(() => {
    if (!isElectron()) return;
    const cleanup = window.electronAPI!.onAction("open-about", () => setAboutOpen(true));
    return cleanup;
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchModels();
    fetchAssistants();
  }, [fetchConversations, fetchModels, fetchAssistants]);

  const modelName = selectedModel?.name || null;
  const isLoading = chat.status === "submitted" || chat.status === "streaming";
  const chatError = chat.error;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)]">
      <Sidebar
        conversations={conversations.map(toUIConversation)}
        activeConversationId={currentConversationId || undefined}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isCollapsed={effectiveCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <main className={`relative flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden overscroll-none custom-scrollbar scroll-smooth scroll-pb-28 transition-[margin] duration-300 ease-in-out ${effectiveCollapsed ? "ml-16" : "ml-[280px]"}`}>
        <TopAppBar
          assistantName={currentAssistant?.name || null}
          modelName={modelName}
          assistantDropdown={
            <button className="flex items-center gap-1 text-sm font-semibold text-[var(--on-surface)]">
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
          onToggleSidebar={toggleSidebar}
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
            {chatError && (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--on-surface)]">
                <span className="font-medium">Request failed:</span>
                <span className="flex-1 break-words text-[var(--on-surface-variant)]">
                  {chatError.message}
                </span>
              </div>
            )}
            <AttachmentMismatchBanner
              messages={chat.messages}
              acceptedKinds={acceptedAttachmentKinds}
              modelName={modelName}
            />
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStop}
              isLoading={isLoading}
              disabled={models.length === 0 || !currentAssistant}
              acceptedKinds={acceptedAttachmentKinds}
              acceptedMimeAccept={acceptedMimeAccept}
            />
          </div>
        </footer>
      </main>

      {children}

      {/* About Dialog (Electron only) */}
      {isElectron() && (
        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent className="border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="tracking-tight text-[var(--on-surface)]">
                llm Chatter
              </DialogTitle>
              <DialogDescription className="text-[var(--on-surface-variant)]">
                Multi-provider LLM chat application
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-[var(--on-surface-variant)]">
              <p>Version 1.0.0</p>
              <p>
                Supports OpenAI, Anthropic, Google, and compatible API providers.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
