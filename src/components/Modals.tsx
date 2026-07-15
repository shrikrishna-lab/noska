import React, { useState } from "react";
import type { ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionInput, SPRING_PRESETS } from "../features/motion/MotionSystem";
import {
  Bot,
  Settings,
  Sparkles,
  HardDrive,
  X,
  Search,
  GripHorizontal,
  Trash2,
  ArchiveRestore,
  Lock,
  ChevronDown,
  CircleHelp,
  Link2,
  Globe,
  Check,
  Loader2,
  type LucideIcon
} from "lucide-react";
import { Modal, ModalHeader, IconButton, Field } from "./ui";
import { aiManager } from "../ai/AIManager";
import { getProviderList, testProviderConnection } from "../ai/providers";
import { getAgentList } from "../ai/agents";
import {
  sendPageInvite, fetchSentPageInvites, withdrawPageInvite, type PageInviteRole,
  isUsernameAvailable, isValidUsernameFormat, normalizeUsername, setUsername
} from "../lib/supabaseService";
import type { Page } from "../lib/supabaseService";
import type { Tables } from "../../types/supabase";

// `window.realtimeCollab` is declared as `unknown` in vite-env.d.ts
// (deliberately, to avoid a circular type dependency — see that file's
// comment) — narrow it at each read site, matching the established
// pattern in src/features/collab/CoThinking.tsx / src/components/PageInspector.tsx.
interface RealtimeCollabLike {
  getUser?: () => { userId?: string; userName?: string } | undefined;
}

/** Theme-transition effect settings — mirrors the shape of the `themeFx`
 * state literal initialized in src/App.tsx (variant/start/blur/gifType/gifUrl). */
interface ThemeFx {
  variant: string;
  start: string;
  blur: boolean;
  gifType: string;
  gifUrl: string;
}

interface SettingsModalProps {
  initialTab?: string;
  workspaceName: string;
  setWorkspaceName: (name: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
  themeFx: ThemeFx;
  setThemeFx: (fx: ThemeFx) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  aiProvider: string;
  setAIProvider: (provider: string) => void;
  nvidiaKey: string;
  setNvidiaKey: (key: string) => void;
  onReplayOnboarding?: () => void;
  onLogout?: () => void;
  onClose: () => void;
  ghostWriterEnabled: boolean;
  setGhostWriterEnabled: (enabled: boolean) => void;
  /** Real signed-in identity, sourced from App.tsx's actual auth session
   * / user_profiles row — used by the Account tab instead of the
   * previous fake "Full Name"/"Email Address" fields that only wrote to
   * local component state and were silently lost on reload. */
  currentUserId?: string | null;
  currentUsername?: string | null;
  currentUserEmail?: string | null;
  /** Called after a successful real username change (setUsername), so
   * App.tsx's currentUsername state (and everywhere that reads it —
   * ShareModal, block attribution, etc.) stays in sync. */
  onUsernameChanged?: (username: string) => void;
}

export function SettingsModal({
  initialTab = "General",
  workspaceName,
  setWorkspaceName,
  theme,
  setTheme,
  themeFx,
  setThemeFx,
  apiKey,
  setApiKey,
  aiProvider,
  setAIProvider,
  nvidiaKey,
  setNvidiaKey,
  onReplayOnboarding,
  onLogout,
  onClose,
  ghostWriterEnabled,
  setGhostWriterEnabled,
  currentUserId,
  currentUsername,
  currentUserEmail,
  onUsernameChanged
}: SettingsModalProps) {
  const getUserName = () => (window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userName || 'Workspace User';
  const [tab, setTab] = useState(initialTab);
  const displayName = getUserName();
  const displayEmail = currentUserEmail || (window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.()?.userId || 'user@workspace';

  React.useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  // Real, measured local-storage usage for the Offline tab — replaces
  // the previous hardcoded "342 KB used of 50 MB" literal with an actual
  // byte count computed from localStorage's real contents.
  const [storageBytes, setStorageBytes] = useState(0);
  const computeStorageBytes = React.useCallback(() => {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        bytes += key.length + (localStorage.getItem(key)?.length || 0);
      }
    } catch {}
    setStorageBytes(bytes);
  }, []);
  React.useEffect(() => { computeStorageBytes(); }, [computeStorageBytes]);

  // Real username-change flow for the Account tab (mirrors
  // UsernameStep.tsx's debounced availability-check pattern) — replaces
  // the previous fake "Full Name"/"Email Address" fields whose "Save
  // Profile" button never called any Supabase write.
  const [usernameDraft, setUsernameDraft] = useState(currentUsername || "");
  const [usernameCheckState, setUsernameCheckState] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "unchanged">("unchanged");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const usernameDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    const value = usernameDraft.trim();
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

    if (!value || value === currentUsername) {
      setUsernameCheckState("unchanged");
      setUsernameError(null);
      return;
    }
    if (!isValidUsernameFormat(value)) {
      setUsernameCheckState("invalid");
      setUsernameError("3-20 characters: lowercase letters, numbers, or underscores, starting with a letter.");
      return;
    }

    setUsernameCheckState("checking");
    setUsernameError(null);
    const requestId = ++usernameRequestIdRef.current;
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(value, currentUserId || undefined);
        if (usernameRequestIdRef.current !== requestId) return;
        setUsernameCheckState(available ? "available" : "taken");
        if (!available) setUsernameError("That username is already taken.");
      } catch {
        if (usernameRequestIdRef.current !== requestId) return;
        setUsernameCheckState("idle");
        setUsernameError("Couldn't check availability — check your connection and try again.");
      }
    }, 400);

    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [usernameDraft, currentUserId, currentUsername]);

  const handleSaveUsername = async () => {
    if (usernameCheckState !== "available" || !currentUserId) return;
    setSavingUsername(true);
    try {
      await setUsername(currentUserId, usernameDraft);
      const normalized = normalizeUsername(usernameDraft);
      onUsernameChanged?.(normalized);
      setUsernameCheckState("unchanged");
      setSaveStatus(`Username changed to @${normalized}`);
      setTimeout(() => setSaveStatus(""), 2500);
    } catch (e) {
      setUsernameError(e instanceof Error ? e.message : "Couldn't save username. Try again.");
    } finally {
      setSavingUsername(false);
    }
  };

  const [saveStatus, setSaveStatus] = useState("");

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateFx = (patch: Partial<ThemeFx>) => setThemeFx({ ...themeFx, ...patch });

  // Dead code, preserved as-is: chooseGif is defined but never invoked
  // anywhere in this component (no call site references it) — same
  // untouched-quirk handling as everywhere else in this migration.
  const chooseGif = (gifType: string) => {
    const urls: Record<string, string> = {
      "1": "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s",
      "2": "https://media.giphy.com/media/5PncuvcXbBuIZcSiQo/giphy.gif?cid=ecf05e47j7vdjtytp3fu84rslaivdun4zvfhej6wlvl6qqsz&ep=v1_stickers_search&rid=giphy.gif&ct=s",
      "3": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3JwcXdzcHd5MW92NWprZXVpcTBtNXM5cG9obWh0N3I4NzFpaDE3byZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/WgsVx6C4N8tjy/giphy.gif"
    };
    updateFx({ gifType, gifUrl: urls[gifType] || themeFx.gifUrl });
  };
  // Referenced only to keep the migration behavior-identical (avoids an
  // "unused variable" lint signal changing observable behavior); the
  // dead code itself is preserved untouched above, per the migration's
  // "don't fix pre-existing quirks" rule.
  void chooseGif;

  const starts =
    themeFx.variant === "rectangle"
      ? ["bottom-up", "top-down", "left-right", "right-left"]
      : themeFx.variant === "polygon"
      ? ["top-left", "top-right"]
      : ["center", "top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 p-5 backdrop-blur-[8px] saturate-[120%] flex items-center justify-center"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="flex h-[min(calc(100vh-40px),720px)] w-[980px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <aside className="w-[260px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)] p-5 overflow-y-auto scrollbar-thin">
          <div className="mb-6 text-sm font-semibold text-[var(--muted)]">Account</div>
          <SettingsNavItem icon={Bot} label={displayName} active={tab === "Account"} onClick={() => setTab("Account")} />

          <div className="mb-3 mt-8 text-sm font-semibold text-[var(--muted)]">Workspace</div>
          {["General"].map((item) => (
            <SettingsNavItem
              key={item}
              icon={Settings}
              label={item}
              active={tab === item}
              onClick={() => setTab(item)}
            />
          ))}
          
          <div className="mb-3 mt-8 text-sm font-semibold text-[var(--muted)]">Features</div>
          {["Noska AI", "Offline"].map((item) => (
            <SettingsNavItem key={item} icon={item === "Offline" ? HardDrive : Sparkles} label={item} active={tab === item} onClick={() => setTab(item)} />
          ))}
        </aside>
        
        <main className="relative min-w-0 flex-1 overflow-y-auto p-12 scrollbar-thin bg-[var(--surface-2)] text-[var(--text)]">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text)] transition cursor-pointer"
          >
            <X size={18} />
          </button>
          
          {saveStatus && (
            <div className="absolute top-5 left-12 bg-[var(--accent)] text-white text-xs px-3 py-1.5 rounded shadow-lg">
              {saveStatus}
            </div>
          )}

          {tab === "Account" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Account</h2>
              <Field label="Name">
                <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--secondary)]">
                  {displayName}
                </div>
              </Field>
              <Field label="Email">
                <div className="rounded border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--secondary)]">
                  {displayEmail}
                </div>
              </Field>

              {/* Real username change — mirrors UsernameStep.tsx's
                  debounced availability check, actually writes via
                  setUsername(). Replaces the previous fake "Full Name"/
                  "Email Address" text inputs whose "Save Profile" button
                  never called any Supabase write and silently reverted on
                  reload. Name/Email above are read-only since they come
                  from the OAuth provider (GitHub/Google), not something
                  this app lets you directly edit. */}
              <Field label="Username">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted)] pointer-events-none">@</span>
                  <MotionInput
                    value={usernameDraft}
                    onChange={(e) => setUsernameDraft(normalizeUsername(e.target.value))}
                    onKeyDown={(e) => { if (e.key === "Enter" && usernameCheckState === "available") handleSaveUsername(); }}
                    maxLength={20}
                    className="pl-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameCheckState === "checking" && <Loader2 size={14} className="animate-spin text-[var(--muted)]" />}
                    {usernameCheckState === "available" && <Check size={14} style={{ color: "#10b981" }} />}
                    {(usernameCheckState === "taken" || usernameCheckState === "invalid") && <X size={14} style={{ color: "#ef4444" }} />}
                  </span>
                </div>
                {usernameError ? (
                  <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{usernameError}</p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {usernameCheckState === "available" ? `@${normalizeUsername(usernameDraft)} is available` : "This is your unique handle across Noska. Others use it to share pages with you."}
                  </p>
                )}
              </Field>
              <button
                onClick={handleSaveUsername}
                disabled={usernameCheckState !== "available" || savingUsername}
                className="bg-[var(--accent)] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-[var(--accent-deep)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {savingUsername ? "Saving..." : "Save username"}
              </button>

              <div className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--panel)] p-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--danger)]">Log out</div>
                  <div className="text-xs text-[var(--muted)]">Sign out of your account</div>
                </div>
                <button
                  onClick={() => { onLogout?.(); onClose?.(); }}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10 transition"
                >
                  Log out
                </button>
              </div>
            </div>
          )}

          {/* Real, measured local storage usage — replaces the previous
              hardcoded "342 KB used of 50 MB" literal and a "Clear Local
              Cache" button that never actually cleared anything. Now
              computes real byte usage and, on clear, calls the exact
              same key list App.tsx's handleLogout uses (minus the
              actual sign-out call), then reloads so the UI reflects the
              real post-clear state instead of just showing a toast. */}
          {tab === "Offline" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Offline</h2>
              <p className="text-sm text-[var(--secondary)]">Pages, chats, and settings are cached locally so the app works offline and loads instantly; changes sync to your account in the background.</p>
              <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface)] space-y-1">
                <div className="text-sm font-semibold">Local storage usage</div>
                <div className="text-xs text-[var(--muted)]">
                  {storageBytes < 1024 ? `${storageBytes} B` : storageBytes < 1024 * 1024 ? `${(storageBytes / 1024).toFixed(1)} KB` : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`} used
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!(await window.noskaConfirm?.("Clear locally cached pages, chats, and settings? Anything already synced to your account is safe — this only clears the local copy on this device."))) return;
                  const keysToClear = [
                    "noska_workspace_joined", "noska_sidebar_data",
                    "noska_share_invites", "noska_ai_profile", "noska_ghost_writer_enabled",
                    "noska_api_key", "noska_ai_config", "noska_memory", "noska_user_profile",
                    "noska_inbox_reminders", "noska-graph-positions",
                    "pages", "aiChats", "activeChatId", "stackedPageIds"
                  ];
                  keysToClear.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
                  computeStorageBytes();
                  setSaveStatus("Local cache cleared. Reloading...");
                  setTimeout(() => window.location.reload(), 800);
                }}
                className="bg-[var(--danger)]/20 text-[var(--danger)] border border-[var(--danger)]/30 px-3 py-2 rounded text-xs font-semibold hover:bg-[var(--danger)]/30"
              >
                Clear local cache
              </button>
            </div>
          )}

          {tab === "General" && (
            <div className="max-w-3xl space-y-5">
              <h2 className="text-[32px] font-bold text-[var(--text)]">General</h2>
              <Field label="Workspace">
                <MotionInput
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </Field>
              <Field label="Theme">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </Field>
              <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">Theme transition</div>
                  <GripHorizontal size={16} className="text-[var(--muted)]" />
                </div>
                <OptionChips
                  label="Variant"
                  value={themeFx.variant}
                  options={["circle", "rectangle", "gif", "polygon", "circle-blur"]}
                  onChange={(variant) =>
                    updateFx({ variant, start: variant === "rectangle" ? "bottom-up" : variant === "polygon" ? "top-left" : "center" })
                  }
                />
                <OptionChips
                  label="Blur"
                  value={themeFx.blur ? "on" : "off"}
                  options={["off", "on"]}
                  onChange={(value) => updateFx({ blur: value === "on" })}
                />
                {themeFx.variant !== "gif" && <OptionChips label="Start" value={themeFx.start} options={starts} onChange={(start) => updateFx({ start })} />}
              </div>
              <div className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--panel)] p-3">
                <div>
                  <div className="text-sm font-semibold">Replay onboarding</div>
                  <div className="text-xs text-[var(--muted)]">Go through the setup flow again</div>
                </div>
                <button
                  onClick={onReplayOnboarding}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition"
                >
                  Replay
                </button>
              </div>
            </div>
          )}
          {tab === "Noska AI" && (
            <NoskaAISettings
              apiKey={apiKey}
              setApiKey={setApiKey}
              aiProvider={aiProvider}
              setAIProvider={setAIProvider}
              nvidiaKey={nvidiaKey}
              setNvidiaKey={setNvidiaKey}
              ghostWriterEnabled={ghostWriterEnabled}
              setGhostWriterEnabled={setGhostWriterEnabled}
            />
          )}
        </main>
      </motion.div>
    </motion.div>
  );
}

interface SettingsNavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SettingsNavItem({ icon: Icon, label, active, onClick }: SettingsNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex h-9 w-full items-center gap-3 rounded-md px-3 text-left font-semibold ${
        active ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

interface OptionChipsProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function OptionChips({ label, value, options, onChange }: OptionChipsProps) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
      <div className="w-20 shrink-0 pt-1 text-[var(--muted)]">{label}</div>
      <div className="flex flex-wrap justify-end gap-1">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded px-2 py-1 text-xs transition ${
              value === option ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Noska AI Settings Component ────────────────────────────────────────────

interface NoskaAISettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  aiProvider: string;
  setAIProvider: (provider: string) => void;
  nvidiaKey: string;
  setNvidiaKey: (key: string) => void;
  ghostWriterEnabled: boolean;
  setGhostWriterEnabled: (enabled: boolean) => void;
}

interface ProviderTestResult {
  ok: boolean;
  error?: string;
  response?: string;
}

function NoskaAISettings({
  apiKey, setApiKey,
  aiProvider, setAIProvider,
  nvidiaKey, setNvidiaKey,
  ghostWriterEnabled, setGhostWriterEnabled
}: NoskaAISettingsProps) {
  const [providerTests, setProviderTests] = React.useState<Record<string, ProviderTestResult>>({});
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const providerList = getProviderList();
  const agentList = getAgentList();
  const config = aiManager.getConfig();
  const [, forceUpdate] = React.useState(0);

  // Subscribe to AIManager config changes
  React.useEffect(() => {
    // aiManager.subscribe returns `() => this._listeners.delete(listener)`
    // (AIManager.ts), i.e. a `() => boolean`, not the `() => void` React's
    // effect cleanup type expects — wrap rather than touch AIManager.ts,
    // which is outside this migration's scope.
    const unsubscribe = aiManager.subscribe(() => forceUpdate(n => n + 1));
    return () => { unsubscribe(); };
  }, []);

  // Sync legacy states → AIManager when they change
  React.useEffect(() => {
    if (apiKey) aiManager.setProviderConfig("anthropic", { apiKey, enabled: true });
  }, [apiKey]);

  React.useEffect(() => {
    if (nvidiaKey) aiManager.setProviderConfig("nvidia", { apiKey: nvidiaKey, enabled: true });
  }, [nvidiaKey]);

  const handleKeyChange = (providerId: string, key: string) => {
    aiManager.setProviderConfig(providerId, { apiKey: key, enabled: true });
    // Also sync to legacy states for backward compat
    if (providerId === "anthropic") setApiKey(key);
    if (providerId === "nvidia") setNvidiaKey(key);
  };

  const handleSetActive = (providerId: string) => {
    const provider = providerList.find(p => p.id === providerId);
    aiManager.setActiveProvider(providerId, provider?.defaultModel);
    // Sync to legacy
    setAIProvider(providerId);
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingId(providerId);
    const providerConfig = config.providers[providerId] || {};
    const result = await testProviderConnection(providerId, providerConfig);
    setProviderTests(prev => ({ ...prev, [providerId]: result }));
    setTestingId(null);
  };

  const currentConfig = aiManager.getConfig();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-[32px] font-bold text-[var(--text)]">Noska AI</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Configure AI providers, models, and workspace intelligence settings.</p>
      </div>

      {/* ─── Active Model ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">Active Model</div>
            <div className="text-lg font-bold text-[var(--text)]">{aiManager.getActiveModelName()}</div>
            <div className="text-xs text-[var(--secondary)] mt-0.5">via {aiManager.getActiveProviderName()}</div>
          </div>
          <div className={`h-3 w-3 rounded-full ${aiManager.isConfigured() ? "bg-[var(--success)] shadow-[0_0_8px_var(--success)]" : "bg-amber-400"}`} />
        </div>
      </div>

      {/* ─── Provider Cards ───────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Providers</h3>
        <div className="space-y-2">
          {providerList.map((provider) => {
            const providerConfig = currentConfig.providers[provider.id] || {};
            const isActive = currentConfig.activeProvider === provider.id;
            const hasKey = !provider.requiresKey || Boolean(providerConfig.apiKey);
            const testResult = providerTests[provider.id];
            const isTesting = testingId === provider.id;

            return (
              <div
                key={provider.id}
                className={`rounded-xl border p-4 transition ${
                  isActive
                    ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    hasKey ? "bg-[var(--success)]" : "bg-[var(--muted)]"
                  }`} />

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)]">{provider.name}</span>
                      <span className="rounded-full bg-[var(--hover)] px-2 py-0.5 text-[10px] text-[var(--muted)] font-medium uppercase">
                        {provider.type}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] text-[var(--accent)] font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      {provider.models.length > 0
                        ? provider.models.map(m => m.name).join(", ")
                        : provider.hasDiscover ? "Auto-discover models" : "No models"
                      }
                    </div>
                  </div>

                  {/* Set Active button */}
                  {!isActive && hasKey && (
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition"
                    >
                      Use
                    </button>
                  )}
                </div>

                {/* API Key input */}
                {provider.requiresKey && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="password"
                      value={providerConfig.apiKey || ""}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      placeholder={provider.keyPlaceholder || "API key..."}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 transition"
                    />
                    <button
                      onClick={() => handleTestConnection(provider.id)}
                      disabled={!providerConfig.apiKey || isTesting}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition disabled:opacity-40"
                    >
                      {isTesting ? "Testing..." : "Test"}
                    </button>
                  </div>
                )}

                {/* Local provider URL */}
                {!provider.requiresKey && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={providerConfig.baseUrl || ""}
                      onChange={(e) => aiManager.setProviderConfig(provider.id, { baseUrl: e.target.value })}
                      placeholder={`Endpoint URL (default: ${provider.id === "ollama" ? "http://localhost:11434" : "http://localhost:1234/v1"})`}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 transition"
                    />
                  </div>
                )}

                {/* Test result */}
                {testResult && (
                  <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    testResult.ok
                      ? "bg-[var(--success)]/10 border border-[var(--success)]/20 text-[var(--success)]"
                      : "bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)]"
                  }`}>
                    {testResult.ok ? "✓ Connection successful" : `✗ ${testResult.error || "Connection failed"}`}
                  </div>
                )}

                {/* Model selector for active provider */}
                {isActive && provider.models.length > 1 && (
                  <div className="mt-3">
                    <select
                      value={currentConfig.activeModel || provider.defaultModel}
                      onChange={(e) => aiManager.setActiveProvider(provider.id, e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                    >
                      {provider.models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({Math.round(model.context / 1000)}k context)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Context Settings ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Context Injection</h3>
        <p className="text-xs text-[var(--muted)] mb-3">Control what workspace data is sent with each AI request.</p>
        <div className="space-y-2">
          {[
            { key: "includeCurrentPage", label: "Current page content", desc: "Send the active page's blocks and metadata" },
            { key: "includeRecentPages", label: "Recent pages", desc: "Include summaries of recently edited pages" },
            { key: "includeConnections", label: "Graph connections", desc: "Include backlinks and related pages" },
            { key: "includeTags", label: "Workspace tags", desc: "Send all workspace tags for context" }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{label}</div>
                <div className="text-xs text-[var(--muted)]">{desc}</div>
              </div>
              <input
                type="checkbox"
                checked={(currentConfig.context as unknown as Record<string, boolean>)?.[key] !== false}
                onChange={(e) => aiManager.configure({ context: { [key]: e.target.checked } })}
                className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Agents ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">AI Agents</h3>
        <p className="text-xs text-[var(--muted)] mb-3">Specialized personas available in the AI panel.</p>
        <div className="grid grid-cols-2 gap-2">
          {agentList.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: agent.color }}>{agent.icon}</span>
                <span className="text-sm font-semibold text-[var(--text)]">{agent.name}</span>
              </div>
              <div className="text-[11px] text-[var(--muted)]">{agent.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Ghost Writer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">AI Ghost Writer</div>
          <div className="text-xs text-[var(--muted)]">Predict and suggest text inline as you pause typing.</div>
        </div>
        <input
          type="checkbox"
          checked={!!ghostWriterEnabled}
          onChange={(e) => setGhostWriterEnabled(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
        />
      </div>
    </div>
  );
}

interface TrashModalProps {
  pages: Page[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TrashModal({ pages, onClose, onRestore, onDelete }: TrashModalProps) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={Trash2} title="Trash" onClose={onClose} />
      <div className="space-y-2 p-4">
        {pages.length === 0 && <div className="text-sm text-[var(--muted)]">Trash is empty.</div>}
        {pages.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded border border-[var(--border)] p-2">
            <span>{p.icon}</span>
            <span className="flex-1">
              <span className="block">{p.title}</span>
              {p.purgeAfter && (
                <span className="block text-[10px] text-[var(--muted)]">
                  Purges {new Date(p.purgeAfter).toLocaleDateString()}
                </span>
              )}
            </span>
            <IconButton icon={ArchiveRestore} label="Restore" onClick={() => onRestore(p.id)} />
            <IconButton icon={Trash2} label="Delete forever" onClick={() => onDelete(p.id)} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

interface ShareModalProps {
  page: Page;
  onClose: () => void;
  onToast?: (message: string) => void;
  /** The signed-in user's id/username — required to actually send
   * real invites (sendPageInvite requires an authenticated inviter) and
   * to build a real, working page URL (see `link` below). Optional only
   * so this modal doesn't hard-crash if App.tsx somehow renders it before
   * these resolve; the invite form is disabled until both are present. */
  currentUserId?: string | null;
  currentUsername?: string | null;
  workspaceSlug: string;
}

export function ShareModal({ page, onClose, onToast, currentUserId, currentUsername, workspaceSlug }: ShareModalProps) {
  const [tab, setTab] = useState("share");
  const [usernameInput, setUsernameInput] = useState("");
  const [access, setAccess] = useState<PageInviteRole>("editor");
  const [sentInvites, setSentInvites] = useState<Tables<"page_invites">[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generalAccess, setGeneralAccess] = useState("Only people invited");
  const [generalAccessOpen, setGeneralAccessOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const loadSentInvites = React.useCallback(async () => {
    if (!currentUserId) { setInvitesLoading(false); return; }
    setInvitesLoading(true);
    try {
      const rows = await fetchSentPageInvites(currentUserId, page.id);
      setSentInvites(rows);
    } catch {
      // Non-fatal — the invite list is a convenience view, not required
      // for sending new invites.
    } finally {
      setInvitesLoading(false);
    }
  }, [currentUserId, page.id]);

  React.useEffect(() => { loadSentInvites(); }, [loadSentInvites]);

  const currentUser = (window.realtimeCollab as RealtimeCollabLike | undefined)?.getUser?.();
  const userName = currentUser?.userName || 'Workspace User';
  const userHandle = currentUsername ? `@${currentUsername}` : (currentUser?.userId || 'local@workspace');

  // Real, resolvable app URL (App.tsx's own <Route path="/:workspaceSlug/:pageId">)
  // rather than the previous hardcoded "noska.local/page/..." fake domain —
  // clicking this actually opens the page, subject to the RLS-backed
  // ownership/permission check now enforced on `pages` (see migration
  // rls_page_permissions_and_shared_pages).
  const link = `${window.location.origin}/${workspaceSlug}/${page.id}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const sendInvite = async () => {
    const handle = usernameInput.trim().replace(/^@/, "");
    if (!handle || !currentUserId) return;
    setSending(true);
    setInviteError(null);
    try {
      await sendPageInvite({
        pageId: page.id,
        pageTitle: page.title || "Untitled",
        inviterUserId: currentUserId,
        inviterUsername: currentUsername,
        inviteeUsername: handle,
        role: access,
      });
      setUsernameInput("");
      onToast?.(`Invited @${handle.toLowerCase()}`);
      await loadSentInvites();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Couldn't send invite.");
    } finally {
      setSending(false);
    }
  };

  const removeInvite = async (inviteId: string) => {
    if (!currentUserId) return;
    setSentInvites(prev => prev.filter((inv) => inv.id !== inviteId)); // optimistic
    try {
      await withdrawPageInvite(inviteId, currentUserId);
    } catch {
      await loadSentInvites(); // reconcile on failure
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 backdrop-blur-[6px] bg-black/30"
      onMouseDown={onClose}
    >
      <div className="relative mx-auto flex h-full max-w-5xl items-start justify-end px-6 pt-16" onMouseDown={(e) => e.stopPropagation()}>
        {importOpen && (
          <div className="absolute left-6 top-24 w-[300px] rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-floating)] fade-in">
            <button onClick={() => setImportOpen(false)} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-3)] cursor-pointer">
              <X size={14} />
            </button>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded bg-[var(--surface-3)] text-xs font-bold text-[var(--text)]">S</span>
              <span className="grid h-8 w-8 place-items-center rounded bg-[var(--surface-3)] text-xs font-bold text-[var(--text)]">G</span>
              <span className="grid h-8 w-8 place-items-center rounded bg-[var(--surface-3)] text-xs font-bold text-[var(--text)]">M</span>
            </div>
            <div className="pr-6 text-sm font-semibold leading-5 text-[var(--text)]">Import contacts from Google, Slack, or Microsoft</div>
            <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Collaborate faster by importing contacts from your favorite tools.</div>
            <div className="mt-4 flex justify-end gap-3 text-sm">
              <button onClick={() => setImportOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer">Not now</button>
              <button onClick={() => setImportOpen(false)} className="font-semibold text-[var(--text)] hover:underline cursor-pointer">Get started</button>
            </div>
          </div>
        )}
        <motion.div
          initial={{ y: -15, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0, scale: 0.96 }}
          transition={SPRING_PRESETS.soft}
          className="w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
        >
          <div className="flex border-b border-[var(--border-strong)] px-4">
            {["share", "publish"].map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`border-b-2 px-3 py-3 text-sm font-medium capitalize ${
                  tab === item ? "border-[var(--accent)] text-[var(--text)]" : "border-transparent text-[var(--secondary)] hover:text-[var(--text)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {tab === "share" ? (
            <div className="p-4">
              <div className="flex gap-2">
                <MotionInput
                  value={usernameInput}
                  onChange={(e) => { setUsernameInput(e.target.value); setInviteError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && usernameInput.trim() && !sending) sendInvite(); }}
                  placeholder="Username, e.g. jane_doe"
                  className="min-w-0 flex-1"
                />
                <select
                  value={access}
                  onChange={(e) => setAccess(e.target.value as PageInviteRole)}
                  className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-2 text-xs text-[var(--text)] outline-none cursor-pointer hover:bg-[var(--surface-4)] transition"
                >
                  <option value="editor">Can edit</option>
                  <option value="commenter">Can comment</option>
                  <option value="viewer">Can view</option>
                </select>
                <button
                  disabled={!usernameInput.trim() || !currentUserId || sending}
                  onClick={sendInvite}
                  className="shrink-0 rounded-md bg-[var(--accent)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:-translate-y-px active:scale-95 disabled:opacity-40 transition cursor-pointer"
                >
                  {sending ? "Inviting..." : "Invite"}
                </button>
              </div>
              {inviteError && <p className="mt-1.5 text-xs text-[var(--danger)]">{inviteError}</p>}
              {!invitesLoading && sentInvites.length > 0 && (
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {sentInvites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-[var(--text)]">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface-3)] text-[9px] font-bold">
                        {inv.invitee_username[0]?.toUpperCase()}
                      </span>
                      <span className="flex-1 truncate">@{inv.invitee_username}</span>
                      <span className="text-[var(--muted)] text-[9px]">Pending · {inv.role}</span>
                      <button onClick={() => removeInvite(inv.id)} className="text-[var(--danger)] hover:text-[var(--danger)] text-[9px]" title="Withdraw invite">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3 rounded-md py-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--text)]">
                  {userName[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text)]">{userName} (You)</div>
                  <div className="truncate text-xs text-[var(--text-secondary)]">{userHandle} · Owner</div>
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--border-strong)] pt-4">
                <div className="mb-2 text-xs font-medium text-[var(--secondary)]">General access</div>
                <button
                  onClick={() => setGeneralAccessOpen((open) => !open)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  <Lock size={15} className="text-[var(--secondary)]" />
                  <span className="flex-1">{generalAccess}</span>
                  <ChevronDown size={14} className={`text-[var(--secondary)] transition ${generalAccessOpen ? "rotate-180" : ""}`} />
                </button>
                {generalAccessOpen && (
                  <div className="mt-1 space-y-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg)] p-1">
                    {["Only people invited", "Anyone with the link", "Public"].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setGeneralAccess(option);
                          setGeneralAccessOpen(false);
                        }}
                        className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                          generalAccess === option ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <button className="flex items-center gap-1.5 text-xs text-[var(--secondary)] hover:text-[var(--text)]">
                  <CircleHelp size={14} />
                  Learn about sharing
                </button>
                <button onClick={copyLink} className="flex items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)]">
                  <Link2 size={15} />
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 text-sm text-[var(--secondary)]">
              <div className="text-[var(--text)]">Publish this page to the web</div>
              <p>Anyone with the public link can view this page. Publishing is off by default.</p>
              <button onClick={copyLink} className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-3 py-2 font-medium text-white transition">
                <Globe size={15} />
                Publish to web
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  const [tab, setTab] = React.useState("shortcuts");
  const [ticketType, setTicketType] = React.useState("bug");
  const [ticketTitle, setTicketTitle] = React.useState("");
  const [ticketBody, setTicketBody] = React.useState("");
  const [ticketSubmitted, setTicketSubmitted] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const tabs = [
    { id: "start", label: "Getting Started", icon: "🚀" },
    { id: "shortcuts", label: "Shortcuts", icon: "⌨️" },
    { id: "ai", label: "AI Guide", icon: "✨" },
    { id: "canvas", label: "Canvas & Graph", icon: "🎨" },
    { id: "ticket", label: "Report / Request", icon: "🎫" }
  ];

  const shortcuts = [
    { category: "Navigation", items: [
      { keys: "Ctrl+K", desc: "Open Command Palette / Universal Search" },
      { keys: "Ctrl+N", desc: "Create new page" },
      { keys: "Ctrl+\\", desc: "Toggle sidebar" },
      { keys: "Ctrl+Shift+L", desc: "Toggle dark/light theme" },
      { keys: "Alt+Click", desc: "Open page in stacked column" }
    ]},
    { category: "Editing", items: [
      { keys: "/", desc: "Open block type menu (slash commands)" },
      { keys: "Enter", desc: "Create new block below" },
      { keys: "Backspace", desc: "Delete empty block" },
      { keys: "Tab", desc: "Indent list item" },
      { keys: "Shift+Tab", desc: "Outdent list item" },
      { keys: "Ctrl+Z", desc: "Undo last action" },
      { keys: "Ctrl+Y", desc: "Redo last action" },
      { keys: "Ctrl+D", desc: "Duplicate current block" }
    ]},
    { category: "Features", items: [
      { keys: "Ctrl+Shift+E", desc: "Export current page" },
      { keys: "Ctrl+Shift+C", desc: "Open Web Clipper" },
      { keys: "Ctrl+Shift+V", desc: "Voice Capture" },
      { keys: "Ctrl+Shift+R", desc: "Rename page" },
      { keys: "Ctrl+Shift+P", desc: "Move page" }
    ]}
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 p-5 backdrop-blur-[8px] saturate-[120%] flex items-center justify-center"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="flex h-[calc(100vh-80px)] w-[820px] max-w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Sidebar Tabs */}
        <aside className="w-[200px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-1 overflow-y-auto scrollbar-thin">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Learning Center</div>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-150 ${
                tab === t.id
                  ? "bg-[var(--surface-3)] text-[var(--text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-3)]/60 hover:text-[var(--text)]"
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="relative min-w-0 flex-1 overflow-y-auto p-8 scrollbar-thin bg-[var(--surface-2)] text-[var(--text)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--active)] transition"
          >
            <X size={15} />
          </button>

          {tab === "start" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Welcome to Noska</h2>
              <p className="text-sm leading-relaxed text-[var(--secondary)]">
                Noska is your AI-powered workspace for thinking, writing, and organizing knowledge. Here's how to get started:
              </p>
              <div className="space-y-3 stagger-reveal">
                {[
                  { step: "1", title: "Create your first page", desc: "Click the + button in the sidebar or press Ctrl+N to create a new document." },
                  { step: "2", title: "Use slash commands", desc: "Type / in any block to access headings, lists, code blocks, databases, and more." },
                  { step: "3", title: "Configure AI", desc: "Go to Settings → Noska AI and add your NVIDIA or Claude API key to unlock AI features." },
                  { step: "4", title: "Explore stacked columns", desc: "Alt+Click any page to open it side-by-side with your current document." },
                  { step: "5", title: "Use spaced repetition", desc: "Add review cards to blocks and study them with the Spaced Repetition feature." },
                  { step: "6", title: "Try the Command Palette", desc: "Press Ctrl+K to search pages, run commands, or launch any feature instantly." }
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-white text-xs font-bold">{item.step}</div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-xs text-[var(--secondary)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "shortcuts" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Keyboard Shortcuts</h2>
              <p className="text-sm text-[var(--secondary)]">Master Noska with these keyboard shortcuts for lightning-fast navigation.</p>
              {shortcuts.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{group.category}</div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.keys} className="flex items-center justify-between rounded-lg bg-[var(--panel)] px-3 py-2.5">
                        <span className="text-sm text-[var(--text)]">{item.desc}</span>
                        <kbd>{item.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">AI Features Guide</h2>
              <p className="text-sm leading-relaxed text-[var(--secondary)]">
                Noska integrates AI throughout your workflow. Here's everything you can do:
              </p>
              <div className="space-y-3">
                {[
                  { title: "AI Chat Panel", icon: "💬", desc: "Open the AI sidebar to have conversations with YoYo, your AI assistant. Ask questions, brainstorm, or get help writing." },
                  { title: "Ghost Writer", icon: "👻", desc: "Enable in Settings → Noska AI. As you type, AI will suggest completions inline. Press Tab to accept, Escape to dismiss." },
                  { title: "Text Selection Actions", icon: "✨", desc: "Select any text in your editor to reveal contextual AI actions: Improve, Summarize, Explain, Create Tasks, or Translate." },
                  { title: "Voice Capture", icon: "🎙️", desc: "Click the microphone icon or press Ctrl+Shift+V to transcribe voice notes directly into your documents." },
                  { title: "Web Clipper", icon: "✂️", desc: "Use Ctrl+Shift+C to extract and save content from any URL directly into your workspace." },
                  { title: "AI Meeting Notes", icon: "📋", desc: "Create AI-structured meeting notes with agendas, action items, and follow-ups from the sidebar." }
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-xs text-[var(--secondary)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "canvas" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Canvas & Knowledge Graph</h2>
              <p className="text-sm leading-relaxed text-[var(--secondary)]">
                Noska includes powerful visual thinking tools beyond traditional documents.
              </p>
              <div className="space-y-3">
                {[
                  { title: "Canvas Mode", icon: "🖼️", desc: "Switch any page to Canvas view to create freeform visual layouts. Drag blocks, connect ideas, and build visual maps." },
                  { title: "Knowledge Graph", icon: "🔗", desc: "The graph view shows connections between your pages based on shared tags, backlinks, and content references." },
                  { title: "Database Blocks", icon: "📊", desc: "Use /database in any document to create inline databases with custom columns, filters, and sorting." },
                  { title: "Stacked Columns", icon: "📑", desc: "Alt+Click pages to open them side-by-side. Resize columns and work across multiple documents simultaneously." },
                  { title: "Note DNA", icon: "🧬", desc: "Every page tracks its full history timeline. View creation events, edits, and metadata from the Note DNA panel." }
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-xs text-[var(--secondary)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "ticket" && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Report Bug / Request Feature</h2>
              <p className="text-sm text-[var(--secondary)]">
                Help us improve Noska by submitting bug reports or feature requests.
              </p>

              {ticketSubmitted ? (
                <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-6 text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-semibold text-[var(--success)]">Ticket Submitted</div>
                  <div className="text-xs text-[var(--secondary)] mt-1">Thank you for your feedback! We'll review it shortly.</div>
                  <button
                    onClick={() => { setTicketSubmitted(false); setTicketTitle(""); setTicketBody(""); }}
                    className="mt-4 text-xs text-[var(--accent)] hover:underline"
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {[
                      { id: "bug", label: "🐛 Bug Report" },
                      { id: "feature", label: "💡 Feature Request" },
                      { id: "improvement", label: "🔧 Improvement" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTicketType(opt.id)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          ticketType === opt.id
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Title</label>
                      <input
                        value={ticketTitle}
                        onChange={(e) => setTicketTitle(e.target.value)}
                        placeholder={ticketType === "bug" ? "Describe the issue briefly..." : "What feature would you like?"}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Details</label>
                      <textarea
                        value={ticketBody}
                        onChange={(e) => setTicketBody(e.target.value)}
                        placeholder={ticketType === "bug" ? "Steps to reproduce, expected vs actual behavior..." : "Describe the feature in detail, use cases..."}
                        rows={5}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--text)] outline-none resize-none placeholder:text-[var(--muted)]"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[var(--muted)]">
                        {ticketType === "bug" ? "🐛 Bug Report" : ticketType === "feature" ? "💡 Feature Request" : "🔧 Improvement"} · v3.0
                      </span>
                      <button
                        disabled={!ticketTitle.trim()}
                        onClick={() => setTicketSubmitted(true)}
                        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-40 transition"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </motion.div>
    </motion.div>
  );
}

interface CustomDialogProps {
  open: boolean;
  type: "prompt" | "confirm";
  title: string;
  placeholder?: string;
  defaultValue?: string;
  onClose: () => void;
  onConfirm: (value: string | boolean) => void;
}

export function CustomDialog({ open, type, title, placeholder, defaultValue, onClose, onConfirm }: CustomDialogProps) {
  const [value, setValue] = useState(defaultValue || "");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[420px] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-6 shadow-2xl glass-modal text-[var(--text)]"
      >
        <h3 className="text-base font-bold mb-3">{title}</h3>
        {type === "prompt" && (
          <input
            type="text"
            className="w-full bg-[var(--input)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] mb-6 transition"
            placeholder={placeholder}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(value);
              if (e.key === "Escape") onClose();
            }}
            autoFocus
          />
        )}
        {type === "confirm" && (
          <p className="text-sm text-[var(--text-secondary)] mb-6">Are you sure you want to proceed?</p>
        )}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(type === "prompt" ? value : true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] transition cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}
