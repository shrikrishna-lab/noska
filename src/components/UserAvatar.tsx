import React, { useState, useEffect } from "react";

// Global cache of failed image URLs to avoid repeated network errors or flashes
const globalBrokenUrls = new Set<string>();
const globalLoadedUrls = new Set<string>();

const AVATAR_GRADIENTS = [
  "from-pink-500 via-rose-500 to-fuchsia-600",
  "from-emerald-500 via-lime-500 to-green-600",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-purple-500 via-fuchsia-500 to-pink-500",
  "from-amber-400 via-orange-500 to-red-500",
  "from-teal-400 via-emerald-500 to-cyan-500",
  "from-indigo-400 via-purple-500 to-pink-500",
  "from-cyan-400 via-sky-500 to-blue-600"
];

export function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  // Filter out emoji avatars or single symbols
  if (trimmed.length <= 4 && !trimmed.includes("/")) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("/")
  );
}

export interface UserAvatarProps {
  name?: string;
  avatar?: string | null;
  color?: string;
  size?: number;
  className?: string;
  showStatusDot?: boolean;
  status?: "online" | "offline" | "away" | "editing" | "viewing";
}

/**
 * Universal Apple-grade UserAvatar component.
 * Guaranteed to NEVER render broken Chromium image icons, torn corners, or leaking alt text.
 */
export function UserAvatar({
  name,
  avatar,
  color,
  size = 28,
  className = "",
  showStatusDot = false,
  status = "offline"
}: UserAvatarProps) {
  const displayName = name || "User";
  const initial = displayName.trim()[0]?.toUpperCase() || "U";
  const trimmedAvatar = avatar?.trim() || "";

  const isImgUrl = isValidImageUrl(trimmedAvatar);
  const isEmoji = !isImgUrl && trimmedAvatar.length > 0 && trimmedAvatar.length <= 4 && !trimmedAvatar.includes("/");
  const gradient = getAvatarGradient(displayName);

  const [hasFailed, setHasFailed] = useState(() => {
    return isImgUrl ? globalBrokenUrls.has(trimmedAvatar) : false;
  });

  const [hasLoaded, setHasLoaded] = useState(() => {
    return isImgUrl ? globalLoadedUrls.has(trimmedAvatar) : false;
  });

  useEffect(() => {
    if (!isImgUrl) {
      setHasFailed(false);
      setHasLoaded(false);
      return;
    }
    if (globalBrokenUrls.has(trimmedAvatar)) {
      setHasFailed(true);
      setHasLoaded(false);
    } else if (globalLoadedUrls.has(trimmedAvatar)) {
      setHasLoaded(true);
      setHasFailed(false);
    } else {
      setHasFailed(false);
      setHasLoaded(false);
    }
  }, [trimmedAvatar, isImgUrl]);

  const shouldRenderImg = isImgUrl && !hasFailed;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full select-none shrink-0 inline-flex items-center justify-center ${className}`}
    >
      {/* 1. Base Layer: Gradient Initial or Emoji (Always present as solid fallback) */}
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: color || undefined,
          fontSize: isEmoji ? `${Math.round(size * 0.55)}px` : `${Math.max(10, Math.round(size * 0.38))}px`
        }}
        className={`w-full h-full rounded-full flex items-center justify-center font-bold text-white shadow-xs overflow-hidden ${
          !color && !isEmoji ? `bg-gradient-to-tr ${gradient}` : ""
        } ${isEmoji ? "bg-black/[0.04] dark:bg-white/[0.08]" : ""}`}
      >
        {isEmoji ? trimmedAvatar : initial}
      </div>

      {/* 2. Image Layer: Rendered on top, only visible once successfully loaded */}
      {shouldRenderImg && (
        <img
          src={trimmedAvatar}
          alt=""
          aria-hidden="true"
          style={{ width: size, height: size }}
          onLoad={() => {
            globalLoadedUrls.add(trimmedAvatar);
            setHasLoaded(true);
          }}
          onError={() => {
            globalBrokenUrls.add(trimmedAvatar);
            setHasFailed(true);
          }}
          className={`absolute inset-0 w-full h-full rounded-full object-cover pointer-events-none transition-opacity duration-200 ${
            hasLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* 3. Optional Status Dot (Apple-style specular dot) */}
      {showStatusDot && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#202024] shadow-xs ${
            status === "online" || status === "editing" || status === "viewing"
              ? "bg-emerald-500"
              : "bg-neutral-400 dark:bg-neutral-500"
          }`}
        />
      )}
    </div>
  );
}

export default UserAvatar;
