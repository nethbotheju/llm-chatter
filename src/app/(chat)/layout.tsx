"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatMessages, Message } from "@/components/chat/chat-messages";
import { ChatInput, Attachment } from "@/components/chat/chat-input";
import { ModelSelector } from "@/components/chat/model-selector";
import { AssistantSelector } from "@/components/chat/assistant-selector";

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string;
  enabled: boolean;
  provider: {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  };
}

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
}

interface Assistant {
  id: string;
  name: string;
  image?: string | null;
  systemPrompt: string;
  temperature: number;
  topP: number;
  isDefault: boolean;
  enabled: boolean;
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
  const router = useRouter();
  const pathname = usePathname();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Extract conversation ID from path
  const pathConversationId = pathname.match(/\/c\/([^/]+)/)?.[1] || null;
  const isNewChat = pathname === "/" && !currentConversationId;

  // Check if selected model supports vision
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasVisionModel = selectedModel
    ? parseModelCapabilities(selectedModel.capabilities).includes("vision")
    : false;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data);
      if (data.length > 0 && !selectedModelId) {
        setSelectedModelId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  }, [selectedModelId]);

  const fetchAssistants = useCallback(async () => {
    try {
      const res = await fetch("/api/assistants");
      const data = await res.json();
      setAssistants(data);
      // Set default assistant for new chats
      if (!currentConversationId) {
        const defaultAssistant = data.find((a: Assistant) => a.isDefault) || data[0];
        if (defaultAssistant) {
          setCurrentAssistant(defaultAssistant);
        }
      }
    } catch (error) {
      console.error("Failed to fetch assistants:", error);
    }
  }, [currentConversationId]);

  const fetchConversationMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/conversations?id=${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; thinking?: string | null }) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
            thinking: m.thinking,
          }))
        );
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
    if (pathConversationId && pathConversationId !== currentConversationId) {
      setCurrentConversationId(pathConversationId);
      fetchConversationMessages(pathConversationId);
    }
  }, [pathConversationId, currentConversationId, fetchConversationMessages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N for new chat
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      // Cmd/Ctrl + , for settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleNewChat = useCallback(async () => {
    setMessages([]);
    setCurrentConversationId(null);
    router.push("/");
    // Reset to default assistant
    const defaultAssistant = assistants.find((a) => a.isDefault) || assistants[0];
    if (defaultAssistant) {
      setCurrentAssistant(defaultAssistant);
    }
  }, [router, assistants]);

  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/c/${id}`);
  }, [router]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === currentConversationId) {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, [currentConversationId, handleNewChat]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const handleSelectAssistant = useCallback((assistant: Assistant) => {
    // Only allow changing assistant for new chats
    if (!currentConversationId) {
      setCurrentAssistant(assistant);
    }
  }, [currentConversationId]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentConversationId || !selectedModelId || !currentAssistant) return;

    // Find the message index
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== "user") return;

    // Keep messages up to and including the edited one, then update the content
    const messagesToKeep = messages.slice(0, messageIndex);
    const editedMessage: Message = {
      ...messages[messageIndex],
      content: newContent,
    };

    // Update the message in the database
    try {
      await fetch(`/api/conversations/${currentConversationId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content: newContent }),
      });
    } catch (error) {
      console.error("Failed to update message:", error);
      return;
    }

    // Delete all messages after the edited one
    const messagesToDelete = messages.slice(messageIndex + 1);
    for (const msg of messagesToDelete) {
      try {
        await fetch(`/api/conversations/${currentConversationId}/messages?messageId=${msg.id}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }

    // Update local state
    setMessages([...messagesToKeep, editedMessage]);

    // Regenerate response
    const messagesForApi = [...messagesToKeep, editedMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add assistant placeholder
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    // Stream response
    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          modelId: selectedModelId,
          conversationId: currentConversationId,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullContent += chunk;

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === "assistant") {
            lastMessage.content = fullContent;
          }
          return newMessages;
        });
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Chat error:", error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentConversationId, messages, selectedModelId, currentAssistant]);

  const handleSendMessage = useCallback(async (message: string, attachments?: Attachment[]) => {
    if (!selectedModelId || !currentAssistant) return;

    // Create conversation if needed
    let convId = currentConversationId;
    if (!convId) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId: currentAssistant.id }),
      });
      const data = await res.json();
      convId = data.id;
      setCurrentConversationId(convId);
      router.push(`/c/${convId}`, { scroll: false });
    }

    // Build message content with attachments
    let messageContent = message;
    const attachmentData = attachments?.map((a) => ({
      type: a.type,
      url: a.url,
    }));

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Save user message to DB
    await fetch(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "user",
        content: message,
        attachments: attachmentData ? JSON.stringify(attachmentData) : undefined,
      }),
    });

    // Update conversation title if it's the first message
    if (messages.length === 0) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: convId, title }),
      });
      fetchConversations();
    }

    // Build messages for API (with image content for vision models)
    const messagesForApi = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add assistant placeholder
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: "",
    };
    setMessages([...updatedMessages, assistantMessage]);

    // Stream response
    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForApi,
          modelId: selectedModelId,
          conversationId: convId,
          attachments: attachmentData,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullContent += chunk;

        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === "assistant") {
            lastMessage.content = fullContent;
          }
          return newMessages;
        });
      }

      fetchConversations();
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Chat error:", error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentConversationId, messages, selectedModelId, currentAssistant, router, fetchConversations]);

  return (
    <div className="flex h-screen">
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
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-4">
            {currentAssistant && (
              <span className="text-sm text-muted-foreground">
                {currentAssistant.name}
              </span>
            )}
          </div>
          <ModelSelector
            models={models}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            disabled={isLoading}
          />
        </div>
        {isNewChat && messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4">
            <AssistantSelector
              assistants={assistants}
              selectedAssistant={currentAssistant}
              onSelect={handleSelectAssistant}
            />
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStop}
              isLoading={isLoading}
              disabled={models.length === 0 || !currentAssistant}
              hasVisionModel={hasVisionModel}
            />
          </div>
        ) : (
          <>
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onEditMessage={handleEditMessage}
            />
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStop}
              isLoading={isLoading}
              disabled={models.length === 0 || !currentAssistant}
              hasVisionModel={hasVisionModel}
            />
          </>
        )}
      </div>
      {children}
    </div>
  );
}
