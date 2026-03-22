"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AssistantForm } from "@/components/settings/assistant-form";

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
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assistants</h1>
          <p className="text-muted-foreground">
            Create and manage custom AI assistants
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Assistant
        </Button>
      </div>

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

      <div className="space-y-4">
        {assistants.map((assistant) => (
          <div
            key={assistant.id}
            className={`rounded-lg border p-4 ${!assistant.enabled ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{assistant.name}</h3>
                  {assistant.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      <Star className="h-3 w-3" />
                      Default
                    </span>
                  )}
                  {!assistant.enabled && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                  <span>Temp: {assistant.temperature}</span>
                  <span>Top P: {assistant.topP}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {assistant.systemPrompt}
                </p>
              </div>
              <div className="flex gap-1">
                {!assistant.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSetDefault(assistant)}
                    title="Set as default"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(assistant)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirm(assistant)}
                  disabled={assistants.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assistant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
