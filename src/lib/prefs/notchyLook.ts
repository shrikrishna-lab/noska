import type { NotchyPrefs, NotchySurface, NotchyTexture, NotchyShape, NotchyGlow } from "./notchy";

/**
 * Shared look-and-feel for the Notchy, used by both the live handle and the
 * Settings preview so what you pick is literally what you get. Kept in one
 * place because duplicating class strings between the two is how a preview
 * starts lying.
 */

export interface NotchyLook {
  card: string;
  icon: string;
  footer: string;
bar: string;
  /** Overlaid texture layer, applied absolutely inside the surface. */
  texture: string;
  /** Corner radius for the card. */
  cardRadius: string;
  /** Corner radius for the resting handle. */
  barRadius: string;
  /**
   * The same radius as a px value. The morph is animated with `layout`, which
   * scales the box rather than tweening the width, so the radius has to be
   * animated too — or the corners stay put while the pill stretches and it
   * stops reading as one continuous shape.
   */
  radiusPx: number;
}

const SURFACE: Record<NotchySurface, { card: string; icon: string; footer: string; bar: string }> = {
  glass: {
    card: "bg-black/65 shadow-[0_28px_70px_-18px_rgba(0,0,0,0.7)] ring-white/10",
    icon: "bg-white/10",
    footer: "bg-white/[0.03]",
    bar: "bg-black/60 ring-white/10",
  },
  solid: {
    card: "bg-black shadow-[0_28px_70px_-18px_rgba(0,0,0,0.8)] ring-white/12",
    icon: "bg-white/10",
    footer: "bg-white/[0.04]",
    bar: "bg-black ring-white/12",
  },
  matte: {
    card: "bg-[#1a1a1d] shadow-[0_22px_54px_-20px_rgba(0,0,0,0.55)] ring-white/[0.07]",
    icon: "bg-white/[0.09]",
    footer: "bg-white/[0.02]",
    bar: "bg-[#1a1a1d] ring-white/[0.07]",
  },
  outline: {
    card: "bg-black/30 shadow-[0_18px_46px_-20px_rgba(0,0,0,0.5)] ring-white/20",
    icon: "bg-white/[0.14]",
    footer: "bg-white/[0.04]",
    bar: "bg-black/30 ring-white/22",
  },
};

const TEXTURE: Record<NotchyTexture, string> = {
  // Fine fractal noise, drawn once as a repeating SVG so it costs nothing.
  grain:
    "bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.05'/></svg>\")] bg-[length:120px_120px]",
  frost:
    "backdrop-blur-2xl backdrop-saturate-150",
  sheen:
    "bg-gradient-to-b from-white/[0.10] via-transparent to-transparent",
  none: "",
};

const SHAPE: Record<NotchyShape, { card: string; bar: string; px: number }> = {
  pill: { card: "rounded-[26px]", bar: "rounded-[26px]", px: 26 },
  rounded: { card: "rounded-[18px]", bar: "rounded-[14px]", px: 14 },
  square: { card: "rounded-[8px]", bar: "rounded-[4px]", px: 4 },
};

export function notchGlow(glow: NotchyGlow, active: boolean): string {
  if (!active || glow === "none") return "";
  return glow === "strong"
    ? "shadow-[0_0_0_1px_rgba(255,196,87,0.35),0_10px_34px_-8px_rgba(245,158,11,0.55)]"
    : "shadow-[0_8px_26px_-10px_rgba(245,158,11,0.35)]";
}

export function notchyLook(prefs: NotchyPrefs): NotchyLook {
  const s = SURFACE[prefs.surface];
  const shape = SHAPE[prefs.shape];
  const texture = TEXTURE[prefs.texture];
  return {
    card: [s.card, shape.card, texture].filter(Boolean).join(" "),
    icon: s.icon,
    footer: s.footer,
    bar: [s.bar, texture].filter(Boolean).join(" "),
    texture,
    cardRadius: shape.card,
    barRadius: shape.bar,
    radiusPx: shape.px,
  };
}