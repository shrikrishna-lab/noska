import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, MapPin, AtSign, Mail, Loader2, Check, Sparkles, UserRound, Save, Trash2, Upload, RotateCcw
} from "lucide-react";
import { SPRING_PRESETS, StaggerContainer, StaggerItem, MotionInput, MotionTextArea } from "../features/motion/MotionSystem";
import {
  fetchUserProfile, updateUserProfile, setUsername, isUsernameAvailable,
  isValidUsernameFormat, normalizeUsername, detectLocationFromIp,
  uploadImage, ensureImagesBucket
} from "../lib/supabaseService";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string | null;
  currentUsername: string | null;
  currentUserEmail: string | null;
  onUsernameChanged: (username: string) => void;
  onNameChanged?: (name: string) => void;
  onAvatarChanged?: (avatarUrl: string | null) => void;
  onToast?: (message: string) => void;
}

export default function ProfileModal({
  open,
  onClose,
  currentUserId,
  currentUsername,
  currentUserEmail,
  onUsernameChanged,
  onNameChanged,
  onAvatarChanged,
  onToast
}: ProfileModalProps) {
  const [userName, setUserName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [usernameDraft, setUsernameDraft] = useState(currentUsername || "");
  const [usernameCheck, setUsernameCheck] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "unchanged">("unchanged");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameRequestIdRef = useRef(0);

  // Load the real profile whenever the modal opens.
  const loadProfile = useCallback(async () => {
    if (!currentUserId) return;
    setProfileLoaded(false);
    setSaved(false);
    try {
      const profile = await fetchUserProfile(currentUserId);
      if (profile) {
        setUserName(profile.user_name || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || null);
        setAvatarLocal(null);
        setAvatarFile(null);
        setCountry(profile.country || "");
        setState(profile.state || "");
        setCity(profile.city || "");
        setArea(profile.area || "");
        setPostalCode(profile.postal_code || "");
      }
    } catch {}
    setProfileLoaded(true);
  }, [currentUserId]);

  useEffect(() => {
    if (open) {
      setUsernameDraft(currentUsername || "");
      setUsernameCheck("unchanged");
      setUsernameError(null);
      loadProfile();
    }
  }, [open, currentUsername, loadProfile]);

  // Debounced username availability check (mirrors SettingsModal/UsernameStep).
  useEffect(() => {
    const value = usernameDraft.trim();
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);

    if (!value || value === currentUsername) {
      setUsernameCheck("unchanged");
      setUsernameError(null);
      return;
    }
    if (!isValidUsernameFormat(value)) {
      setUsernameCheck("invalid");
      setUsernameError("3-20 characters: lowercase letters, numbers, or underscores, starting with a letter.");
      return;
    }

    setUsernameCheck("checking");
    setUsernameError(null);
    const requestId = ++usernameRequestIdRef.current;
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const available = await isUsernameAvailable(value, currentUserId || undefined);
        if (usernameRequestIdRef.current !== requestId) return;
        setUsernameCheck(available ? "available" : "taken");
        if (!available) setUsernameError("That username is already taken.");
      } catch {
        if (usernameRequestIdRef.current !== requestId) return;
        setUsernameCheck("idle");
        setUsernameError("Couldn't check availability — check your connection and try again.");
      }
    }, 400);

    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [usernameDraft, currentUserId, currentUsername]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const pickAvatar = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast?.("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      onToast?.("Image must be under 2 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarLocal(URL.createObjectURL(file));
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarUrl;
    try {
      setUploading(true);
      await ensureImagesBucket();
      const url = await uploadImage(avatarFile, currentUserId);
      setAvatarUrl(url);
      setAvatarLocal(null);
      setAvatarFile(null);
      return url;
    } catch (e) {
      onToast?.("Avatar upload failed — try again.");
      return avatarUrl;
    } finally {
      setUploading(false);
    }
  };

  const detectLocation = async () => {
    if (!currentUserId) return;
    setDetectingLocation(true);
    try {
      const loc = await detectLocationFromIp();
      if (loc) {
        if (loc.country) setCountry(loc.country);
        if (loc.state) setState(loc.state);
        if (loc.city) setCity(loc.city);
        if (loc.area) setArea(loc.area);
        if (loc.postalCode) setPostalCode(loc.postalCode);
        onToast?.("Location detected from your IP.");
      } else {
        onToast?.("Couldn't detect location — fill it in manually.");
      }
    } catch {
      onToast?.("Couldn't detect location — fill it in manually.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);
    try {
      // Avatar first (needs to upload before persisting its URL).
      const finalAvatar = await uploadAvatar();

      // Username — only if actually changed.
      let usernameChanged = false;
      if (usernameCheck === "available") {
        await setUsername(currentUserId, usernameDraft);
        const normalized = normalizeUsername(usernameDraft);
        onUsernameChanged(normalized);
        usernameChanged = true;
      }

      const patch: Record<string, unknown> = {};
      const trimmedName = userName.trim();
      if (trimmedName) patch.userName = trimmedName;
      if (finalAvatar !== null) patch.avatarUrl = finalAvatar;
      if (bio !== undefined) patch.bio = bio.trim() || null;
      patch.country = country.trim() || null;
      patch.state = state.trim() || null;
      patch.city = city.trim() || null;
      patch.area = area.trim() || null;
      patch.postalCode = postalCode.trim() || null;

      await updateUserProfile(currentUserId, patch);

      if (trimmedName) onNameChanged?.(trimmedName);
      if (finalAvatar !== null) onAvatarChanged?.(finalAvatar);

      setSaved(true);
      onToast?.(usernameChanged ? "Profile saved — username updated!" : "Profile saved!");
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Couldn't save profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = userName.trim() || (currentUsername ? `@${currentUsername}` : "Workspace User");

  return (
    <AnimatePresence>
      {open && (
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
            className="relative flex w-[960px] max-w-[calc(100vw-32px)] max-h-[min(calc(100vh-40px),760px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text)] transition cursor-pointer"
              title="Close"
            >
              <X size={17} />
            </button>

            {/* ── Left: profile card ── */}
            <aside className="relative w-[320px] shrink-0 overflow-hidden bg-gradient-to-br from-[#1a2234] via-[#101827] to-[#0b1120] text-white p-7 flex flex-col gap-6">
              {/* Ambient glow orbs */}
              <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[var(--noska-blue)]/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />

              <div className="relative">
                <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-white/40">Your profile</div>
              </div>

              {/* Avatar */}
              <div className="relative flex flex-col items-center gap-4 mt-2">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_PRESETS.bouncy}
                  className="group relative"
                >
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[var(--noska-blue)] to-purple-500 opacity-70 blur-[6px] group-hover:opacity-100 transition" />
                  <div className="relative h-28 w-28 rounded-full border-2 border-white/20 overflow-hidden bg-white/10 grid place-items-center text-5xl select-none shadow-xl">
                    {avatarLocal ? (
                      <img src={avatarLocal} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-4xl opacity-90">👤</span>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 grid place-items-center">
                        <Loader2 size={22} className="animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-[var(--noska-blue)] text-white border-2 border-[#1a2234] shadow-lg hover:scale-110 active:scale-95 transition cursor-pointer"
                    title="Change photo"
                  >
                    <Camera size={15} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { pickAvatar(e.target.files?.[0] || null); e.target.value = ""; }}
                  />
                </motion.div>

                <div className="text-center space-y-1">
                  <div className="text-lg font-bold tracking-wide leading-tight">{displayName}</div>
                  <div className="text-[12px] text-white/50 font-medium">@{currentUsername || "set a username"}</div>
                </div>
              </div>

              <div className="relative h-px bg-white/10" />

              <div className="relative space-y-3 text-[12px]">
                <div className="flex items-center gap-2.5 text-white/60">
                  <Mail size={13} className="text-white/35 shrink-0" />
                  <span className="truncate">{currentUserEmail || "no email"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/60">
                  <MapPin size={13} className="text-white/35 shrink-0" />
                  <span className="truncate">
                    {[area, city, state, country].filter(Boolean).join(", ") || "Location not set"}
                  </span>
                </div>
              </div>

              <button
                onClick={detectLocation}
                disabled={detectingLocation}
                className="relative mt-auto flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-white/10 transition disabled:opacity-50 cursor-pointer"
              >
                {detectingLocation ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                {detectingLocation ? "Detecting location..." : "Detect location from IP"}
              </button>
            </aside>

            {/* ── Right: editable fields ── */}
            <main className="relative min-w-0 flex-1 overflow-y-auto p-9 scrollbar-thin bg-[var(--surface-2)] text-[var(--text)]">
              <StaggerContainer className="max-w-lg space-y-7">
                <StaggerItem>
                  <div>
                    <h2 className="text-[28px] font-bold leading-tight">Edit profile</h2>
                    <p className="text-[12.5px] text-[var(--muted)] mt-1">
                      Personalize how you appear across Noska. Save anytime — this is entirely optional.
                    </p>
                  </div>
                </StaggerItem>

                {/* Display name */}
                <StaggerItem>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--secondary)]">
                      <UserRound size={13} className="text-[var(--noska-blue)]" /> Display name
                    </span>
                    <MotionInput
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="How others see you"
                      maxLength={60}
                    />
                  </label>
                </StaggerItem>

                {/* Username */}
                <StaggerItem>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--secondary)]">
                      <AtSign size={13} className="text-[var(--noska-blue)]" /> Username
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--muted)] pointer-events-none">@</span>
                      <MotionInput
                        value={usernameDraft}
                        onChange={(e) => setUsernameDraft(normalizeUsername(e.target.value))}
                        onKeyDown={(e) => { if (e.key === "Enter" && usernameCheck === "available") handleSave(); }}
                        maxLength={20}
                        className="pl-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameCheck === "checking" && <Loader2 size={14} className="animate-spin text-[var(--muted)]" />}
                        {usernameCheck === "available" && <Check size={14} style={{ color: "#10b981" }} />}
                        {(usernameCheck === "taken" || usernameCheck === "invalid") && <X size={14} style={{ color: "#ef4444" }} />}
                      </span>
                    </div>
                    {usernameError ? (
                      <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{usernameError}</p>
                    ) : (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {usernameCheck === "available"
                          ? `@${normalizeUsername(usernameDraft)} is available`
                          : "Your unique handle across Noska — others use it to share pages with you."}
                      </p>
                    )}
                  </label>
                </StaggerItem>

                {/* Bio */}
                <StaggerItem>
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--secondary)]">
                      <Sparkles size={13} className="text-[var(--noska-blue)]" /> Bio
                    </span>
                    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 hover:border-[var(--border-strong)] transition">
                      <MotionTextArea
                        value={bio}
                        onChange={setBio}
                        placeholder="A few words about you (optional)"
                        maxLength={240}
                        className="min-h-[72px]"
                      />
                      <div className="pb-1 text-right text-[10px] text-[var(--muted)]">{bio.length}/240</div>
                    </div>
                  </label>
                </StaggerItem>

                {/* Location */}
                <StaggerItem>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--secondary)]">
                        <MapPin size={13} className="text-[var(--noska-blue)]" /> Location
                      </span>
                      <button
                        onClick={detectLocation}
                        disabled={detectingLocation}
                        className="flex items-center gap-1 text-[11px] font-medium text-[var(--noska-blue)] hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {detectingLocation ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                        {detectingLocation ? "Detecting..." : "Auto-detect"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { label: "Country", value: country, set: setCountry, ph: "India" },
                        { label: "State", value: state, set: setState, ph: "Maharashtra" },
                        { label: "City", value: city, set: setCity, ph: "Pune" },
                        { label: "Area", value: area, set: setArea, ph: "Kothrud" },
                        { label: "Postal code", value: postalCode, set: setPostalCode, ph: "411038", span: true },
                      ].map((f) => (
                        <div key={f.label} className={f.span ? "col-span-2" : ""}>
                          <label className="mb-1 block text-[10.5px] font-medium text-[var(--muted)]">{f.label}</label>
                          <MotionInput
                            value={f.value}
                            onChange={(e) => f.set(e.target.value)}
                            placeholder={f.ph}
                            maxLength={60}
                            className="text-[12px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </main>

            {/* Save bar */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--surface-2)]/95 backdrop-blur px-9 py-3.5">
              <AnimatePresence>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-[12px] font-semibold"
                    style={{ color: "#10b981" }}
                  >
                    <Check size={14} /> Saved!
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                onClick={handleSave}
                disabled={saving || !profileLoaded}
                className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-[var(--accent-deep)] hover:-translate-y-px hover:shadow-md active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}