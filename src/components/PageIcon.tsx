import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";

type IconComponent = React.ElementType;

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
  fallback?: React.ReactNode;
}

// Icons are stored in documents by name, so lookup happens at runtime. The old
// implementation pulled the entire lucide-react namespace (`import("lucide-react")`)
// which forced every icon in the package (600+ kB) into an eagerly shared chunk
// because any static `from "lucide-react"` import merges with the namespace
// module. Resolving through the official per-icon dynamic imports keeps name
// lookup working while each icon ships in its own tiny on-demand chunk. The
// name→loader table itself is ~270 kB, so even it is fetched on first use
// instead of being part of the initial bundle.
type LucideLoader = () => Promise<{ default: IconComponent }>;

const lucideIconPromises = new Map<string, Promise<IconComponent | null>>();

let lucideIconMapPromise: Promise<Record<string, LucideLoader | undefined>> | null = null;

function loadLucideIconMap() {
  if (!lucideIconMapPromise) {
    lucideIconMapPromise = import("lucide-react/dynamicIconImports").then(
      (mod) => mod.default as unknown as Record<string, LucideLoader | undefined>
    );
  }
  return lucideIconMapPromise;
}

function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([0-9])/g, "$1-$2")
    .replace(/([0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function candidateKeys(name: string): string[] {
  const keys = [toKebabCase(name)];
  // "VideoIcon" / "ImageIcon" style aliases are not part of the dynamic map.
  const withoutSuffix = /^(.*?)Icon$/.exec(name);
  if (withoutSuffix?.[1]) keys.push(toKebabCase(withoutSuffix[1]));
  return keys;
}

function loadLucideIcon(name: string): Promise<IconComponent | null> {
  const cached = lucideIconPromises.get(name);
  if (cached) return cached;
  const promise = (async () => {
    let map: Record<string, LucideLoader | undefined>;
    try {
      map = await loadLucideIconMap();
    } catch {
      return null;
    }
    for (const key of candidateKeys(name)) {
      const loader = map[key];
      if (!loader) continue;
      try {
        const mod = await loader();
        if (mod?.default) return mod.default;
      } catch {
        // Try the next candidate key.
      }
    }
    return null;
  })();
  lucideIconPromises.set(name, promise);
  return promise;
}

export function LucideIcon({ name, className = "", size = 14, fallback = null, style }: LucideIconProps & { style?: React.CSSProperties }) {
  const [Icon, setIcon] = useState<IconComponent | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    setIcon(null);
    setResolved(false);
    void loadLucideIcon(name).then((candidate) => {
      if (!active) return;
      if (candidate) setIcon(() => candidate);
      setResolved(true);
    });
    return () => {
      active = false;
    };
  }, [name]);

  if (Icon) {
    // width/height are pinned in CSS as well as on the svg attributes. An
    // inline svg inside a flex row without `flex: none` gets stretched on the
    // cross axis, which squashes the glyph into an unreadable sliver — the
    // distortion seen in the screenshots.
    return (
      <Icon
        size={size}
        style={{ width: size, height: size, flexShrink: 0, ...style }}
        className={`shrink-0 inline-block align-middle ${className}`}
      />
    );
  }
  if (resolved) return <>{fallback}</>;
  return <>{fallback}</>;
}

export function isLucideIconName(name: string) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

/**
 * Reduce a stored icon value to a bare lucide name, or null if it is not one.
 *
 * Values reach us from several writers (the picker, imports, older documents)
 * that did not always agree on casing or padding. Any near-miss previously
 * fell through to the text renderer below, which displayed the internal
 * identifier — "lucide:CassetteTape" — to the user as if it were the icon.
 */
export function parseLucideIcon(icon: string): string | null {
  const trimmed = String(icon || "").trim();
  if (!trimmed) return null;

  // "lucide:CassetteTape" — prefix matched case-insensitively.
  const prefixed = /^lucide\s*:\s*(.+)$/i.exec(trimmed);
  if (prefixed) {
    const name = prefixed[1].trim();
    return isLucideIconName(name) ? name : null;
  }

  // Bare PascalCase name, optionally kebab/camel from older documents.
  if (isLucideIconName(trimmed)) return trimmed;

  return null;
}

/**
 * True when a stored icon value is safe to render as literal text.
 *
 * Needed for native `<option>` elements, which cannot host a component — there
 * the only options are the raw string or a placeholder. Several such call
 * sites guarded with `icon.startsWith("lucide:")`, which missed the bare
 * PascalCase form written by IconPicker and was case-sensitive, so identifiers
 * leaked into the dropdown labels.
 */
export function isEmojiIcon(value: string | null | undefined): boolean {
  const t = String(value ?? "").trim();
  if (!t) return false;
  // A data URL or any path-like value is never an emoji.
  if (/[:/\\]/.test(t)) return false;
  // A bare identifier ("CassetteTape", "SomeIconName") is not an emoji. Length
  // alone is not enough — an 11-char lucide name passes a >12 check.
  if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(t)) return false;
  // Belt-and-braces for anything else long (e.g. a whole base64 payload).
  if (t.length > 12) return false;
  return true;
}

export interface PageIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fallback?: React.ReactNode;
}

export function PageIcon({
  icon,
  className = "",
  size = 14,
  fallback = <FileText size={size} className="text-[var(--muted)] shrink-0" />
}: PageIconProps) {
  if (!icon) return <>{fallback}</>;

  if (
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("data:") ||
      icon.startsWith("blob:"))
  ) {
    return (
      <img
        src={icon}
        alt="icon"
        width={size}
        height={size}
        decoding="async"
        style={{ width: size, height: size }}
        className={`object-contain shrink-0 rounded-sm inline-block ${className}`}
      />
    );
  }

  if (icon.startsWith("lucide:")) {
    return <LucideIcon name={icon.slice("lucide:".length)} size={size} className={className} fallback={fallback} />;
  }

  if (isLucideIconName(icon) && icon !== "Icon") {
    return <LucideIcon name={icon} size={size} className={className} fallback={fallback} />;
  }

  // Tolerate casing/whitespace variants from older writers before giving up and
  // rendering the value as literal text.
  const lucideName = parseLucideIcon(icon);
  if (lucideName && lucideName !== "Icon") {
    return <LucideIcon name={lucideName} size={size} className={className} fallback={fallback} />;
  }

  // Only emoji-ish values get the text treatment. A long identifier-looking
  // string is a broken icon reference, not an emoji — showing it to the user
  // would leak an internal value into the UI, so fall back instead.
  const looksLikeIdentifier = icon.length > 12 || /[:/_]/.test(icon);
  if (looksLikeIdentifier) return <>{fallback}</>;

  return (
    <span
      style={{ fontSize: `${Math.round(size * 1.05)}px`, lineHeight: 1 }}
      className={`select-none shrink-0 inline-flex items-center justify-center leading-none ${className}`}
    >
      {icon}
    </span>
  );
}

export default PageIcon;
