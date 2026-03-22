"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export default function GeneralSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">General Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h2 className="font-medium">Theme</h2>
          <p className="text-sm text-muted-foreground">
            Choose your preferred color scheme
          </p>
          <div className="mt-4 flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
            >
              System
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
