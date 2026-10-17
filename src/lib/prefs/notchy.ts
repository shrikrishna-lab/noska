/**
 * Preferences for the "Notchy" — the dockable approval handle on the frame.
 *
 * Stored in localStorage rather than the settings tables because these are
 * per-device presentation choices, not account data: they describe this
 * browser's chrome, and following a person to another machine would be wrong.
 */

export type NotchyVisibility = "permanent" | "always" | "needed";

export type NotchySurface = "glass" | "solid" | "matte" | "outline";
export type NotchyTexture = "none" | "grain" | "frost" | "sheen";
export type NotchyShape = "pill" | "rounded" | "square";
export type NotchyGlow = "none" | "soft" | "strong";
export type NotchyDensity = "compact" | "regular";
export type NotchyMotion = "spring" | "gentle" | "off";

export interface NotchyPrefs {
  /** When the handle is on screen at all. */
  visibility: NotchyVisibility;
  /** Which fields the card lists. */
  showTitle: boolean;
  showStatus: boolean;
  showDetail: boolean;
  showReviewers: boolean;
  showTimestamp: boolean;
  /** Which decisions the footer offers. */
  allowApprove: boolean;
  allowReject: boolean;
  /** Look. */
  surface: NotchySurface;
  /** Fine surface detail laid over the finish. */
  texture: NotchyTexture;
  /** Corner treatment of the bar and card. */
  shape: NotchyShape;
  /** Halo behind the handle while work is outstanding. */
  glow: NotchyGlow;
  density: NotchyDensity;
  motion: NotchyMotion;
  /** Position on the frame. */
  slot: string;
  /**
   * Hides the bar entirely, across reloads. Deliberately separate from the
   * card's close, which only minimises: losing the bar is a deliberate act from
   * Settings, not something to trigger by closing a card you were reading.
   */
  hidden: boolean;
}

export const NOTCHY_DEFAULTS: NotchyPrefs = {
  // "Always" is the recommendation: the handle is the only route to a decision
  // somebody has to make, and hiding it by default is how approvals get missed.
  visibility: "always",
  showTitle: true,
  showStatus: true,
  showDetail: true,
  showReviewers: true,
  showTimestamp: false,
  allowApprove: true,
  allowReject: true,
  surface: "glass",
  texture: "frost",
  shape: "pill",
  glow: "soft",
  density: "regular",
  motion: "spring",
  slot: "middle-right",
  hidden: false,
};

const KEY = "noska_notchy_prefs_v1";

type Listener = (prefs: NotchyPrefs) => void;
const listeners = new Set<Listener>();

let cached: NotchyPrefs | null = null;

/** Merges stored values over the defaults so new fields need no migration. */
function coerce(raw: unknown): NotchyPrefs {
  const v = (raw ?? {}) as Partial<NotchyPrefs>;
  return {
    ...NOTCHY_DEFAULTS,
    ...v,
    // Guard the enums: a hand-edited or stale value must not break rendering.
    visibility: ["permanent", "always", "needed"].includes(v.visibility as string)
      ? (v.visibility as NotchyVisibility)
      : NOTCHY_DEFAULTS.visibility,
    surface: ["glass", "solid", "matte", "outline"].includes(v.surface as string)
      ? (v.surface as NotchySurface)
      : NOTCHY_DEFAULTS.surface,
    density: v.density === "compact" ? "compact" : "regular",
    texture: ["none", "grain", "frost", "sheen"].includes(v.texture as string)
      ? (v.texture as NotchyTexture)
      : NOTCHY_DEFAULTS.texture,
    shape: ["pill", "rounded", "square"].includes(v.shape as string)
      ? (v.shape as NotchyShape)
      : NOTCHY_DEFAULTS.shape,
    glow: ["none", "soft", "strong"].includes(v.glow as string)
      ? (v.glow as NotchyGlow)
      : NOTCHY_DEFAULTS.glow,
    motion: ["spring", "gentle", "off"].includes(v.motion as string)
      ? (v.motion as NotchyMotion)
      : NOTCHY_DEFAULTS.motion,
  };
}

export function getNotchyPrefs(): NotchyPrefs {
  if (cached) return cached;
  try {
    cached = coerce(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    // Storage can be unavailable (private browsing, sandboxed frames). The
    // handle must still work, so fall back to defaults rather than throwing.
    cached = NOTCHY_DEFAULTS;
  }
  return cached;
}

export function setNotchyPrefs(patch: Partial<NotchyPrefs>): NotchyPrefs {
  const next = coerce({ ...getNotchyPrefs(), ...patch });
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do — the preference still applies for this session.
  }
  listeners.forEach((fn) => fn(next));
  return next;
}

/** Subscribes to preference changes; returns an unsubscribe function. */
export function subscribeNotchyPrefs(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}



/**
 * Whether the handle should be on screen.
 *
 * `hasRequest` — this page has an approval gate at all, in any state.
 * `hasWork`   — somebody is waiting on *this* user to decide something.
 *
 * The three modes are genuinely different: "always" still retires itself on a
 * page with no approval request, and only "permanent" stays put on one.
 */
export function notchyShouldRender(
  visibility: NotchyVisibility,
  hasRequest: boolean,
  hasWork: boolean,
): boolean {
  if (visibility === "permanent") return true;
  if (visibility === "needed") return hasWork;
  return hasRequest;
}

export const NOTCHY_VISIBILITY_OPTIONS: Array<{ value: NotchyVisibility; label: string; hint: string }> = [
  {
    value: "always",
    label: "Always",
    hint: "Shown on any page that has an approval request, in any state.",
  },
  {
    value: "needed",
    label: "Only when needed",
    hint: "Hidden until the page is waiting on you to decide something.",
  },
  {
    value: "permanent",
    label: "Permanent",
    hint: "Always on screen, even on pages with no approval at all.",
  },
];

export const NOTCHY_SURFACE_OPTIONS: Array<{ value: NotchySurface; label: string; hint: string }> = [
  { value: "glass", label: "Glass", hint: "Frosted, picks up what is behind it." },
  { value: "solid", label: "Solid", hint: "Flat black, maximum contrast." },
  { value: "matte", label: "Matte", hint: "Soft black, low glare in dark rooms." },
  { value: "outline", label: "Outline", hint: "Transparent with a hairline edge." },
];

export const NOTCHY_MOTION_OPTIONS: Array<{ value: NotchyMotion; label: string; hint: string }> = [
  { value: "spring", label: "Spring", hint: "Snappy overshoot on every change." },
  { value: "gentle", label: "Gentle", hint: "Calm eases, no bounce." },
  { value: "off", label: "Off", hint: "Instant, respects reduced motion too." },
];

export const NOTCHY_TEXTURE_OPTIONS: Array<{ value: NotchyTexture; label: string; hint: string }> = [
  { value: "frost", label: "Frost", hint: "Frosted blur, the default." },
  { value: "grain", label: "Grain", hint: "Fine noise so the black is not flat." },
  { value: "sheen", label: "Sheen", hint: "A soft highlight sweeping the top." },
  { value: "none", label: "None", hint: "Clean fill, nothing layered." },
];

export const NOTCHY_SHAPE_OPTIONS: Array<{ value: NotchyShape; label: string; hint: string }> = [
  { value: "pill", label: "Pill", hint: "Fully rounded ends." },
  { value: "rounded", label: "Rounded", hint: "Soft corners, flat-ish edges." },
  { value: "square", label: "Square", hint: "Sharp, machined look." },
];

export const NOTCHY_GLOW_OPTIONS: Array<{ value: NotchyGlow; label: string; hint: string }> = [
  { value: "none", label: "None", hint: "No halo at all." },
  { value: "soft", label: "Soft", hint: "A faint halo when work is pending." },
  { value: "strong", label: "Strong", hint: "Unmissable while work is pending." },
];