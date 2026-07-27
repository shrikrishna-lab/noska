import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { Page } from "../lib/supabaseService";

interface DialogState {
  open: boolean;
  type: "prompt" | "confirm";
  title: string;
  placeholder: string;
  defaultValue: string;
  resolve: ((value: string | boolean | null) => void) | null;
}

interface UIState {
  sidebarOpen: boolean;
  paletteOpen: boolean;
  settingsOpen: boolean;
  settingsInitialTab: string;
  templateOpen: boolean;
  newPageOpen: boolean;
  newPageDraft: Page | null;
  trashOpen: boolean;
  shareOpen: boolean;
  helpOpen: boolean;
  exportOpen: boolean;
  clipperOpen: boolean;
  voiceOpen: boolean;
  reviewOpen: boolean;
  lineageOpen: boolean;
  collabOpen: boolean;
  encryptOpen: boolean;
  apiConsoleOpen: boolean;
  confetti: boolean;
  toast: string;
  dialogState: DialogState;
}

interface UIActions {
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsInitialTab: React.Dispatch<React.SetStateAction<string>>;
  setTemplateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNewPageOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setNewPageDraft: React.Dispatch<React.SetStateAction<Page | null>>;
  setTrashOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShareOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setHelpOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setClipperOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setVoiceOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setReviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setLineageOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCollabOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setEncryptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setApiConsoleOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setConfetti: React.Dispatch<React.SetStateAction<boolean>>;
  setToast: React.Dispatch<React.SetStateAction<string>>;
  setDialogState: React.Dispatch<React.SetStateAction<DialogState>>;
  showToast: (msg: string) => void;
}

type UIContextType = [UIState, UIActions];

const UIContext = createContext<UIContextType | null>(null);

const defaultDialog: DialogState = { open: false, type: "prompt", title: "", placeholder: "", defaultValue: "", resolve: null };

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState("General");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [newPageDraft, setNewPageDraft] = useState<Page | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [clipperOpen, setClipperOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [encryptOpen, setEncryptOpen] = useState(false);
  const [apiConsoleOpen, setApiConsoleOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState("");
  const [dialogState, setDialogState] = useState<DialogState>(defaultDialog);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const state: UIState = useMemo(() => ({
    sidebarOpen, paletteOpen, settingsOpen, settingsInitialTab, templateOpen,
    newPageOpen, newPageDraft, trashOpen, shareOpen, helpOpen,
    exportOpen, clipperOpen, voiceOpen, reviewOpen, lineageOpen,
    collabOpen, encryptOpen, apiConsoleOpen, confetti, toast, dialogState,
  }), [sidebarOpen, paletteOpen, settingsOpen, settingsInitialTab, templateOpen,
      newPageOpen, newPageDraft, trashOpen, shareOpen, helpOpen,
      exportOpen, clipperOpen, voiceOpen, reviewOpen, lineageOpen,
      collabOpen, encryptOpen, apiConsoleOpen, confetti, toast, dialogState]);

  const actions: UIActions = useMemo(() => ({
    setSidebarOpen, setPaletteOpen, setSettingsOpen, setSettingsInitialTab,
    setTemplateOpen, setNewPageOpen, setNewPageDraft, setTrashOpen,
    setShareOpen, setHelpOpen, setExportOpen, setClipperOpen, setVoiceOpen,
    setReviewOpen, setLineageOpen, setCollabOpen, setEncryptOpen,
    setApiConsoleOpen, setConfetti, setToast, setDialogState, showToast,
  }), [showToast]);

  return (
    <UIContext.Provider value={[state, actions]}>
      {children}
    </UIContext.Provider>
  );
}

export function useUIState() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUIState must be used within UIProvider");
  return ctx[0];
}

export function useUIActions() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUIActions must be used within UIProvider");
  return ctx[1];
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
