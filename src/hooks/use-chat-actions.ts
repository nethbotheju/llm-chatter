"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import type { UseChatHelpers } from "@ai-sdk/react";
import type { Attachment } from "@/components/chat/chat-input";
import {
  getConversationService,
  getMessageService,
  ensureInit,
  isTauri,
  resolveChatConfig,
} from "@/lib/services";
import type { Assistant } from "@/lib/services";

export interface UseChatActionsOptions {
  chat: UseChatHelpers<UIMessage>;
  selectedModelId: string | null;
  currentAssistant: Assistant | null;
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  setCurrentAssistant: (assistant: Assistant | null) => void;
  assistants: Assistant[];
  fetchConversations: () => Promise<void>;
}

export function useChatActions(options: UseChatActionsOptions) {
  const {
    selectedModelId,
    currentAssistant,
    currentConversationId,
    setCurrentConversationId,
    setCurrentAssistant,
    assistants,
    fetchConversations,
  } = options;

  const router = useRouter();

  const chatRef = useRef(options.chat);
  chatRef.current = options.chat;

  const chatMessagesRef = useRef(options.chat.messages);
  chatMessagesRef.current = options.chat.messages;

  const buildRequestBody = useCallback(async (modelId: string, conversationId: string | null) => {
    if (isTauri()) {
      const config = await resolveChatConfig(modelId, conversationId);
      return {
        model: config.model,
        provider: config.provider,
        assistantConfig: config.assistantConfig,
      };
    }
    return { modelId, conversationId };
  }, []);

  const handleNewChat = useCallback(() => {
    chatRef.current.setMessages([]);
    setCurrentConversationId(null);
    const enabledAssistants = assistants.filter((a) => a.enabled);
    const defaultAssistant = enabledAssistants.find((a) => a.isDefault) || enabledAssistants[0];
    if (defaultAssistant) {
      setCurrentAssistant(defaultAssistant);
    }
    router.push("/");
  }, [setCurrentConversationId, setCurrentAssistant, assistants, router]);

  const handleSendMessage = useCallback(async (message: string, _attachments?: Attachment[]) => {
    if (!selectedModelId || !currentAssistant) return;

    await ensureInit();
    let convId = currentConversationId;
    if (!convId) {
      const data = await getConversationService().create({ assistantId: currentAssistant.id });
      convId = data.id;
      setCurrentConversationId(convId);
      router.push(`/c/${convId}`, { scroll: false });
    }

    const userParts = [{ type: "text" as const, text: message }];
    await getMessageService().create(convId, "user", JSON.stringify(userParts));

    if (chatMessagesRef.current.length === 0) {
      const title = message.slice(0, 50) + (message.length > 50 ? "..." : "");
      await getConversationService().update(convId, title);
      fetchConversations();
    }

    const body = await buildRequestBody(selectedModelId, convId);
    chatRef.current.sendMessage({ text: message }, { body });
  }, [currentConversationId, selectedModelId, currentAssistant, router, fetchConversations, buildRequestBody]);

  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!currentConversationId || !selectedModelId || !currentAssistant) return;

    const messages = chatMessagesRef.current;
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1 || messages[messageIndex].role !== "user") return;

    const messagesToKeep = messages.slice(0, messageIndex);
    const editedParts = [{ type: "text" as const, text: newContent }];

    try {
      await ensureInit();
      await getMessageService().update(currentConversationId, messageId, JSON.stringify(editedParts));
    } catch (error) {
      console.error("Failed to update message:", error);
      return;
    }

    const messagesToDelete = messages.slice(messageIndex + 1);
    for (const msg of messagesToDelete) {
      try {
        await getMessageService().delete(currentConversationId, msg.id);
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    }

    const editedMessage: UIMessage = {
      ...messages[messageIndex],
      parts: editedParts,
    };
    chatRef.current.setMessages([...messagesToKeep, editedMessage]);

    const body = await buildRequestBody(selectedModelId, currentConversationId);
    chatRef.current.sendMessage({ text: newContent, messageId: editedMessage.id }, { body });
  }, [currentConversationId, selectedModelId, currentAssistant, buildRequestBody]);

  const handleStop = useCallback(() => {
    chatRef.current.stop();
  }, []);

  return {
    handleNewChat,
    handleSendMessage,
    handleEditMessage,
    handleStop,
  };
}
