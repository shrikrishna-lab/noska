import React, { useState } from "react";
import type { ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionInput, SPRING_PRESETS } from "../features/motion/MotionSystem";
import {
  Bot,
  Settings,
  Sparkles,
  HardDrive,
  UserRound,
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
  Palette,
  Camera,
  MapPin,
  Mail,
  Pencil,
  Save,
  RotateCcw,
  Copy,
  CheckCircle2,
  Share2,
  Bookmark,
  Code2,
  Mic,
  Cloud,
  type LucideIcon
} from "lucide-react";
import { Modal, ModalHeader, IconButton, Field } from "./ui";
import CustomProviders from "./settings/CustomProviders";
import VoiceCustomizationSettings from "./settings/VoiceCustomizationSettings";
import { PageIcon } from "./PageIcon";
import ApiKeysManager from "../features/api/ApiKeysManager";
import { aiManager } from "../ai/AIManager";
import { getProviderList, testProviderConnection } from "../ai/providers";
import { getAgentList } from "../ai/agents";
import {
  PROFILE_CARD_GRADIENTS_BY_CATEGORY,
  getProfileCardGradient,
  setProfileCardGradient,
  type ProfileCardGradient,
} from "../lib/profileCardGradient";
import {
  sendPageInvite, fetchSentPageInvites, withdrawPageInvite, type PageInviteRole,
  isUsernameAvailable, isValidUsernameFormat, normalizeUsername, setUsername,
  fetchUserProfile, updateUserProfile, detectLocationFromIp,
  uploadImage, ensureImagesBucket
} from "../lib/supabaseService";
import type { Page } from "../lib/supabaseService";
import type { Tables } from "../../types/supabase";
import {
  getImportedIcons,
  addImportedIcon,
  removeImportedIcon,
  getImportedCategories,
  type ImportedIcon
} from "../registry/icons/IconRegistry";
import { pickImageFile } from "../lib/filePicker";


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
  onProfileNameChanged?: (name: string) => void;
  onProfileAvatarChanged?: (avatarUrl: string | null) => void;
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
  onProfileNameChanged,
  onProfileAvatarChanged,
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

  // ── Profile card preview + inline edit (My Profile tab) ─────────────
  const [profileMode, setProfileMode] = useState<"card" | "edit">("card");
  const [pUserName, setPUserName] = useState("");
  const [pBio, setPBio] = useState("");
  const [pAvatarUrl, setPAvatarUrl] = useState<string | null>(null);
  const [pAvatarLocal, setPAvatarLocal] = useState<string | null>(null);
  const [pAvatarFile, setPAvatarFile] = useState<File | null>(null);
  const [pCountry, setPCountry] = useState("");
  const [pState, setPState] = useState("");
  const [pCity, setPCity] = useState("");
  const [pPostalCode, setPPostalCode] = useState("");
  const [pSaving, setPSaving] = useState(false);
  const [pSaved, setPSaved] = useState(false);
  const [pDetecting, setPDetecting] = useState(false);
  const [pUploading, setPUploading] = useState(false);
  const [pLoaded, setPLoaded] = useState(false);
  const [pCopiedShare, setPCopiedShare] = useState(false);
  const [pCopiedEmail, setPCopiedEmail] = useState(false);
  const [pBookmarked, setPBookmarked] = useState(false);

  const loadProfileForSettings = React.useCallback(async () => {
    if (!currentUserId) return;
    setPLoaded(false);
    setPSaved(false);
    try {
      const profile = await fetchUserProfile(currentUserId);
      if (profile) {
        setPUserName(profile.user_name || "");
        setPBio(profile.bio || "");
        setPAvatarUrl(profile.avatar_url || null);
        setPAvatarLocal(null);
        setPAvatarFile(null);
        setPCountry(profile.country || "");
        setPState(profile.state || "");
        setPCity(profile.city || "");
        setPPostalCode(profile.postal_code || "");
      }
    } catch {}
    setPLoaded(true);
  }, [currentUserId]);

  React.useEffect(() => {
    if (tab === "Profile") {
      setProfileMode("card");
      loadProfileForSettings();
    }
  }, [tab, loadProfileForSettings]);

  const pickProfileAvatar = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaveStatus("Please choose an image file.");
      setTimeout(() => setSaveStatus(""), 2500);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setSaveStatus("Image must be under 2 MB.");
      setTimeout(() => setSaveStatus(""), 2500);
      return;
    }
    setPAvatarFile(file);
    setPAvatarLocal(URL.createObjectURL(file));
  };

  const uploadProfileAvatar = async (): Promise<string | null> => {
    if (!pAvatarFile) return pAvatarUrl;
    try {
      setPUploading(true);
      await ensureImagesBucket();
      const url = await uploadImage(pAvatarFile, currentUserId);
      setPAvatarUrl(url);
      setPAvatarLocal(null);
      setPAvatarFile(null);
      return url;
    } catch {
      setSaveStatus("Avatar upload failed — try again.");
      setTimeout(() => setSaveStatus(""), 2500);
      return pAvatarUrl;
    } finally {
      setPUploading(false);
    }
  };

  const detectProfileLocation = async () => {
    if (!currentUserId) return;
    setPDetecting(true);
    try {
      const loc = await detectLocationFromIp();
      if (loc) {
        if (loc.country) setPCountry(loc.country);
        if (loc.state) setPState(loc.state);
        if (loc.city) setPCity(loc.city);
        if (loc.postalCode) setPPostalCode(loc.postalCode);
        setSaveStatus("Location detected from IP.");
        setTimeout(() => setSaveStatus(""), 2500);
      } else {
        setSaveStatus("Couldn't detect location.");
        setTimeout(() => setSaveStatus(""), 2500);
      }
    } catch {
      setSaveStatus("Couldn't detect location.");
      setTimeout(() => setSaveStatus(""), 2500);
    } finally {
      setPDetecting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUserId) return;
    setPSaving(true);
    try {
      const finalAvatar = await uploadProfileAvatar();
      const patch: Record<string, unknown> = {};
      const trimmedName = pUserName.trim();
      if (trimmedName) patch.userName = trimmedName;
      if (finalAvatar !== null) patch.avatarUrl = finalAvatar;
      if (pBio !== undefined) patch.bio = pBio.trim() || null;
      patch.country = pCountry.trim() || null;
      patch.state = pState.trim() || null;
      patch.city = pCity.trim() || null;
      patch.postalCode = pPostalCode.trim() || null;
      await updateUserProfile(currentUserId, patch);
      if (trimmedName) onProfileNameChanged?.(trimmedName);
      if (finalAvatar !== null) onProfileAvatarChanged?.(finalAvatar);
      setPSaved(true);
      setSaveStatus("Profile saved!");
      setTimeout(() => {
        setSaveStatus("");
        setPSaved(false);
        setProfileMode("card");
      }, 1200);
    } catch (e) {
      setSaveStatus(e instanceof Error ? e.message : "Couldn't save profile. Try again.");
      setTimeout(() => setSaveStatus(""), 2500);
    } finally {
      setPSaving(false);
    }
  };

  const pDisplayName = pUserName.trim() || (currentUsername ? `@${currentUsername}` : "Workspace User");
  const pDisplayUsername = currentUsername ? `@${currentUsername}` : "@username";
  const pLocationString = [pCity, pState, pCountry].filter(Boolean).join(", ") || "Location not set";

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
        className={`flex h-[min(calc(100vh-40px),720px)] ${tab === "Profile" ? "w-[1200px]" : "w-[980px]"} max-w-[calc(100vw-32px)] overflow-hidden rounded-3xl border border-[#e8e4db] bg-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Left Wispr Flow Clean Sidebar */}
        <aside className="w-[230px] shrink-0 border-r border-[#e8e4db] bg-[#f8f6f0] p-4 flex flex-col justify-between overflow-y-auto scrollbar-none select-none">
          <div className="space-y-5">
            <div>
              <div className="mb-2 text-[11px] font-bold tracking-wider text-[#8c887f] uppercase px-3">
                Settings
              </div>
              <div className="space-y-0.5">
                {[
                  { id: "General", label: "General", icon: Settings },
                  { id: "Voice & Dictation", label: "Voice & Dictation", icon: Mic },
                  { id: "Noska AI", label: "Noska AI", icon: Sparkles },
                  { id: "Developer", label: "Developer", icon: Code2 },
                  { id: "Offline", label: "Offline", icon: HardDrive },
                ].map((item) => (
                  <SettingsNavItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={tab === item.id}
                    onClick={() => setTab(item.id)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-bold tracking-wider text-[#8c887f] uppercase px-3">
                Account
              </div>
              <div className="space-y-0.5">
                <SettingsNavItem icon={UserRound} label="My Profile" active={tab === "Profile"} onClick={() => setTab("Profile")} />
                <SettingsNavItem icon={Bot} label={displayName || "Account"} active={tab === "Account"} onClick={() => setTab("Account")} />
                <SettingsNavItem icon={Palette} label="Customization" active={tab === "Customization"} onClick={() => setTab("Customization")} />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#e8e4db] flex items-center justify-between text-[11px] font-semibold text-[#8c887f] px-2">
            <span>Noska</span>
            <Cloud size={13} />
          </div>
        </aside>
        
        <main className="relative min-w-0 flex-1 overflow-y-auto p-10 scrollbar-thin bg-white text-[#1c1b18]">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-xl bg-[#ede8df] text-[#706c64] hover:bg-[#e4ded3] hover:text-[#1c1b18] transition cursor-pointer"
          >
            <X size={16} />
          </button>
          
          {saveStatus && (
            <div className="absolute top-5 left-10 bg-[#1c1b18] text-white text-xs px-3.5 py-1.5 rounded-xl shadow-lg font-medium">
              {saveStatus}
            </div>
          )}

          {tab === "Account" && (
            <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
              {/* Title */}
              <div className="pt-1">
                <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
                  Account
                </h1>
                <p className="text-xs text-[#706c64] mt-1">
                  Manage your personal user profile, account credentials, and session security.
                </p>
              </div>

              {/* Account Details Card */}
              <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
                {/* Name */}
                <div className="py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Display Name</div>
                      <div className="text-xs text-[#706c64] mt-0.5">{displayName || "Anonymous User"}</div>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Email Address</div>
                      <div className="text-xs text-[#706c64] mt-0.5">{displayEmail || "No email connected"}</div>
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Username</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        {currentUsername ? `@${currentUsername}` : "@username"}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#8c887f] bg-[#ede8df] px-2.5 py-1 rounded-lg">
                      Read-only
                    </span>
                  </div>
                </div>

                {/* Log Out */}
                <div className="py-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-rose-700">Sign Out</div>
                      <div className="text-xs text-[#706c64] mt-0.5">End your current authenticated workspace session.</div>
                    </div>
                    <button
                      onClick={() => { onLogout?.(); onClose?.(); }}
                      className="px-4 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer border border-rose-200"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "Developer" && (
            <div className="max-w-xl space-y-6">
              <div>
                <h2 className="text-[32px] font-bold">Developer</h2>
                <p className="mt-1 text-sm text-[var(--secondary)]">
                  Build on your workspace with the Noska API — pages, tasks, reviews, search and more.
                  Try endpoints live in the API Console.
                </p>
              </div>
              <ApiKeysManager userId={currentUserId} onToast={(msg) => setSaveStatus(msg)} />
            </div>
          )}

          {tab === "Profile" && (
            <div className="flex h-full gap-10">
              {/* Left: live profile card preview (mirrors ProfileModal card) */}
              <div className="w-[360px] sm:w-[380px] shrink-0 p-3.5 rounded-[44px] bg-[#f8f6f0] border border-[#e8e4db] shadow-inner flex items-center justify-center">
                <div
                  className="relative w-full rounded-[36px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between backdrop-blur-2xl text-[#111827] border border-white/90 shadow-[0_25px_60px_-12px_rgba(0,170,230,0.3),0_0_0_1px_rgba(255,255,255,0.7),inset_0_1px_2px_rgba(255,255,255,1)] min-h-[480px]"
                  style={{ background: getProfileCardGradient().background }}
                >
                  <div className="pointer-events-none absolute -bottom-20 left-0 right-0 h-44"
                    style={{ backgroundImage: `linear-gradient(to top, ${getProfileCardGradient().glow}, rgba(255,255,255,0) 100%)` }}
                  />

                  {/* Top Bar: Share Profile + Close (mirrors real card) */}
                  <div className="relative flex items-center justify-end w-full gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/@${currentUsername || "user"}`).then(() => { setPCopiedShare(true); setSaveStatus("Profile link copied!"); setTimeout(() => { setPCopiedShare(false); setSaveStatus(""); }, 2000); }).catch(() => {}); }}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/70 hover:bg-white text-[#1e293b] border border-black/[0.04] shadow-sm hover:shadow transition cursor-pointer"
                      title="Share profile"
                    >
                      {pCopiedShare ? (
                        <Check size={16} className="text-emerald-600" />
                      ) : (
                        <Share2 size={16} className="text-slate-700" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="grid h-10 w-10 place-items-center rounded-full bg-black/5 hover:bg-black/10 text-slate-600 transition cursor-pointer"
                      title="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Avatar (click to change — mirrors ProfileModal) */}
                  <div className="relative mt-2 mb-3 flex items-start">
                    <div
                      className="group relative cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); pickImageFile(pickProfileAvatar); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); pickProfileAvatar(e.dataTransfer.files?.[0] || null); }}
                      title="Change photo — click or drag & drop"
                    >
                      <div
                        className="relative h-[92px] w-[92px] rounded-full ring-4 ring-white/95 shadow-[0_8px_20px_rgba(0,140,220,0.2)] overflow-hidden grid place-items-center text-4xl"
                        style={{ background: getProfileCardGradient().background }}
                      >
                        {pAvatarLocal ? (
                          <img src={pAvatarLocal} alt="Avatar preview" className="h-full w-full object-cover" />
                        ) : pAvatarUrl ? (
                          <img src={pAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-4xl text-white">👤</span>
                        )}
                        {pUploading && (
                          <div className="absolute inset-0 bg-black/50 grid place-items-center">
                            <Loader2 size={22} className="animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); pickImageFile(pickProfileAvatar); }}
                        className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-white text-slate-700 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.12)] hover:bg-slate-50 transition cursor-pointer"
                        title="Change photo"
                      >
                        <Camera size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Name & Handle */}
                  <div className="relative space-y-0.5 mb-3">
                    <h3 className="text-[23px] font-bold tracking-tight text-[#0f172a] leading-tight">{pDisplayName}</h3>
                    <p className="text-[14px] font-medium text-[#64748b]">{pDisplayUsername}</p>
                  </div>

                  {/* Bio */}
                  {pBio ? (
                    <div className="relative mb-3.5 px-3.5 py-2 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <p className="text-[12.5px] text-[#334155] leading-relaxed line-clamp-3">"{pBio}"</p>
                    </div>
                  ) : null}

                  {/* Details: Email & Location */}
                  <div className="relative rounded-2xl bg-white/60 backdrop-blur-md p-3.5 mb-5 border border-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.03)] space-y-2.5">
                    <div
                      onClick={async () => {
                        if (currentUserEmail) {
                          await navigator.clipboard.writeText(currentUserEmail);
                          setPCopiedEmail(true);
                          setSaveStatus("Email copied to clipboard!");
                          setTimeout(() => { setPCopiedEmail(false); setSaveStatus(""); }, 2000);
                        }
                      }}
                      className="flex items-center gap-2.5 text-[12.5px] text-[#334155] hover:text-[#0f172a] transition cursor-pointer"
                      title="Click to copy email"
                    >
                      <div className="h-6 w-6 rounded-full bg-sky-100/80 grid place-items-center shrink-0">
                        <Mail size={13} style={{ color: getProfileCardGradient().accent }} />
                      </div>
                      <span className="truncate flex-1 font-medium">{currentUserEmail || "No email"}</span>
                      {pCopiedEmail ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="text-[#94a3b8] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2.5 text-[12.5px] text-[#334155]">
                      <div className="h-6 w-6 rounded-full bg-cyan-100/80 text-[#0891b2] grid place-items-center shrink-0">
                        <MapPin size={13} />
                      </div>
                      <span className="truncate font-medium">{pLocationString}</span>
                    </div>
                  </div>

                  {/* Bottom Action Row (mirrors real card) */}
                  <div className="relative flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("pDisplayNameInput");
                        input?.scrollIntoView({ behavior: "smooth", block: "center" });
                        input?.focus();
                      }}
                      className="flex-1 h-[52px] rounded-full font-semibold text-[14.5px] text-[#0f172a] bg-gradient-to-r from-[#d0f3f8] via-[#bfeef6] to-[#a8e6f2] active:scale-[0.98] border border-[#9ee4ef] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(0,180,225,0.22)] flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Pencil size={16} style={{ color: getProfileCardGradient().accent }} />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPBookmarked((v) => !v);
                        const msg = pBookmarked ? "Removed from favorites" : "Profile pinned to favorites";
                        setSaveStatus(msg);
                        setTimeout(() => setSaveStatus(""), 2500);
                      }}
                      className={`h-[52px] w-[52px] shrink-0 rounded-full border shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_12px_rgba(0,0,0,0.04)] grid place-items-center transition cursor-pointer ${
                        pBookmarked
                          ? "bg-[#0f172a] text-white border-transparent shadow-md"
                          : "bg-white/85 hover:bg-white text-[#1e293b] border-black/[0.05]"
                      }`}
                      title={pBookmarked ? "Remove bookmark" : "Bookmark profile"}
                    >
                      <Bookmark size={19} className={pBookmarked ? "fill-current text-white" : ""} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: edit form + save */}
              <div className="flex-1 min-w-0 max-w-xl space-y-6 text-[#1c1b18] font-sans">
                <div>
                  <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
                    My Profile
                  </h1>
                  <p className="text-xs text-[#706c64] mt-1">Preview updates live as you edit.</p>
                </div>

                {/* Form Card */}
                <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db] space-y-4">
                  {/* Display Name */}
                  <div className="pt-0">
                    <label className="text-xs font-semibold text-[#1c1b18] block mb-1.5">
                      Display Name
                    </label>
                    <input
                      id="pDisplayNameInput"
                      type="text"
                      value={pUserName}
                      onChange={(e) => setPUserName(e.target.value)}
                      placeholder="How others see you..."
                      maxLength={60}
                      className="w-full rounded-xl border border-[#e8e4db] bg-white px-3.5 py-2 text-xs text-[#1c1b18] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] transition font-medium"
                    />
                  </div>

                  {/* Username */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#1c1b18]">
                        Username
                      </label>
                      <span className="text-[10px] font-semibold text-[#8c887f] bg-[#ede8df] px-2 py-0.5 rounded-md">
                        Read-only
                      </span>
                    </div>
                    <div className="flex h-9 items-center rounded-xl border border-[#e8e4db] bg-[#ede8df]/50 px-3.5 text-xs text-[#706c64] font-mono">
                      {pDisplayUsername}
                    </div>
                    <p className="mt-1 text-[11px] text-[#8c887f]">Username is set at signup and can only be changed by an admin.</p>
                  </div>

                  {/* Bio */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[#1c1b18]">
                        Bio
                      </label>
                      <span className="text-[10px] text-[#8c887f]">{pBio.length}/240</span>
                    </div>
                    <textarea
                      value={pBio}
                      onChange={(e) => setPBio(e.target.value)}
                      placeholder="A few words about you (optional)..."
                      maxLength={240}
                      rows={3}
                      className="w-full rounded-xl border border-[#e8e4db] bg-white px-3.5 py-2 text-xs font-medium text-[#1c1b18] placeholder:text-[#a09c94] focus:outline-none focus:border-[#1c1b18] transition resize-none"
                    />
                  </div>

                  {/* Location Group */}
                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[#1c1b18] flex items-center gap-1.5">
                        <MapPin size={13} className="text-[#a8824b]" /> Location
                      </label>
                      <button
                        type="button"
                        onClick={detectProfileLocation}
                        disabled={pDetecting}
                        className="text-xs font-semibold text-[#a8824b] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {pDetecting ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                        Auto-detect
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-white border border-[#e8e4db]">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#706c64]">Country</label>
                        <input
                          type="text"
                          value={pCountry}
                          onChange={(e) => setPCountry(e.target.value)}
                          placeholder="Country..."
                          className="w-full rounded-lg border border-[#e8e4db] bg-[#f8f6f0] px-2.5 py-1.5 text-xs text-[#1c1b18] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] font-medium"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#706c64]">State</label>
                        <input
                          type="text"
                          value={pState}
                          onChange={(e) => setPState(e.target.value)}
                          placeholder="State..."
                          className="w-full rounded-lg border border-[#e8e4db] bg-[#f8f6f0] px-2.5 py-1.5 text-xs text-[#1c1b18] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] font-medium"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#706c64]">City</label>
                        <input
                          type="text"
                          value={pCity}
                          onChange={(e) => setPCity(e.target.value)}
                          placeholder="City..."
                          className="w-full rounded-lg border border-[#e8e4db] bg-[#f8f6f0] px-2.5 py-1.5 text-xs text-[#1c1b18] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] font-medium"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold text-[#706c64]">Postal Code</label>
                        <input
                          type="text"
                          value={pPostalCode}
                          onChange={(e) => setPPostalCode(e.target.value)}
                          placeholder="Postal code..."
                          className="w-full rounded-lg border border-[#e8e4db] bg-[#f8f6f0] px-2.5 py-1.5 text-xs text-[#1c1b18] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={pSaving || !pLoaded}
                      className="w-full h-11 rounded-xl font-semibold text-xs text-white bg-[#1c1b18] hover:bg-black active:scale-[0.99] shadow-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {pSaving ? (
                        <Loader2 size={14} className="animate-spin text-white" />
                      ) : pSaved ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>{pSaving ? "Saving..." : pSaved ? "Profile Saved" : "Save Profile"}</span>
                    </button>
                  </div>
                </div>
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
            <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
              {/* Title */}
              <div className="pt-1">
                <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
                  Offline & Storage
                </h1>
                <p className="text-xs text-[#706c64] mt-1">
                  Pages, chats, and settings are cached locally for instantaneous offline performance and background cloud sync.
                </p>
              </div>

              {/* Main Storage Card */}
              <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
                {/* Storage usage */}
                <div className="py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Local Storage Footprint</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        {storageBytes < 1024 ? `${storageBytes} B` : storageBytes < 1024 * 1024 ? `${(storageBytes / 1024).toFixed(1)} KB` : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`} used across workspace databases.
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                      Synced
                    </span>
                  </div>
                </div>

                {/* Offline Cache Status */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Offline Mode</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        Seamlessly continue editing and typing when disconnected from the internet.
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[#1c1b18]">Active</span>
                  </div>
                </div>

                {/* Clear Cache */}
                <div className="py-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-rose-700">Clear Local Cache</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        Flushes local device copies without affecting cloud-synced documents.
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!(await window.noskaConfirm?.("Clear locally cached pages, chats, and settings? Anything already synced to your account is safe."))) return;
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
                      className="px-4 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer border border-rose-200"
                    >
                      Clear cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "General" && (
            <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
              {/* Title */}
              <div className="pt-1">
                <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
                  General
                </h1>
                <p className="text-xs text-[#706c64] mt-1">
                  Manage workspace identity, themes, motion effects, and onboarding.
                </p>
              </div>

              {/* Main Settings Card */}
              <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
                {/* 1. Workspace Identity */}
                <div className="py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Workspace Name</div>
                      <div className="text-xs text-[#706c64] mt-0.5">{workspaceName || "Personal Workspace"}</div>
                    </div>
                    <div className="w-48">
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full rounded-xl border border-[#e8e4db] bg-white px-3 py-1.5 text-xs text-[#1c1b18] font-medium outline-none focus:border-[#1c1b18] transition"
                        placeholder="Workspace name..."
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Appearance Theme */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Theme Appearance</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        {theme === "system" ? "Follows system preferences" : theme === "light" ? "Light theme" : "Dark theme"}
                      </div>
                    </div>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold outline-none cursor-pointer border-none"
                    >
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>

                {/* 3. Theme Transition Effects */}
                <div className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Theme Transition Animation</div>
                      <div className="text-xs text-[#706c64] mt-0.5">Fluid morphing animations on theme switches</div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#e8e4db]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#706c64]">Effect Style</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["circle", "rectangle", "polygon", "circle-blur"].map((variant) => (
                          <button
                            key={variant}
                            onClick={() => updateFx({ variant, start: variant === "rectangle" ? "bottom-up" : variant === "polygon" ? "top-left" : "center" })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              themeFx.variant === variant
                                ? "bg-[#1c1b18] text-white"
                                : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                            }`}
                          >
                            {variant}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-[#706c64]">Motion Blur</span>
                      <div className="flex gap-1.5">
                        {["off", "on"].map((v) => (
                          <button
                            key={v}
                            onClick={() => updateFx({ blur: v === "on" })}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              (themeFx.blur ? "on" : "off") === v
                                ? "bg-[#1c1b18] text-white"
                                : "bg-[#ede8df] text-[#4a4742] hover:bg-[#e4ded3]"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Onboarding Replay */}
                <div className="py-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Replay Onboarding</div>
                      <div className="text-xs text-[#706c64] mt-0.5">Go through the initial workspace setup wizard again.</div>
                    </div>
                    <button
                      onClick={onReplayOnboarding}
                      className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
                    >
                      Replay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "Developer" && (
            <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
              {/* Title */}
              <div className="pt-1">
                <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
                  Developer & Diagnostics
                </h1>
                <p className="text-xs text-[#706c64] mt-1">
                  Developer tools, runtime inspection, local storage status, and debug logging.
                </p>
              </div>

              {/* Developer Main Card */}
              <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
                {/* 1. Developer Mode Toggle */}
                <div className="py-4 first:pt-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Developer Mode</div>
                      <div className="text-xs text-[#706c64] mt-0.5">Enables detailed console logging and experimental AI routes.</div>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked={process.env.NODE_ENV === "development"}
                      className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Local Storage Inspector */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">Local Storage Footprint</div>
                      <div className="text-xs text-[#706c64] mt-0.5">
                        {storageBytes < 1024 ? `${storageBytes} B` : storageBytes < 1024 * 1024 ? `${(storageBytes / 1024).toFixed(1)} KB` : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`} cached locally on this device.
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        computeStorageBytes();
                        alert(`Total LocalStorage: ${(storageBytes / 1024).toFixed(1)} KB across workspace stores.`);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
                    >
                      Inspect
                    </button>
                  </div>
                </div>

                {/* 3. Export Diagnostics Report */}
                <div className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#1c1b18]">System Diagnostics</div>
                      <div className="text-xs text-[#706c64] mt-0.5">Generate a JSON diagnostic bundle of active extensions and adapters.</div>
                    </div>
                    <button
                      onClick={() => {
                        const report = {
                          timestamp: new Date().toISOString(),
                          userAgent: navigator.userAgent,
                          storageBytes,
                          aiProvider,
                          speechSupported: typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
                        };
                        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `noska-diagnostics-${Date.now()}.json`;
                        a.click();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
                    >
                      Export
                    </button>
                  </div>
                </div>

                {/* 4. Clear Diagnostic Cache */}
                <div className="py-4 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-rose-700">Clear Cache & Reset</div>
                      <div className="text-xs text-[#706c64] mt-0.5">Flushes local cache and forces client state re-initialization.</div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!(await window.noskaConfirm?.("Clear locally cached diagnostic logs and reset runtime session?"))) return;
                        localStorage.removeItem("noska_voice_flow_settings");
                        window.location.reload();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer border border-rose-200"
                    >
                      Reset Cache
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "Customization" && (
            <ProfileCardCustomization />
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
          {tab === "Voice & Dictation" && (
            <VoiceCustomizationSettings />
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
      className={`mb-1 flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold transition cursor-pointer ${
        active
          ? "bg-[#ede8df] text-[#1c1b18] shadow-xs"
          : "text-[#706c64] hover:bg-[#ede8df]/60 hover:text-[#1c1b18]"
      }`}
    >
      <Icon size={16} className={active ? "text-[#1c1b18]" : "text-[#706c64]"} />
      <span className="truncate">{label}</span>
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
    <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
          Noska AI
        </h1>
        <p className="text-xs text-[#706c64] mt-1">
          Configure intelligence models, providers, context injection, and writing assistants.
        </p>
      </div>

      {/* ─── Active Model Status Card ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] p-5 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#a8824b] mb-0.5">Active Intelligence Model</div>
          <div className="text-lg font-semibold text-[#1c1b18]">{aiManager.getActiveModelName()}</div>
          <div className="text-xs text-[#706c64] mt-0.5">Connected via {aiManager.getActiveProviderName()}</div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ede8df] text-xs font-semibold text-[#1c1b18]">
          <div className={`h-2 w-2 rounded-full ${aiManager.isConfigured() ? "bg-emerald-500" : "bg-amber-400"}`} />
          <span>{aiManager.isConfigured() ? "Ready" : "Needs Key"}</span>
        </div>
      </div>

      {/* ─── Providers Card ───────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
        <div className="text-sm font-semibold text-[#1c1b18] pb-3">AI Providers</div>
        {providerList.map((provider) => {
          const providerConfig = currentConfig.providers[provider.id] || {};
          const isActive = currentConfig.activeProvider === provider.id;
          const hasKey = !provider.requiresKey || Boolean(providerConfig.apiKey);
          const testResult = providerTests[provider.id];
          const isTesting = testingId === provider.id;

          return (
            <div key={provider.id} className="py-4 first:pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${hasKey ? "bg-emerald-500" : "bg-[#b0aca3]"}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#1c1b18]">{provider.name}</span>
                      <span className="rounded-full bg-[#ede8df] px-2 py-0.5 text-[10px] text-[#706c64] font-semibold uppercase">
                        {provider.type}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-[#1c1b18] px-2 py-0.5 text-[10px] text-white font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#706c64] mt-0.5 truncate">
                      {provider.models.length > 0
                        ? provider.models.map(m => m.name).join(", ")
                        : provider.hasDiscover ? "Auto-discover models" : "No models"}
                    </div>
                  </div>
                </div>

                {!isActive && hasKey && (
                  <button
                    onClick={() => handleSetActive(provider.id)}
                    className="px-4 py-1.5 rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] text-[#1c1b18] text-xs font-semibold transition cursor-pointer"
                  >
                    Select
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
                    placeholder={provider.keyPlaceholder || "Paste API key..."}
                    className="flex-1 rounded-xl border border-[#e8e4db] bg-white px-3.5 py-1.5 text-xs text-[#1c1b18] outline-none placeholder:text-[#a09c94] focus:border-[#1c1b18] transition"
                  />
                  <button
                    onClick={() => handleTestConnection(provider.id)}
                    disabled={!providerConfig.apiKey || isTesting}
                    className="rounded-xl bg-[#ede8df] hover:bg-[#e4ded3] px-3.5 py-1.5 text-xs font-semibold text-[#1c1b18] transition disabled:opacity-40 cursor-pointer"
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
                    className="w-full rounded-xl border border-[#e8e4db] bg-white px-3.5 py-1.5 text-xs text-[#1c1b18] outline-none placeholder:text-[#a09c94] focus:border-[#1c1b18] transition"
                  />
                </div>
              )}

              {/* Test result feedback */}
              {testResult && (
                <div className={`mt-2 rounded-xl px-3 py-1.5 text-xs font-medium ${
                  testResult.ok
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}>
                  {testResult.ok ? "✓ Connection verified" : `✗ ${testResult.error || "Connection failed"}`}
                </div>
              )}

              {/* Model selector for active provider */}
              {isActive && provider.models.length > 1 && (
                <div className="mt-3">
                  <select
                    value={currentConfig.activeModel || provider.defaultModel}
                    onChange={(e) => aiManager.setActiveProvider(provider.id, e.target.value)}
                    className="w-full rounded-xl border border-[#e8e4db] bg-white px-3.5 py-1.5 text-xs text-[#1c1b18] font-medium outline-none cursor-pointer"
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

      {/* ─── Custom Providers (bring your own endpoint) ─────────────── */}
      <CustomProviders />

      {/* ─── Context Settings Card ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm divide-y divide-[#e8e4db]">
        <div className="pb-3">
          <div className="text-sm font-semibold text-[#1c1b18]">Context Injection</div>
          <div className="text-xs text-[#706c64] mt-0.5">Control workspace data sent with AI requests.</div>
        </div>
        {[
          { key: "includeCurrentPage", label: "Current page content", desc: "Send the active page's blocks and notes" },
          { key: "includeRecentPages", label: "Recent pages", desc: "Include summaries of recently edited pages" },
          { key: "includeConnections", label: "Graph connections", desc: "Include backlinks and connected notes" },
          { key: "includeTags", label: "Workspace tags", desc: "Send workspace tags for broader context" }
        ].map(({ key, label, desc }) => (
          <div key={key} className="py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1c1b18]">{label}</div>
              <div className="text-xs text-[#706c64] mt-0.5">{desc}</div>
            </div>
            <input
              type="checkbox"
              checked={(currentConfig.context as unknown as Record<string, boolean>)?.[key] !== false}
              onChange={(e) => aiManager.configure({ context: { [key]: e.target.checked } })}
              className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* ─── Ghost Writer Card ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[#1c1b18]">AI Ghost Writer</div>
          <div className="text-xs text-[#706c64] mt-0.5">Predict and suggest completions inline as you pause typing.</div>
        </div>
        <input
          type="checkbox"
          checked={!!ghostWriterEnabled}
          onChange={(e) => setGhostWriterEnabled(e.target.checked)}
          className="h-4 w-4 rounded accent-[#1c1b18] cursor-pointer"
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
            <PageIcon icon={p.icon} size={15} fallback="📄" />
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

function ProfileCardCustomization() {
  const [selected, setSelected] = useState<ProfileCardGradient>(() => getProfileCardGradient());
  const [hovered, setHovered] = useState<ProfileCardGradient | null>(null);
  const [saved, setSaved] = useState(false);
  const [customIcons, setCustomIcons] = useState<ImportedIcon[]>(() => getImportedIcons());
  const [catDraft, setCatDraft] = useState("");
  const [iconUploadSuccess, setIconUploadSuccess] = useState("");
  const preview = hovered || selected;

  const apply = (g: ProfileCardGradient) => {
    setSelected(g);
    setProfileCardGradient(g.id);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  };

  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const cat = catDraft.trim() || "Custom";
    let count = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        addImportedIcon({
          url,
          name: file.name.replace(/\.[^/.]+$/, ""),
          category: cat
        });
        count++;
        setCustomIcons(getImportedIcons());
        setIconUploadSuccess(`Imported ${count} icon(s) into "${cat}"`);
        setTimeout(() => setIconUploadSuccess(""), 3000);
      };
      reader.readAsDataURL(file);
    });
    setCatDraft("");
  };

  const categories = Array.from(new Set(customIcons.map(i => i.category || "Custom")));

  return (
    <div className="max-w-2xl space-y-6 text-[#1c1b18] pb-16 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-[32px] font-normal tracking-tight font-serif text-[#1c1b18]">
            Customization
          </h1>
          <p className="text-xs text-[#706c64] mt-1">
            Personalize profile card gradients, appearance themes, and custom icon packs.
          </p>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            <Check size={13} /> Saved
          </span>
        )}
      </div>

      {/* ─── Profile Card Gradient Card ─── */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm space-y-4">
        <div>
          <div className="text-sm font-semibold text-[#1c1b18]">Profile Card Gradient</div>
          <div className="text-xs text-[#706c64] mt-0.5">
            Choose a gradient for your profile card. Hover any palette to preview it live.
          </div>
        </div>

        {/* Live preview and gradient picker */}
        <div className="grid grid-cols-[220px_1fr] gap-4 items-start max-[640px]:grid-cols-1">
          <div className="rounded-2xl bg-white border border-[#e8e4db] p-3.5 sticky top-0 max-[640px]:static">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#a09c94]">
              Card Preview
            </div>
            <svg
              viewBox="0 0 260 320"
              className="w-full rounded-[20px] border border-white/80 shadow-md"
              style={{ background: preview.background }}
            >
              <defs>
                <linearGradient id="pcp-avatar" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={preview.background} />
                  <stop offset="100%" stopColor={preview.accent} />
                </linearGradient>
              </defs>
              <rect
                x="10"
                y="248"
                width="240"
                height="80"
                rx="20"
                fill={preview.glow}
                opacity="0.5"
              />
              <circle cx="130" cy="78" r="34" fill="url(#pcp-avatar)" stroke="rgba(255,255,255,0.9)" strokeWidth="4" />
              <rect x="86" y="130" width="88" height="12" rx="6" fill="#111827" opacity="0.75" />
              <rect x="92" y="152" width="76" height="8" rx="4" fill="#111827" opacity="0.35" />
              <g>
                <rect x="34" y="196" width="18" height="18" rx="9" fill={preview.background} />
                <rect x="58" y="200" width="120" height="8" rx="4" fill="#111827" opacity="0.45" />
              </g>
              <g>
                <rect x="34" y="222" width="18" height="18" rx="9" fill={preview.background} />
                <rect x="58" y="226" width="140" height="8" rx="4" fill="#111827" opacity="0.45" />
              </g>
              <circle cx="226" cy="44" r="14" fill="rgba(255,255,255,0.6)" stroke={preview.accent} strokeWidth="2" />
              <rect x="220" y="41" width="12" height="6" rx="3" fill={preview.accent} />
            </svg>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1c1b18] truncate">{preview.label}</span>
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: preview.glow }} />
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#e8e4db] p-3.5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#a09c94]">
              Gradient Palette
            </div>
            <div className="max-h-[300px] space-y-3.5 overflow-y-auto pr-1.5 scrollbar-thin">
              {PROFILE_CARD_GRADIENTS_BY_CATEGORY.map(({ category, items }) => (
                <div key={category.id}>
                  <div className="mb-1.5">
                    <div className="text-xs font-bold text-[#1c1b18]">{category.label}</div>
                    <div className="text-[10px] text-[#706c64]">{category.tagline}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => apply(g)}
                        onMouseEnter={() => setHovered(g)}
                        onMouseLeave={() => setHovered(null)}
                        className={[
                          "group flex items-center gap-2 rounded-xl border p-1.5 text-left transition cursor-pointer",
                          selected.id === g.id
                            ? "border-[#1c1b18] bg-[#f8f6f0] shadow-sm"
                            : "border-[#e8e4db] hover:border-[#b0aca3] hover:bg-[#faf9f5]",
                        ].join(" ")}
                      >
                        <span
                          className="h-6 w-6 shrink-0 rounded-lg border border-white/80 shadow-xs"
                          style={{ background: g.background }}
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block truncate text-[11px] font-semibold text-[#1c1b18]">{g.label}</span>
                        </span>
                        {selected.id === g.id && (
                          <Check size={11} className="shrink-0 text-[#1c1b18]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Custom Icons & Icon Packs Manager ─── */}
      <div className="rounded-2xl bg-[#f8f6f0] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#1c1b18]">Imported Icons & Icon Packs</div>
            <div className="text-xs text-[#706c64] mt-0.5">
              Import SVG or PNG icon packs. When you import with a category name, a new icon category appears in the Page Icon Picker.
            </div>
          </div>
          {iconUploadSuccess && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
              ✓ {iconUploadSuccess}
            </span>
          )}
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#e8e4db] space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={catDraft}
              onChange={(e) => setCatDraft(e.target.value)}
              placeholder="Category Name (e.g. Company Brands, Product Badges)..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#f8f6f0] border border-[#e8e4db] text-xs text-[#1c1b18] placeholder:text-[#a09c94] outline-none focus:border-[#1c1b18] transition font-medium"
            />
            <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-95 transition">
              <Camera size={13} />
              <span>Import Icon Files</span>
              <input
                type="file"
                multiple
                accept="image/*,.svg"
                className="hidden"
                onChange={handleImportFiles}
              />
            </label>
          </div>

          {customIcons.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#706c64] border border-dashed border-[#dcd7cb] rounded-xl bg-[#faf9f5]">
              No custom icons imported yet. Choose icon files above to import.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {categories.map((cat) => {
                const iconsInCat = customIcons.filter(i => (i.category || "Custom") === cat);
                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#1c1b18]">
                      <span className="flex items-center gap-1.5">📁 {cat} ({iconsInCat.length})</span>
                    </div>
                    <div className="grid grid-cols-8 gap-2 p-2 rounded-xl bg-[#f8f6f0] border border-[#e8e4db]">
                      {iconsInCat.map((icon) => (
                        <div key={icon.id} className="relative group/ic h-10 w-10 rounded-lg bg-white border border-[#e8e4db] p-1 flex items-center justify-center">
                          <img src={icon.url} alt={icon.name} className="w-full h-full object-contain" />
                          <button
                            onClick={() => {
                              removeImportedIcon(icon.id);
                              setCustomIcons(getImportedIcons());
                            }}
                            className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] grid place-items-center opacity-0 group-hover/ic:opacity-100 transition shadow-xs cursor-pointer"
                            title="Delete icon"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
