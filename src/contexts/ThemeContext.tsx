import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

interface ThemeFxConfig {
  variant: string;
  start: string;
  blur: boolean;
  gifType: string;
  gifUrl: string;
}

interface ThemeState {
  theme: string;
  themeFx: ThemeFxConfig;
}

interface ThemeActions {
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  setThemeFx: React.Dispatch<React.SetStateAction<ThemeFxConfig>>;
  setThemeWithTransition: (t: string) => void;
}

type ThemeContextType = [ThemeState, ThemeActions];

const defaultThemeFx: ThemeFxConfig = {
  variant: "rectangle",
  start: "bottom-up",
  blur: false,
  gifType: "1",
  gifUrl: "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s"
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [themeFx, setThemeFx] = useState<ThemeFxConfig>(() => {
    try {
      const saved = localStorage.getItem("themeFx");
      return saved ? JSON.parse(saved) : defaultThemeFx;
    } catch {
      return defaultThemeFx;
    }
  });

  const setThemeWithTransition = useCallback((t: string) => {
    document.documentElement.style.transition = "background-color .2s, color .2s";
    setTheme(t);
    localStorage.setItem("theme", t);
    document.documentElement.setAttribute("data-theme", t);
    setTimeout(() => document.documentElement.style.transition = "", 250);
  }, []);

  const state: ThemeState = useMemo(() => ({ theme, themeFx }), [theme, themeFx]);
  const actions: ThemeActions = useMemo(() => ({ setTheme, setThemeFx, setThemeWithTransition }), [setThemeWithTransition]);

  return (
    <ThemeContext.Provider value={[state, actions]}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeState() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeState must be used within ThemeProvider");
  return ctx[0];
}

export function useThemeActions() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeActions must be used within ThemeProvider");
  return ctx[1];
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
