"use client";

import { useCallback, useEffect } from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { ensureInit, getAppConfigService } from "@llm-chatter/services";

const THEME_KEY = "theme";

function ThemeBootstrap() {
  const { setTheme } = useTheme();
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await ensureInit();
        const stored = await getAppConfigService().get<string>(THEME_KEY);
        if (active && stored) setTheme(stored);
      } catch {
        // fall back to default theme
      }
    })();
    return () => {
      active = false;
    };
  }, [setTheme]);
  return null;
}

export function useAppTheme() {
  const { theme, setTheme } = useTheme();
  const setAppTheme = useCallback(
    (value: string) => {
      setTheme(value);
      void getAppConfigService().set(THEME_KEY, value);
    },
    [setTheme],
  );
  return { theme, setTheme: setAppTheme };
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeBootstrap />
      {children}
    </NextThemesProvider>
  );
}
