"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Star, Bot, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AssistantForm } from "@/components/settings/assistant-form";
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

export default function AssistantsSettingsPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Assistant | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssistants = async () => {
    try {
      const res = await fetch("/api/assistants");
      const data = await res.json();
      setAssistants(data);
    } catch (error) {
      console.error("Failed to fetch assistants:", error);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  const handleCreate = () => {
    setEditingAssistant(null);
    setShowForm(true);
  };

  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setShowForm(true);
  };

  const handleFormSubmit = async (data: Partial<Assistant>) => {
    setIsLoading(true);
    try {
      const isEdit = !!data.id;
      const res = await fetch("/api/assistants", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save assistant");
      }

      setShowForm(false);
      setEditingAssistant(null);
      fetchAssistants();
    } catch (error) {
      console.error("Failed to save assistant:", error);
      alert(error instanceof Error ? error.message : "Failed to save assistant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (assistant: Assistant) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/assistants?id=${assistant.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete assistant");
      }

      setDeleteConfirm(null);
      fetchAssistants();
    } catch (error) {
      console.error("Failed to delete assistant:", error);
      alert(error instanceof Error ? error.message : "Failed to delete assistant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (assistant: Assistant) => {
    setIsLoading(true);
    try {
      await fetch("/api/assistants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...assistant, isDefault: true }),
      });
      fetchAssistants();
    } catch (error) {
      console.error("Failed to set default:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-[var(--on-surface)]">
            Assistants
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
            Create and manage custom AI assistants
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 font-semibold text-[var(--primary-foreground)] transition-all hover:opacity-90 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Assistant
        </Button>
      </div>

      {/* Assistant Form */}
      {showForm && (
        <AssistantForm
          assistant={editingAssistant}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingAssistant(null);
          }}
          isLoading={isLoading}
        />
      )}

      {/* Assistant List */}
      <div className="space-y-4">
        {assistants.map((assistant) => (
          <div
            key={assistant.id}
            className={cn(
              "glass-card p-5 transition-opacity",
              !assistant.enabled && "opacity-50"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-container-high)]">
                  {assistant.image ? (
                    <img
                      src={assistant.image}
                      alt={assistant.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Bot className="h-6 w-6 text-[var(--on-surface-variant)]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
                      {assistant.name}
                    </h3>
                    {assistant.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-[var(--primary)]/15 px-2.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                        <Star className="h-3 w-3" />
                        Default
                      </span>
                    )}
                    {!assistant.enabled && (
                      <span className="rounded-full bg-[var(--on-surface-variant)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--on-surface-variant)]">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-[var(--on-surface-variant)]">
                    <span>Temp: {assistant.temperature}</span>
                    <span>Top P: {assistant.topP}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--on-surface-variant)] opacity-70">
                    {assistant.systemPrompt}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {!assistant.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(assistant)}
                    title="Set as default"
                    className="rounded-lg p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleEdit(assistant)}
                  className="rounded-lg p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(assistant)}
                  disabled={assistants.length <= 1}
                  className="rounded-lg p-2 text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="border-[var(--outline-variant)]/10 bg-[var(--surface-container)] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="tracking-tight text-[var(--on-surface)]">
              Delete Assistant
            </DialogTitle>
            <DialogDescription className="text-[var(--on-surface-variant)]">
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isLoading}
              className="bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
