import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, MapPin, AtSign, Mail, Loader2, Check, Sparkles, UserRound,
  Save, RotateCcw, Share2, Bookmark, Pencil, ChevronLeft,
  Copy, CheckCircle2
} from "lucide-react";
import {
  fetchUserProfile, updateUserProfile, detectLocationFromIp,
  uploadImage, ensureImagesBucket
} from "../lib/supabaseService";
import { getProfileCardGradient } from "../lib/profileCardGradient";
import { pickImageFile } from "../lib/filePicker";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string | null;
  currentUsername: string | null;
  currentUserEmail: string | null;
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
  onNameChanged,
  onAvatarChanged,
  onToast
}: ProfileModalProps) {
  const [mode, setMode] = useState<"card" | "edit">("card");
  const [userName, setUserName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLocal, setAvatarLocal] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [usernameDraft, setUsernameDraft] = useState(currentUsername || "");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Load user profile
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
        setPostalCode(profile.postal_code || "");
      }
    } catch {}
    setProfileLoaded(true);
  }, [currentUserId]);

  useEffect(() => {
    if (open) {
      setMode("card");
      setUsernameDraft(currentUsername || "");
      loadProfile();
    }
  }, [open, currentUsername, loadProfile]);

  // Escape to close
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
    } catch {
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
        if (loc.postalCode) setPostalCode(loc.postalCode);
        onToast?.("Location detected from IP.");
      } else {
        onToast?.("Couldn't detect location.");
      }
    } catch {
      onToast?.("Couldn't detect location.");
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleShareProfile = async () => {
    const handle = currentUsername || "user";
    const shareUrl = `${window.location.origin}/@${handle}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      onToast?.("Profile link copied to clipboard!");
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      onToast?.(`@${handle}`);
    }
  };

  const toggleBookmark = () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    onToast?.(next ? "Profile pinned to favorites" : "Removed from favorites");
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);
    try {
      const finalAvatar = await uploadAvatar();

      const patch: Record<string, unknown> = {};
      const trimmedName = userName.trim();
      if (trimmedName) patch.userName = trimmedName;
      if (finalAvatar !== null) patch.avatarUrl = finalAvatar;
      if (bio !== undefined) patch.bio = bio.trim() || null;
      patch.country = country.trim() || null;
      patch.state = state.trim() || null;
      patch.city = city.trim() || null;
      patch.postalCode = postalCode.trim() || null;

      await updateUserProfile(currentUserId, patch);

      if (trimmedName) onNameChanged?.(trimmedName);
      if (finalAvatar !== null) onAvatarChanged?.(finalAvatar);

      setSaved(true);
      onToast?.("Profile saved!");
      setTimeout(() => {
        setSaved(false);
        setMode("card");
      }, 900);
    } catch (e) {
      onToast?.(e instanceof Error ? e.message : "Couldn't save profile. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const displayName = userName.trim() || (currentUsername ? `@${currentUsername}` : "Workspace User");
  const displayUsername = currentUsername ? `@${currentUsername}` : "@username";
  const locationString = [city, state, country].filter(Boolean).join(", ") || "Location not set";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 p-4 bg-black/45 backdrop-blur-md saturate-[120%] flex items-center justify-center select-none"
          onMouseDown={onClose}
        >
          {/* Subtle soft localized glow behind the card */}
          <div
            className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 w-[440px] h-[500px] rounded-full blur-[80px] opacity-70"
            style={{ background: getProfileCardGradient().glow }}
          />

          {/* ── Apple Liquid Glass Standalone Card ── */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="relative w-[360px] sm:w-[380px] rounded-[36px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between backdrop-blur-2xl text-[#111827] border border-white/90 shadow-[0_25px_60px_-12px_rgba(0,170,230,0.3),0_0_0_1px_rgba(255,255,255,0.7),inset_0_1px_2px_rgba(255,255,255,1)]"
            style={{ background: getProfileCardGradient().background }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Radiant Bottom Ambient Glow */}
            <div
              className="pointer-events-none absolute -bottom-20 left-0 right-0 h-44 bg-gradient-to-t to-transparent"
              style={{
                backgroundImage: `linear-gradient(to top, ${getProfileCardGradient().glow}, rgba(255,255,255,0) 100%)`,
              }}
            />

            <AnimatePresence mode="wait">
              {/* ────────────────────────────────────────────────────────── */}
              {/* VIEW MODE: EXACT NOSKA PROFILE DATA ON APPLE GLASS CARD    */}
              {/* ────────────────────────────────────────────────────────── */}
              {mode === "card" && (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col justify-between min-h-[460px]"
                >
                  {/* Top Bar: Share Button + Close Button */}
                  <div className="relative flex items-center justify-end w-full gap-2 mb-1">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleShareProfile}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/70 hover:bg-white text-[#1e293b] border border-black/[0.04] shadow-sm hover:shadow transition cursor-pointer"
                      title="Share profile"
                    >
                      {copiedShare ? (
                        <Check size={16} className="text-emerald-600" />
                      ) : (
                        <Share2 size={16} className="text-slate-700" />
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      className="grid h-10 w-10 place-items-center rounded-full bg-black/5 hover:bg-black/10 text-slate-600 transition cursor-pointer"
                      title="Close"
                    >
                      <X size={15} />
                    </motion.button>
                  </div>

                  {/* Avatar Section */}
                  <div className="relative mt-2 mb-3 flex items-start">
                    <div
                      className="group relative cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); pickImageFile(pickAvatar); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); pickAvatar(e.dataTransfer.files?.[0] || null); }}
                      title="Change photo — click or drag & drop"
                    >
                      <motion.div
                        whileHover={{ scale: 1.03 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className="relative h-[92px] w-[92px] rounded-full ring-4 ring-white/95 shadow-[0_8px_20px_rgba(0,140,220,0.2)] overflow-hidden grid place-items-center text-4xl"
                        style={{ background: getProfileCardGradient().background }}
                      >
                        {avatarLocal ? (
                          <img src={avatarLocal} alt="Avatar preview" className="h-full w-full object-cover" />
                        ) : avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-4xl text-white">👤</span>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/50 grid place-items-center">
                            <Loader2 size={22} className="animate-spin text-white" />
                          </div>
                        )}
                      </motion.div>

                      {/* Camera Button Badge */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.88 }}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); pickImageFile(pickAvatar); }}
                        className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-white text-slate-700 border border-slate-200/80 shadow-[0_2px_6px_rgba(0,0,0,0.12)] hover:bg-slate-50 transition cursor-pointer"
                        title="Change photo"
                      >
                        <Camera size={13} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Name & Handle */}
                  <div className="relative space-y-0.5 mb-3">
                    <h3 className="text-[23px] font-bold tracking-tight text-[#0f172a] leading-tight">
                      {displayName}
                    </h3>
                    <p className="text-[14px] font-medium text-[#64748b]">
                      {displayUsername}
                    </p>
                  </div>

                  {/* Bio */}
                  {bio ? (
                    <div className="relative mb-3.5 px-3.5 py-2 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <p className="text-[12.5px] text-[#334155] leading-relaxed line-clamp-3">
                        "{bio}"
                      </p>
                    </div>
                  ) : null}

                  {/* Details Card (Email & Location) */}
                  <div className="relative rounded-2xl bg-white/60 backdrop-blur-md p-3.5 mb-5 border border-white/90 shadow-[0_2px_6px_rgba(0,0,0,0.03)] space-y-2.5">
                    {/* Email */}
                    <div
                      onClick={async () => {
                        if (currentUserEmail) {
                          await navigator.clipboard.writeText(currentUserEmail);
                          setCopiedEmail(true);
                          onToast?.("Email copied to clipboard!");
                          setTimeout(() => setCopiedEmail(false), 2000);
                        }
                      }}
                      className="flex items-center gap-2.5 text-[12.5px] text-[#334155] hover:text-[#0f172a] transition cursor-pointer"
                      title="Click to copy email"
                    >
                      <div className="h-6 w-6 rounded-full bg-sky-100/80 grid place-items-center shrink-0">
                        <Mail size={13} style={{ color: getProfileCardGradient().accent }} />
                      </div>
                      <span className="truncate flex-1 font-medium">{currentUserEmail || "No email"}</span>
                      {copiedEmail ? <Check size={14} className="text-emerald-600 shrink-0" /> : <Copy size={13} className="text-[#94a3b8] shrink-0" />}
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2.5 text-[12.5px] text-[#334155]">
                      <div className="h-6 w-6 rounded-full bg-cyan-100/80 text-[#0891b2] grid place-items-center shrink-0">
                        <MapPin size={13} />
                      </div>
                      <span className="truncate font-medium">{locationString}</span>
                    </div>
                  </div>

                  {/* Bottom Action Row: Big Pill Button ("Edit Profile") + Circular Bookmark */}
                  <div className="relative flex items-center gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02, filter: "brightness(1.03)" }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setMode("edit")}
                      className="flex-1 h-[52px] rounded-full font-semibold text-[14.5px] text-[#0f172a] bg-gradient-to-r from-[#d0f3f8] via-[#bfeef6] to-[#a8e6f2] active:scale-[0.98] border border-[#9ee4ef] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(0,180,225,0.22)] flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Pencil size={16} style={{ color: getProfileCardGradient().accent }} />
                      <span>Edit Profile</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.88 }}
                      onClick={toggleBookmark}
                      className={`h-[52px] w-[52px] shrink-0 rounded-full border shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_12px_rgba(0,0,0,0.04)] grid place-items-center transition cursor-pointer ${
                        isBookmarked
                          ? "bg-[#0f172a] text-white border-transparent shadow-md"
                          : "bg-white/85 hover:bg-white text-[#1e293b] border-black/[0.05]"
                      }`}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark profile"}
                    >
                      <Bookmark size={19} className={isBookmarked ? "fill-current text-white" : ""} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* EDIT MODE: EDIT ACTUAL NOSKA PROFILE FIELDS IN-PLACE       */}
              {/* ────────────────────────────────────────────────────────── */}
              {mode === "edit" && (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col justify-between min-h-[460px]"
                >
                  {/* Top Bar: Back to Card */}
                  <div className="flex items-center justify-between mb-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setMode("card")}
                      className="flex items-center gap-1 text-[13px] font-semibold text-[#0284c7] hover:underline cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Back to card
                    </motion.button>
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#64748b]">Edit Details</span>
                  </div>

                  {/* Scrollable Form Fields */}
                  <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-3.5 scrollbar-thin">
                    {/* Display Name */}
                    <div>
                      <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="How others see you"
                        maxLength={60}
                        className="w-full h-10 rounded-xl bg-white/80 border border-black/[0.08] px-3 text-[13px] font-medium text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#0284c7]/40 shadow-sm"
                      />
                    </div>

                    {/* Username Handle */}
                    <div>
                      <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#64748b]">@</span>
                        <input
                          type="text"
                          value={usernameDraft}
                          readOnly
                          placeholder="username"
                          maxLength={20}
                          className="w-full h-10 rounded-xl bg-white/60 border border-black/[0.06] pl-7 pr-8 text-[13px] font-medium text-[#0f172a] opacity-70 cursor-not-allowed"
                          title="Username is set at signup and can only be changed by an admin."
                        />
                      </div>
                      <p className="text-[10.5px] text-[#64748b] mt-1">Username is set at signup and can only be changed by an admin.</p>
                    </div>

                    {/* Bio */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11.5px] font-bold text-[#334155]">Bio</label>
                        <span className="text-[10.5px] text-[#64748b]">{bio.length}/240</span>
                      </div>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="A few words about you (optional)..."
                        maxLength={240}
                        rows={2}
                        className="w-full rounded-xl bg-white/80 border border-black/[0.08] p-2.5 text-[12.5px] font-medium text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#0284c7]/40 shadow-sm resize-none"
                      />
                    </div>

                    {/* Location */}
                    <div className="p-3 rounded-2xl bg-white/60 border border-white space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11.5px] font-bold text-[#334155] flex items-center gap-1">
                          <MapPin size={12} className="text-[#0284c7]" /> Location
                        </label>
                        <button
                          type="button"
                          onClick={detectLocation}
                          disabled={detectingLocation}
                          className="text-[11px] font-semibold text-[#0284c7] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          {detectingLocation ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                          Auto-detect
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#64748b] mb-0.5">Country</label>
                          <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="Country"
                            className="w-full h-8 rounded-lg bg-white/80 border border-black/[0.08] px-2 text-[11.5px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748b] mb-0.5">State</label>
                          <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="State"
                            className="w-full h-8 rounded-lg bg-white/80 border border-black/[0.08] px-2 text-[11.5px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748b] mb-0.5">City</label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="City"
                            className="w-full h-8 rounded-lg bg-white/80 border border-black/[0.08] px-2 text-[11.5px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#64748b] mb-0.5">Postal Code</label>
                          <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            placeholder="Postal code"
                            className="w-full h-8 rounded-lg bg-white/80 border border-black/[0.08] px-2 text-[11.5px] text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="mt-4 pt-2 border-t border-black/[0.05]">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleSave}
                      disabled={saving || !profileLoaded}
                      className="w-full h-12 rounded-full font-semibold text-[14px] text-[#0f172a] bg-gradient-to-r from-[#d0f3f8] via-[#bfeef6] to-[#a8e6f2] active:scale-[0.98] border border-[#9ee4ef] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_4px_16px_rgba(0,180,225,0.22)] flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 size={16} className="animate-spin text-[#0f172a]" />
                      ) : saved ? (
                        <CheckCircle2 size={16} className="text-emerald-700" />
                      ) : (
                        <Save size={16} style={{ color: getProfileCardGradient().accent }} />
                      )}
                      <span>{saving ? "Saving..." : saved ? "Saved!" : "Save Profile"}</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}