import React, { createContext, useContext, useState, useMemo } from "react";
import type { AIChat } from "../lib/supabaseService";

interface AIState {
  aiOpen: boolean;
  aiRightOpen: boolean;
  apiKey: string;
  aiProvider: string;
  nvidiaKey: string;
  aiChats: AIChat[];
  activeChatId: string | null;
  ghostWriterEnabled: boolean;
}

interface AIActions {
  setAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAiRightOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
  setAiProvider: React.Dispatch<React.SetStateAction<string>>;
  setNvidiaKey: React.Dispatch<React.SetStateAction<string>>;
  setAiChats: React.Dispatch<React.SetStateAction<AIChat[]>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string | null>>;
  setGhostWriterEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

type AIContextType = [AIState, AIActions];

const AIContext = createContext<AIContextType | null>(null);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRightOpen, setAiRightOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [aiProvider, setAiProvider] = useState("nvidia");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [aiChats, setAiChats] = useState<AIChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [ghostWriterEnabled, setGhostWriterEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("noska_ghost_writer_enabled");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const state: AIState = useMemo(() => ({
    aiOpen, aiRightOpen, apiKey, aiProvider, nvidiaKey, aiChats, activeChatId, ghostWriterEnabled,
  }), [aiOpen, aiRightOpen, apiKey, aiProvider, nvidiaKey, aiChats, activeChatId, ghostWriterEnabled]);

  const actions: AIActions = useMemo(() => ({
    setAiOpen, setAiRightOpen, setApiKey, setAiProvider, setNvidiaKey,
    setAiChats, setActiveChatId, setGhostWriterEnabled,
  }), []);

  return (
    <AIContext.Provider value={[state, actions]}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIState() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAIState must be used within AIProvider");
  return ctx[0];
}

export function useAIActions() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAIActions must be used within AIProvider");
  return ctx[1];
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used within AIProvider");
  return ctx;
}
