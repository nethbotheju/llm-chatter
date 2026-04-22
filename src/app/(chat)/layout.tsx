"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useChat, type UseChatOptions } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput, Attachment } from "@/components/chat/chat-input";
import { ModelSelector } from "@/components/chat/model-selector";
import { AssistantSelector } from "@/components/chat/assistant-selector";
import { TopAppBar } from "@/components/layout/top-app-bar";
import {
  getConversationService,
  getMessageService,
  getModelService,
  getAssistantService,
  ensureInit,
  isTauri,
  getChatTransportConfig,
  resolveChatConfig,
} from "@/lib/services";
import type { Model, Assistant } from "@/lib/services";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
}

function parseModelCapabilities(capabilities: string): string[] {
  try {
    return JSON.parse(capabilities);
  } catch {
    return [];
  }
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transport, setTransport] = useState<ChatTransport<UIMessage> | undefined>(undefined);
  const [transportReady, setTransportReady] = useState(false);

  useEffect(() => {
    if (isTauri()) {
      console.log("[Desktop] Resolving sidecar transport...");
      getChatTransportConfig()
        .then((config) => {
          console.log("[Desktop] Sidecar config:", config);
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
  const pathname = usePathname();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const currentConversationIdRef = useRef<string | null>(null);
  const setMessagesRef = useRef<((messages: UIMessage[]) => void) | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      await ensureInit();
      const data = await getConversationService().getAll();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  const onFinish = useCallback(async (options: { message: UIMessage; isAbort: boolean; isError: boolean }) => {
    fetchConversations();

    if (isTauri() && !options.isAbort && !options.isError && currentConversationIdRef.current) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_assistant_message", {
          input: {
            conversationId: currentConversationIdRef.current,
            messageId: options.message.id,
            role: options.message.role,
            parts: JSON.stringify(options.message.parts),
            metadata: options.message.metadata ? JSON.stringify(options.message.metadata) : null,
          },
        });
      } catch (error) {
        console.error("Failed to save assistant message:", error);
      }
    }
  }, [fetchConversations]);

  const chatOptions = useMemo<UseChatOptions<UIMessage>>(() => ({
    transport,
    onFinish,
  }), [transport, onFinish]);

  const chat = useChat(chatOptions);
  setMessagesRef.current = chat.setMessages;

  const pathConversationId = pathname.match(/\/c\/([^/]+)/)?.[1] || null;
  const isNewChat = pathname === "/";

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasVisionModel = selectedModel
    ? parseModelCapabilities(selectedModel.capabilities).includes("vision")
    : false;

  const selectedModelIdRef = useRef<string | null>(null);
  selectedModelIdRef.current = selectedModelId;

  const fetchModels = useCallback(async () => {
    try {
      await ensureInit();
      const data = await getModelService().getAll();
      setModels(data);
      if (data.length > 0 && !selectedModelIdRef.current) {
        setSelectedModelId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  }, []);

  const currentConversationIdRef2 = useRef<string | null>(null);
  currentConversationIdRef2.current = currentConversationId;

  const fetchAssistants = useCallback(async () => {
    try {
      await ensureInit();
      const service = getAssistantService();
      let data = await service.getAll();

      if (data.length === 0) {
        await service.create({
          name: "General",
          systemPrompt:
            "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses.",
          temperature: 0.7,
          topP: 1.0,
          isDefault: true,
          enabled: true,
        });
        data = await service.getAll();
      }

      setAssistants(data);
      if (!currentConversationIdRef2.current) {
        const enabledAssistants = data.filter((a: Assistant) => a.enabled);
        const defaultAssistant =
          enabledAssistants.find((a: Assistant) => a.isDefault) || enabledAssistants[0] || null;
        if (defaultAssistant) {
          setCurrentAssistant(defaultAssistant);
        }
      }
    } catch (error) {
      console.error("Failed to fetch assistants:", error);
    }
  }, []);

  const fetchConversationMessages = useCallback(async (id: string) => {
    try {
      await ensureInit();
      const data = await getConversationService().get(id);
      if (data.messages) {
        const uiMessages: UIMessage[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          parts: JSON.parse(m.parts),
          ...(m.metadata ? { metadata: JSON.parse(m.metadata) } : {}),
        }));
        setMessagesRef.current?.(uiMessages);
      }
      if (data.assistant) {
        setCurrentAssistant(data.assistant);
      }
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchModels();
    fetchAssistants();
  }, [fetchConversations, fetchModels, fetchAssistants]);

  useEffect(() => {
    if (
      pathConversationId &&
      pathConversationId !== currentConversationIdRef.current
    ) {
      currentConversationIdRef.current = pathConversationId;
      setCurrentConversationId(pathConversationId);
      fetchConversationMessages(pathConversationId);
    }
  }, [pathConversationId, fetchConversationMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleNewChat = useCallback(async () => {
    chat.setMessages([]);
    setCurrentConversationId(null);
    currentConversationIdRef.current = null;
    router.push("/");
    const enabledAssistants = assistants.filter((a) => a.enabled);
    const defaultAssistant = enabledAssistants.find((a) => a.isDefault) || enabledAssistants[0];
    if (defaultAssistant) {
      setCurrentAssistant(defaultAssistant);
    }
  }, [router, assistants, chat]);

  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/c/${id}`);
  }, [router]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await ensureInit();
      await getConversationService().delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === currentConversationId) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, [currentConversationId, handleNewChat]);

  const handleStop = useCallback(() => {
    chat.stop();
  }, [chat]);

  const handleSelectAssistant = useCallback((assistant: Assistant) => {
    if (!currentConversationId) {
      setCurrentAssistant(assistant);
    }
  }, [currentConversationId]);

  const buildRequestBody = useCallback(async (modelId: string, conversationId: string | null) => {
    if (isTauri()) {
      console.log("[Desktop] Resolving chat config for model:", modelId, "conv:", conversationId);
      const config = await resolveChatConfig(modelId, conversationId);
      console.log("[Desktop] Resolved config:", { model: config.model, providerType: config.provider.type, hasApiKey: !!config.provider.apiKey });
      return {
        model: config.model,
        provider: config.provider,
        assistantConfig: config.assistantConfig,
      };
    }
    return { modelId, conversationId };
  }, []);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentConversationId || !selectedModelId || !currentAssistant) return;

    const messageIndex = chat.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1 || chat.messages[messageIndex].role !== "user") return;

    const messagesToKeep = chat.messages.slice(0, messageIndex);
    const editedParts = [{ type: "text" as const, text: newContent }];

    try {
      await ensureInit();
      await getMessageService().update(
        currentConversationId,
        messageId,
        JSON.stringify(editedParts),
      );
    } catch (error) {
      console.error("Failed to update message:", error);
      return;
    }

    const messagesToDelete = chat.messages.slice(messageIndex + 1);
    for (const msg of messagesToDelete) {
      try {
        await getMessageService().delete(currentConversationId, msg.id);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }

    const editedMessage: UIMessage = {
      ...chat.messages[messageIndex],
      parts: editedParts,
    };
    chat.setMessages([...messagesToKeep, editedMessage]);

    const body = await buildRequestBody(selectedModelId, currentConversationId);
    chat.sendMessage({ text: newContent, messageId: editedMessage.id }, { body });
  }, [currentConversationId, chat, selectedModelId, currentAssistant, buildRequestBody]);

  const handleSendMessage = useCallback(async (message: string, attachments?: Attachment[]) => {
    if (!selectedModelId || !currentAssistant) return;

    await ensureInit();
    let convId = currentConversationId;
    if (!convId) {
      const data = await getConversationService().create({ assistantId: currentAssistant.id });
      convId = data.id;
      setCurrentConversationId(convId);
      currentConversationIdRef.current = convId;
      router.push(`/c/${convId}`, { scroll: false });
    }

    const userParts = [{ type: "text" as const, text: message }];

    await getMessageService().create(
      convId,
      "user",
      JSON.stringify(userParts),
    );

    if (chat.messages.length === 0) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      await getConversationService().update(convId, title);
      fetchConversations();
    }

    console.log("[Desktop] handleSendMessage:", { selectedModelId, hasAssistant: !!currentAssistant, convId });
    const body = await buildRequestBody(selectedModelId!, convId);
    console.log("[Desktop] Sending message with body keys:", Object.keys(body));
    chat.sendMessage({ text: message }, { body });
  }, [currentConversationId, selectedModelId, currentAssistant, router, fetchConversations, chat, buildRequestBody]);

  const modelName = selectedModel?.name || null;
  const isLoading = chat.status === "submitted" || chat.status === "streaming";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)]">
      <Sidebar
        conversations={conversations.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
        }))}
        activeConversationId={currentConversationId || undefined}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main content canvas */}
      <main className="relative ml-64 flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden overscroll-none custom-scrollbar scroll-smooth scroll-pb-28">
        {/* TopAppBar */}
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

        {/* Chat area */}
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

        {/* Fixed floating chat input */}
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
