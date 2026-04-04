"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-[var(--on-surface)]">
          General Settings
        </h1>
        <p className="text-sm text-[var(--on-surface-variant)]">
          Manage your application preferences
        </p>
      </div>

      {/* Theme Card */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold tracking-tight text-[var(--on-surface)]">
            Theme
          </h2>
          <p className="text-xs text-[var(--on-surface-variant)]">
            Choose your preferred color scheme
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all",
                  isActive
                    ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--on-surface)]"
                    : "border-[var(--outline-variant)]/10 bg-[var(--surface-container)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)] hover:text-[var(--on-surface)]"
                )}
              >
                <Icon className={cn("h-6 w-6", isActive && "text-[var(--primary)]")} />
                <span className="text-xs font-semibold">{option.label}</span>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
