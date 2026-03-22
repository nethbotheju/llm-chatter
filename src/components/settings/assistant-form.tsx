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
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted">
            {image ? (
              <img src={image} alt={name} className="h-full w-full object-cover" />
            ) : (
              <Bot className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          {image && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div>
          <Label htmlFor="image" className="cursor-pointer">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
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
          <p className="mt-1 text-xs text-muted-foreground">
            Optional: JPG, PNG, max 2MB
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Assistant name"
          required
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">
          System Prompt ({systemPrompt.length}/4000)
        </Label>
        <Textarea
          id="systemPrompt"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Enter the system prompt for this assistant..."
          rows={6}
          required
          minLength={10}
          maxLength={4000}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Temperature</Label>
            <span className="text-sm text-muted-foreground">{temperature.toFixed(1)}</span>
          </div>
          <Slider
            value={[temperature]}
            onValueChange={([value]) => setTemperature(value)}
            min={0}
            max={2}
            step={0.1}
          />
          <p className="text-xs text-muted-foreground">
            Lower = more focused, Higher = more creative
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Top P</Label>
            <span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span>
          </div>
          <Slider
            value={[topP]}
            onValueChange={([value]) => setTopP(value)}
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-xs text-muted-foreground">
            Nucleus sampling threshold
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="enabled">Enabled</Label>
          <p className="text-xs text-muted-foreground">
            Disabled assistants won&apos;t appear in selection
          </p>
        </div>
        <Switch
          id="enabled"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isDefault">Default Assistant</Label>
          <p className="text-xs text-muted-foreground">
            Used for new conversations
          </p>
        </div>
        <Switch
          id="isDefault"
          checked={isDefault}
          onCheckedChange={setIsDefault}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name || !systemPrompt}>
          {isLoading ? "Saving..." : assistant ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
