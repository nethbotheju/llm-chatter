"use client";

import { Star, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface AssistantSelectorProps {
  assistants: Assistant[];
  selectedAssistant: Assistant | null;
  onSelect: (assistant: Assistant) => void;
}

export function AssistantSelector({
  assistants,
  selectedAssistant,
  onSelect,
}: AssistantSelectorProps) {
  const enabledAssistants = assistants.filter((a) => a.enabled);

  if (enabledAssistants.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 w-full max-w-2xl mx-auto">
      <h2 className="mb-4 text-center text-lg font-medium text-muted-foreground">
        Choose an assistant to begin
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {enabledAssistants.map((assistant) => (
          <button
            key={assistant.id}
            onClick={() => onSelect(assistant)}
            className={cn(
              "group relative flex flex-col items-center rounded-lg border p-4 text-center transition-all hover:border-primary/50",
              selectedAssistant?.id === assistant.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            {assistant.isDefault && (
              <div className="absolute right-1 top-1">
                <Star className="h-3 w-3 fill-primary text-primary" />
              </div>
            )}
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              {assistant.image ? (
                <img
                  src={assistant.image}
                  alt={assistant.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <Bot className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <span className="text-sm font-medium">{assistant.name}</span>
            <span className="mt-1 text-xs text-muted-foreground">
              T: {assistant.temperature}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
