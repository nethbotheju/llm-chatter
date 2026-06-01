"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Bot, Upload, X } from "lucide-react";

interface Assistant {
  id: string;
  name: string;
  image?: string | null;
  systemPrompt: string;
  temperature: number;
  topP: number;
  enabled: boolean;
  isDefault: boolean;
}

interface AssistantFormProps {
  assistant?: Assistant | null;
  onSubmit: (data: Partial<Assistant>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AssistantForm({
  assistant,
  onSubmit,
  onCancel,
  isLoading,
}: AssistantFormProps) {
  const [name, setName] = useState(assistant?.name || "");
  const [image, setImage] = useState<string | null>(assistant?.image || null);
  const [systemPrompt, setSystemPrompt] = useState(assistant?.systemPrompt || "");
  const [temperature, setTemperature] = useState(assistant?.temperature ?? 0.7);
  const [topP, setTopP] = useState(assistant?.topP ?? 1.0);
  const [isDefault, setIsDefault] = useState(assistant?.isDefault ?? false);
  const [enabled, setEnabled] = useState(assistant?.enabled ?? true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (assistant) {
      setName(assistant.name);
      setImage(assistant.image || null);
      setSystemPrompt(assistant.systemPrompt);
      setTemperature(assistant.temperature);
      setTopP(assistant.topP);
      setIsDefault(assistant.isDefault);
      setEnabled(assistant.enabled);
    } else {
      setName("");
      setImage(null);
      setSystemPrompt("");
      setTemperature(0.7);
      setTopP(1.0);
      setIsDefault(false);
      setEnabled(true);
    }
  }, [assistant]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      id: assistant?.id,
      name,
      image,
      systemPrompt,
      temperature,
      topP,
      isDefault,
      enabled,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card space-y-6 p-6">
      {/* Avatar Upload */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-container-high)]">
            {image ? (
              <img src={image} alt={name} className="h-full w-full object-cover" />
            ) : (
              <Bot className="h-8 w-8 text-[var(--on-surface-variant)]" />
            )}
          </div>
          {image && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--destructive)] text-[var(--destructive-foreground)] shadow-sm hover:opacity-90"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div>
          <Label htmlFor="image" className="cursor-pointer">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] px-4 py-2.5 text-xs font-semibold text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-bright)] hover:text-[var(--on-surface)]">
              <Upload className="h-4 w-4" />
              Upload Avatar
            </div>
          </Label>
          <input
            ref={fileInputRef}
            id="image"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="mt-1.5 text-[10px] text-[var(--on-surface-variant)] opacity-50">
            Optional: JPG, PNG, max 2MB
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
          Name
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Assistant name"
          required
          maxLength={50}
          className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
        />
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
          System Prompt ({systemPrompt.length}/4000)
        </Label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter the system prompt for this assistant..."
          rows={6}
          required
          minLength={10}
          maxLength={4000}
          className="border-[var(--outline-variant)]/15 bg-[var(--surface-container-high)] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)]/40 focus-visible:ring-[var(--primary)]/30"
        />
      </div>

      {/* Sliders */}
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Temperature
            </Label>
            <span className="rounded-lg bg-[var(--surface-container-high)] px-2.5 py-1 text-xs font-bold text-[var(--on-surface-variant)]">
              {temperature.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[temperature]}
            onValueChange={([value]) => setTemperature(value)}
            min={0}
            max={2}
            step={0.1}
          />
          <p className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
            Lower = more focused, Higher = more creative
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--on-surface-variant)] opacity-60">
              Top P
            </Label>
            <span className="rounded-lg bg-[var(--surface-container-high)] px-2.5 py-1 text-xs font-bold text-[var(--on-surface-variant)]">
              {topP.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[topP]}
            onValueChange={([value]) => setTopP(value)}
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
            Nucleus sampling threshold
          </p>
        </div>
      </div>

      {/* Toggle Switches */}
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-[var(--surface-container-high)] p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-[var(--on-surface)]">Enabled</Label>
            <p className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
              Disabled assistants won&apos;t appear in selection
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[var(--surface-container-high)] p-4">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium text-[var(--on-surface)]">Default Assistant</Label>
            <p className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
              Used for new conversations
            </p>
          </div>
          <Switch
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl border-[var(--outline-variant)]/15 text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || !name || !systemPrompt}
          className="rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40"
        >
          {isLoading ? "Saving..." : assistant ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
