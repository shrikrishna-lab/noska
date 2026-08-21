export interface ProfileCardGradient {
  id: string;
  label: string;
  category: GradientCategoryId;
  background: string;
  glow: string;
  accent: string;
}

export type GradientCategoryId = "glass" | "soft" | "vivid" | "deep";

export interface GradientCategory {
  id: GradientCategoryId;
  label: string;
  tagline: string;
}

export const GRADIENT_CATEGORIES: GradientCategory[] = [
  {
    id: "glass",
    label: "Glass",
    tagline: "White top fading into color — the signature card look.",
  },
  {
    id: "soft",
    label: "Soft",
    tagline: "Pastel, gentle blends for a calm feel.",
  },
  {
    id: "vivid",
    label: "Vivid",
    tagline: "Bold, saturated gradients that pop.",
  },
  {
    id: "deep",
    label: "Deep",
    tagline: "Rich, dark tones for a dramatic look.",
  },
];

const GLASS: ProfileCardGradient[] = [
  {
    id: "default",
    label: "Cyan Glass",
    category: "glass",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(243,250,252,0.92) 50%, rgba(203,242,250,0.88) 100%)",
    glow: "rgba(0,170,230,0.30)",
    accent: "#0284c7",
  },
  {
    id: "white-to-sky",
    label: "White Sky",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 45%, #bae6fd 100%)",
    glow: "rgba(14,165,233,0.30)",
    accent: "#0284c7",
  },
  {
    id: "white-to-blue",
    label: "White Blue",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #eff6ff 45%, #bfdbfe 100%)",
    glow: "rgba(59,130,246,0.32)",
    accent: "#2563eb",
  },
  {
    id: "white-to-indigo",
    label: "White Indigo",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #eef2ff 45%, #c7d2fe 100%)",
    glow: "rgba(99,102,241,0.32)",
    accent: "#4f46e5",
  },
  {
    id: "white-to-violet",
    label: "White Violet",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #f5f3ff 45%, #ddd6fe 100%)",
    glow: "rgba(139,92,246,0.30)",
    accent: "#7c3aed",
  },
  {
    id: "white-to-purple",
    label: "White Purple",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #faf5ff 45%, #e9d5ff 100%)",
    glow: "rgba(168,85,247,0.32)",
    accent: "#9333ea",
  },
  {
    id: "white-to-pink",
    label: "White Pink",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #fdf2f8 45%, #fbcfe8 100%)",
    glow: "rgba(236,72,153,0.30)",
    accent: "#db2777",
  },
  {
    id: "white-to-rose",
    label: "White Rose",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #fff1f2 45%, #fecdd3 100%)",
    glow: "rgba(244,63,94,0.30)",
    accent: "#e11d48",
  },
  {
    id: "white-to-orange",
    label: "White Orange",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #fff7ed 45%, #fed7aa 100%)",
    glow: "rgba(249,115,22,0.30)",
    accent: "#ea580c",
  },
  {
    id: "white-to-amber",
    label: "White Amber",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #fffbeb 45%, #fde68a 100%)",
    glow: "rgba(245,158,11,0.30)",
    accent: "#d97706",
  },
  {
    id: "white-to-green",
    label: "White Green",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #f0fdf4 45%, #bbf7d0 100%)",
    glow: "rgba(34,197,94,0.30)",
    accent: "#16a34a",
  },
  {
    id: "white-to-teal",
    label: "White Teal",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #f0fdfa 45%, #99f6e4 100%)",
    glow: "rgba(20,184,166,0.30)",
    accent: "#0d9488",
  },
  {
    id: "white-to-emerald",
    label: "White Emerald",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #ecfdf5 45%, #a7f3d0 100%)",
    glow: "rgba(16,185,129,0.30)",
    accent: "#059669",
  },
  {
    id: "white-to-cyan",
    label: "White Cyan",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #ecfeff 45%, #a5f3fc 100%)",
    glow: "rgba(6,182,212,0.30)",
    accent: "#0891b2",
  },
  {
    id: "white-to-fuchsia",
    label: "White Fuchsia",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #fdf4ff 45%, #fae8ff 100%)",
    glow: "rgba(217,70,239,0.30)",
    accent: "#c026d3",
  },
  {
    id: "white-to-red",
    label: "White Red",
    category: "glass",
    background: "linear-gradient(180deg, #ffffff 0%, #fef2f2 45%, #fecaca 100%)",
    glow: "rgba(239,68,68,0.30)",
    accent: "#dc2626",
  },
];

const SOFT: ProfileCardGradient[] = [
  {
    id: "ocean",
    label: "Ocean",
    category: "soft",
    background:
      "linear-gradient(160deg, #bae6fd 0%, #7dd3fc 45%, #38bdf8 100%)",
    glow: "rgba(56,189,248,0.35)",
    accent: "#0284c7",
  },
  {
    id: "lavender",
    label: "Lavender",
    category: "soft",
    background:
      "linear-gradient(160deg, #ede9fe 0%, #c4b5fd 45%, #8b5cf6 100%)",
    glow: "rgba(139,92,246,0.35)",
    accent: "#7c3aed",
  },
  {
    id: "rose",
    label: "Rose",
    category: "soft",
    background:
      "linear-gradient(160deg, #fce7f3 0%, #f9a8d4 45%, #ec4899 100%)",
    glow: "rgba(236,72,153,0.35)",
    accent: "#db2777",
  },
  {
    id: "mint",
    label: "Mint",
    category: "soft",
    background:
      "linear-gradient(160deg, #d1fae5 0%, #6ee7b7 45%, #10b981 100%)",
    glow: "rgba(16,185,129,0.35)",
    accent: "#059669",
  },
  {
    id: "peach",
    label: "Peach",
    category: "soft",
    background:
      "linear-gradient(160deg, #ffedd5 0%, #fed7aa 45%, #fb923c 100%)",
    glow: "rgba(251,146,60,0.30)",
    accent: "#c2410c",
  },
  {
    id: "slate",
    label: "Slate",
    category: "soft",
    background:
      "linear-gradient(160deg, #f1f5f9 0%, #cbd5e1 45%, #94a3b8 100%)",
    glow: "rgba(100,116,139,0.30)",
    accent: "#475569",
  },
  {
    id: "coral",
    label: "Coral",
    category: "soft",
    background:
      "linear-gradient(160deg, #ffe4e6 0%, #fda4af 45%, #fb7185 100%)",
    glow: "rgba(251,113,133,0.35)",
    accent: "#e11d48",
  },
  {
    id: "silver",
    label: "Silver",
    category: "soft",
    background:
      "linear-gradient(160deg, #f8fafc 0%, #e2e8f0 45%, #94a3b8 100%)",
    glow: "rgba(148,163,184,0.30)",
    accent: "#64748b",
  },
  {
    id: "bubblegum",
    label: "Bubblegum",
    category: "soft",
    background:
      "linear-gradient(160deg, #fce7f3 0%, #f9a8d4 45%, #fb7185 100%)",
    glow: "rgba(249,168,212,0.35)",
    accent: "#db2777",
  },
  {
    id: "lagoon",
    label: "Lagoon",
    category: "soft",
    background:
      "linear-gradient(160deg, #99f6e4 0%, #2dd4bf 45%, #0d9488 100%)",
    glow: "rgba(13,148,136,0.35)",
    accent: "#0f766e",
  },
  {
    id: "emerald-teal",
    label: "Emerald Teal",
    category: "soft",
    background:
      "linear-gradient(160deg, #d1fae5 0%, #34d399 45%, #14b8a6 100%)",
    glow: "rgba(20,184,166,0.35)",
    accent: "#0f766e",
  },
  {
    id: "sky-indigo",
    label: "Sky Indigo",
    category: "soft",
    background:
      "linear-gradient(160deg, #bae6fd 0%, #818cf8 45%, #6366f1 100%)",
    glow: "rgba(99,102,241,0.35)",
    accent: "#4f46e5",
  },
  {
    id: "pink-purple",
    label: "Pink Purple",
    category: "soft",
    background:
      "linear-gradient(160deg, #fbcfe8 0%, #c084fc 45%, #a855f7 100%)",
    glow: "rgba(168,85,247,0.35)",
    accent: "#9333ea",
  },
];

const VIVID: ProfileCardGradient[] = [
  {
    id: "sunset",
    label: "Sunset",
    category: "vivid",
    background:
      "linear-gradient(160deg, #fecaca 0%, #fdba74 45%, #f97316 100%)",
    glow: "rgba(249,115,22,0.35)",
    accent: "#ea580c",
  },
  {
    id: "aurora",
    label: "Aurora",
    category: "vivid",
    background:
      "linear-gradient(160deg, #67e8f9 0%, #818cf8 50%, #e879f9 100%)",
    glow: "rgba(129,140,248,0.35)",
    accent: "#6366f1",
  },
  {
    id: "gold",
    label: "Gold",
    category: "vivid",
    background:
      "linear-gradient(160deg, #fef3c7 0%, #fcd34d 45%, #f59e0b 100%)",
    glow: "rgba(245,158,11,0.35)",
    accent: "#d97706",
  },
  {
    id: "amber-red",
    label: "Amber Red",
    category: "vivid",
    background:
      "linear-gradient(160deg, #fde68a 0%, #fb923c 45%, #ef4444 100%)",
    glow: "rgba(239,68,68,0.35)",
    accent: "#dc2626",
  },
  {
    id: "neon",
    label: "Neon",
    category: "vivid",
    background:
      "linear-gradient(160deg, #a7f3d0 0%, #22d3ee 45%, #818cf8 100%)",
    glow: "rgba(34,211,238,0.35)",
    accent: "#0891b2",
  },
  {
    id: "berry",
    label: "Berry",
    category: "vivid",
    background:
      "linear-gradient(160deg, #fae8ff 0%, #f472b6 45%, #e11d48 100%)",
    glow: "rgba(225,29,72,0.35)",
    accent: "#be123c",
  },
  {
    id: "mango",
    label: "Mango",
    category: "vivid",
    background:
      "linear-gradient(160deg, #fef3c7 0%, #fbbf24 45%, #f97316 100%)",
    glow: "rgba(249,115,22,0.35)",
    accent: "#ea580c",
  },
];

const DEEP: ProfileCardGradient[] = [
  {
    id: "midnight",
    label: "Midnight",
    category: "deep",
    background:
      "linear-gradient(160deg, #334155 0%, #1e293b 50%, #0f172a 100%)",
    glow: "rgba(51,65,85,0.45)",
    accent: "#94a3b8",
  },
  {
    id: "ocean-deep",
    label: "Deep Ocean",
    category: "deep",
    background:
      "linear-gradient(160deg, #0ea5e9 0%, #2563eb 50%, #1e3a8a 100%)",
    glow: "rgba(30,58,138,0.45)",
    accent: "#93c5fd",
  },
  {
    id: "sunset-fire",
    label: "Fire Sunset",
    category: "deep",
    background:
      "linear-gradient(160deg, #f97316 0%, #ef4444 50%, #7f1d1d 100%)",
    glow: "rgba(127,29,29,0.45)",
    accent: "#fecaca",
  },
  {
    id: "forest",
    label: "Forest",
    category: "deep",
    background:
      "linear-gradient(160deg, #34d399 0%, #16a34a 50%, #14532d 100%)",
    glow: "rgba(20,83,45,0.45)",
    accent: "#bbf7d0",
  },
  {
    id: "royal",
    label: "Royal Purple",
    category: "deep",
    background:
      "linear-gradient(160deg, #a78bfa 0%, #7c3aed 50%, #4c1d95 100%)",
    glow: "rgba(76,29,149,0.45)",
    accent: "#ddd6fe",
  },
];

export const PROFILE_CARD_GRADIENTS: ProfileCardGradient[] = [
  ...GLASS,
  ...SOFT,
  ...VIVID,
  ...DEEP,
];

export const PROFILE_CARD_GRADIENTS_BY_CATEGORY: Array<{
  category: GradientCategory;
  items: ProfileCardGradient[];
}> = GRADIENT_CATEGORIES.map((category) => ({
  category,
  items: PROFILE_CARD_GRADIENTS.filter((g) => g.category === category.id),
}));

export const DEFAULT_PROFILE_CARD_GRADIENT_ID = "default";

export function getProfileCardGradient(): ProfileCardGradient {
  const saved = localStorage.getItem("noska_profile_card_gradient");
  const match = PROFILE_CARD_GRADIENTS.find((g) => g.id === saved);
  return match || PROFILE_CARD_GRADIENTS[0];
}

export function setProfileCardGradient(id: string): void {
  localStorage.setItem("noska_profile_card_gradient", id);
}