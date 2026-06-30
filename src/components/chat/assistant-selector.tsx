"use client";

import { cn } from "@/lib/utils";
import { Monogram } from "@/components/settings/monogram";
import type { Assistant } from "@/lib/services";

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
      <h2 className="mb-4 text-center text-lg font-medium text-[var(--on-surface-variant)]">
        Choose an assistant to begin
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {enabledAssistants.map((assistant) => {
          const isSelected = selectedAssistant?.id === assistant.id;
          return (
          <button
            key={assistant.id}
            onClick={() => onSelect(assistant)}
            className={cn(
              "group relative flex flex-col items-center rounded-2xl border border-[var(--outline-variant)]/20 p-4 text-center transition-all hover:border-[var(--primary)]/50",
              isSelected
                ? "border-[var(--outline-variant)]/40 bg-[var(--surface-container-high)]"
                : "bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)]"
            )}
          >
            <div className="mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full">
              {assistant.image ? (
                <img
                  src={assistant.image}
                  alt={assistant.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <Monogram
                  name={assistant.name}
                  className={cn(
                    "h-full w-full rounded-full",
                    isSelected
                      ? "bg-[var(--surface-container-low)]"
                      : "bg-[var(--surface-container-high)]"
                  )}
                />
              )}
            </div>
            <span className="text-sm font-medium text-[var(--on-surface)]">{assistant.name}</span>
            <span className="mt-1 text-xs text-[var(--on-surface-variant)]">
              T: {assistant.temperature}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
