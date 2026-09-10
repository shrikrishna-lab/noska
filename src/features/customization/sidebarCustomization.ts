import { useState, useEffect, useCallback } from "react";

export type SidebarThemePreset =
  // Soft Luxury Gradients
  | "liquid-glass"
  | "cashmere-silk"
  | "oyster-pearl"
  | "matcha-mist"
  | "dusty-lavender"
  | "desert-dune"
  | "nordic-glacier"
  | "rose-quartz"
  | "sage-alabaster"
  | "velvet-obsidian"
  // Soft Smooth Solids
  | "solid-alabaster"
  | "solid-bisque"
  | "solid-oatmeal"
  | "solid-sage"
  | "solid-slate"
  | "solid-lavender"
  | "solid-clay"
  | "solid-basalt"
  | "solid-charcoal"
  | "custom";

export type SidebarRadiusPreset = "apple-curved" | "squircle" | "subtle" | "sharp";
export type SidebarBlurPreset = "none" | "soft" | "deep" | "ultra";
export type SidebarDensityPreset = "ultra-compact" | "compact" | "standard" | "spacious";
export type SidebarTexturePreset =
  | "clean"
  | "subtle-grain"
  | "mesh-dots"
  | "carbon-fiber"
  | "linear-specular"
  | "paper-fiber"
  | "aurora-dust";

export type SidebarSectionKey =
  | "workspace"
  | "company"
  | "favorites"
  | "recents"
  | "privateDocs"
  | "teams"
  | "sharedSpace"
  | "intelligence"
  | "marketplace"
  | "tools"
  | "support";

export interface SidebarSectionMeta {
  key: SidebarSectionKey;
  label: string;
  description: string;
  category: "Core" | "Organization" | "Content" | "AI & Tools" | "System";
  iconName?: string;
}

export const ALL_SIDEBAR_SECTIONS: SidebarSectionMeta[] = [
  { key: "workspace", label: "Workspace Hub", description: "Daily Journal, My Tasks, and Calendar schedule", category: "Core" },
  { key: "company", label: "Company Organization", description: "Company Switcher & Organization home space", category: "Organization" },
  { key: "favorites", label: "Starred Favorites", description: "Pinned documents & quick access bookmarks", category: "Content" },
  { key: "recents", label: "Recently Edited", description: "Recently opened & modified pages with timestamps", category: "Content" },
  { key: "privateDocs", label: "Private Documents", description: "Hierarchical page tree & doc creator", category: "Content" },
  { key: "teams", label: "Teams & Channels", description: "Team workspaces & member directory", category: "Organization" },
  { key: "sharedSpace", label: "Shared Space", description: "Collaborative team pages & shared hubs", category: "Organization" },
  { key: "intelligence", label: "AI Intelligence", description: "Autonomous agents, automations & meeting notes", category: "AI & Tools" },
  { key: "marketplace", label: "Marketplace", description: "Curated templates, creator studio & directory", category: "AI & Tools" },
  { key: "tools", label: "Power Tools", description: "Spaced repetition flashcards & developer API console", category: "AI & Tools" },
  { key: "support", label: "Support & Trash", description: "Help Center documentation and recycle bin", category: "System" }
];

export interface SidebarItemVisibility {
  // Workspace
  dailyJournal: boolean;
  myTasks: boolean;
  calendar: boolean;
  // Company
  companySwitcher: boolean;
  companyHome: boolean;
  // Teams
  teamSwitcher: boolean;
  // Shared
  collabHub: boolean;
  // Intelligence
  commandCenter: boolean;
  agents: boolean;
  automations: boolean;
  aiMeetingCapture: boolean;
  // Marketplace
  templates: boolean;
  creatorStudio: boolean;
  agentDirectory: boolean;
  // Tools
  spacedRepetition: boolean;
  apiConsole: boolean;
  // Support
  helpCenter: boolean;
  trash: boolean;
}

export interface SidebarCustomizationConfig {
  // 1. Theme & Aesthetic Styling
  themePreset: SidebarThemePreset;
  customBgLight: string;
  customBgDark: string;
  customBorderLight: string;
  customBorderDark: string;
  accentColor: string; // e.g. '#C8A97E'
  activePillColor: string;
  radius: SidebarRadiusPreset;
  blur: SidebarBlurPreset;
  density: SidebarDensityPreset;
  texture: SidebarTexturePreset;
  specularBezel: boolean;
  glowEffect: boolean;

  // 2. Quick Capsule Bar & Search
  showQuickNav: boolean;
  quickTabs: {
    home: boolean;
    aiSpace: boolean;
    meetings: boolean;
    library: boolean;
    inbox: boolean;
  };
  showSearch: boolean;

  // 3. Sections Order & Arrangement (Drag to place)
  sectionOrder: SidebarSectionKey[];
  sectionVisibility: Record<SidebarSectionKey, boolean>;

  // 4. Granular "What's Need" Item-level Visibility
  itemVisibility: SidebarItemVisibility;

  // 5. Bottom Controls & Cards
  showNewCreationButton: boolean;
  newCreationColor: "amber-gold" | "cyber-cyan" | "emerald-green" | "purple-radiant" | "monochrome" | "rose-clay" | "sage-olive" | "nordic-slate";
  showMoreButton: boolean;
  showUserInfoCard: boolean;
}

export const DEFAULT_SIDEBAR_CUSTOMIZATION: SidebarCustomizationConfig = {
  themePreset: "liquid-glass",
  customBgLight: "linear-gradient(135deg, rgba(246, 246, 250, 0.94) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(242, 243, 248, 0.94) 100%)",
  customBgDark: "linear-gradient(135deg, rgba(24, 25, 30, 0.94) 0%, rgba(19, 20, 24, 0.98) 50%, rgba(26, 27, 33, 0.94) 100%)",
  customBorderLight: "rgba(0, 0, 0, 0.08)",
  customBorderDark: "rgba(255, 255, 255, 0.12)",
  accentColor: "#C8A97E",
  activePillColor: "#ffffff",
  radius: "apple-curved",
  blur: "deep",
  density: "compact",
  texture: "clean",
  specularBezel: true,
  glowEffect: true,

  showQuickNav: true,
  quickTabs: {
    home: true,
    aiSpace: true,
    meetings: true,
    library: true,
    inbox: true
  },

  showSearch: true,

  sectionOrder: [
    "workspace",
    "company",
    "favorites",
    "recents",
    "privateDocs",
    "teams",
    "sharedSpace",
    "intelligence",
    "marketplace",
    "tools",
    "support"
  ],
  sectionVisibility: {
    workspace: true,
    company: true,
    favorites: true,
    recents: true,
    privateDocs: true,
    teams: true,
    sharedSpace: true,
    intelligence: true,
    marketplace: true,
    tools: true,
    support: true
  },

  itemVisibility: {
    dailyJournal: true,
    myTasks: true,
    calendar: true,
    companySwitcher: true,
    companyHome: true,
    teamSwitcher: true,
    collabHub: true,
    commandCenter: true,
    agents: true,
    automations: true,
    aiMeetingCapture: true,
    templates: true,
    creatorStudio: true,
    agentDirectory: true,
    spacedRepetition: true,
    apiConsole: true,
    helpCenter: true,
    trash: true
  },

  showNewCreationButton: true,
  newCreationColor: "amber-gold",
  showMoreButton: true,
  showUserInfoCard: true
};

export interface ThemePresetDefinition {
  id: SidebarThemePreset;
  name: string;
  type: "gradient" | "solid";
  description: string;
  bgLight: string;
  bgDark: string;
  accent: string;
  borderLight: string;
  borderDark: string;
  previewGradient: string;
}

export const SIDEBAR_THEME_PRESETS: ThemePresetDefinition[] = [
  // ─── SOFT LUXURY GRADIENTS (Smooth, soothing, subtle) ───
  {
    id: "liquid-glass",
    name: "Liquid Glass (Apple Original)",
    type: "gradient",
    description: "Specular translucent liquid glass with ambient luminosity and frosted blur",
    bgLight: "linear-gradient(135deg, rgba(246, 246, 250, 0.94) 0%, rgba(255, 255, 255, 0.98) 50%, rgba(242, 243, 248, 0.94) 100%)",
    bgDark: "linear-gradient(135deg, rgba(24, 25, 30, 0.94) 0%, rgba(19, 20, 24, 0.98) 50%, rgba(26, 27, 33, 0.94) 100%)",
    accent: "#C8A97E",
    borderLight: "rgba(0, 0, 0, 0.08)",
    borderDark: "rgba(255, 255, 255, 0.12)",
    previewGradient: "linear-gradient(135deg, #f3f4f8 0%, #e8edf5 50%, #ffffff 100%)"
  },
  {
    id: "cashmere-silk",
    name: "Cashmere & Oat Cream",
    type: "gradient",
    description: "Ultra-soft tactile cashmere warmth with creamy alabaster and gentle amber glow",
    bgLight: "linear-gradient(135deg, #fbf8f3 0%, #f4ede2 50%, #fdfcf9 100%)",
    bgDark: "linear-gradient(135deg, #1d1a16 0%, #24201a 50%, #181512 100%)",
    accent: "#C8A97E",
    borderLight: "rgba(200, 169, 126, 0.25)",
    borderDark: "rgba(200, 169, 126, 0.25)",
    previewGradient: "linear-gradient(135deg, #fdfbf7 0%, #f3ede2 50%, #e8ddcc 100%)"
  },
  {
    id: "oyster-pearl",
    name: "Oyster Pearl & Mist",
    type: "gradient",
    description: "Smooth iridescent silver pearl with clean frosted platinum highlights",
    bgLight: "linear-gradient(135deg, #f6f8fa 0%, #edf1f5 50%, #ffffff 100%)",
    bgDark: "linear-gradient(135deg, #16181d 0%, #1d2027 50%, #121418 100%)",
    accent: "#8C929E",
    borderLight: "rgba(0, 0, 0, 0.08)",
    borderDark: "rgba(255, 255, 255, 0.12)",
    previewGradient: "linear-gradient(135deg, #ffffff 0%, #edf1f7 50%, #dbe2ec 100%)"
  },
  {
    id: "matcha-mist",
    name: "Matcha Mist & Sage",
    type: "gradient",
    description: "Gentle herbal botanical jade and soothing organic green tea veil",
    bgLight: "linear-gradient(135deg, #f4f8f4 0%, #eaf2eb 50%, #fafdfa 100%)",
    bgDark: "linear-gradient(135deg, #141a15 0%, #1c261e 50%, #0f1410 100%)",
    accent: "#7A9A80",
    borderLight: "rgba(122, 154, 128, 0.22)",
    borderDark: "rgba(122, 154, 128, 0.25)",
    previewGradient: "linear-gradient(135deg, #f4f8f4 0%, #e1ebe2 50%, #cbdacf 100%)"
  },
  {
    id: "dusty-lavender",
    name: "Dusty Lavender Twilight",
    type: "gradient",
    description: "Subtle smoky heather and muted lilac crystal with calm evening undertones",
    bgLight: "linear-gradient(135deg, #f7f4f9 0%, #ede7f3 50%, #faf8fc 100%)",
    bgDark: "linear-gradient(135deg, #1a1622 0%, #241d2f 50%, #14111a 100%)",
    accent: "#9B86A8",
    borderLight: "rgba(155, 134, 168, 0.2)",
    borderDark: "rgba(155, 134, 168, 0.25)",
    previewGradient: "linear-gradient(135deg, #faf7fc 0%, #ece3f3 50%, #d8cde3 100%)"
  },
  {
    id: "desert-dune",
    name: "Desert Dune & Mojave",
    type: "gradient",
    description: "Warm desert sand, sunbaked terracotta, and soft neutral clay haze",
    bgLight: "linear-gradient(135deg, #f9f5ee 0%, #f1e9dc 50%, #fcfaf6 100%)",
    bgDark: "linear-gradient(135deg, #1e1b16 0%, #28231c 50%, #171410 100%)",
    accent: "#C2856E",
    borderLight: "rgba(194, 133, 110, 0.22)",
    borderDark: "rgba(194, 133, 110, 0.28)",
    previewGradient: "linear-gradient(135deg, #f9f4ed 0%, #ede1d1 50%, #dfcdb7 100%)"
  },
  {
    id: "nordic-glacier",
    name: "Nordic Glacier & Slate",
    type: "gradient",
    description: "Crisp Arctic glacial frost with soft slate blue and morning fog glass",
    bgLight: "linear-gradient(135deg, #f1f5f9 0%, #e4ecf4 50%, #f8fafc 100%)",
    bgDark: "linear-gradient(135deg, #13171f 0%, #1b222d 50%, #0f1217 100%)",
    accent: "#6B8BA4",
    borderLight: "rgba(107, 139, 164, 0.2)",
    borderDark: "rgba(107, 139, 164, 0.25)",
    previewGradient: "linear-gradient(135deg, #f1f6fa 0%, #dde8f2 50%, #c4d7e6 100%)"
  },
  {
    id: "rose-quartz",
    name: "Rose Quartz Suede",
    type: "gradient",
    description: "Delicate dusty rose blush blended with soft cashmere silk and warm ivory",
    bgLight: "linear-gradient(135deg, #faf4f4 0%, #f4e7e7 50%, #fdf9f9 100%)",
    bgDark: "linear-gradient(135deg, #201517 0%, #2b1b1e 50%, #180f11 100%)",
    accent: "#BA7E84",
    borderLight: "rgba(186, 126, 132, 0.2)",
    borderDark: "rgba(186, 126, 132, 0.25)",
    previewGradient: "linear-gradient(135deg, #faf3f3 0%, #f2e2e2 50%, #dfc8c8 100%)"
  },
  {
    id: "sage-alabaster",
    name: "Sage & Alabaster Stone",
    type: "gradient",
    description: "Quiet botanical limestone with muted gray-green accents and matte crystal",
    bgLight: "linear-gradient(135deg, #f4f6f4 0%, #e7ebe7 50%, #f9fbf9 100%)",
    bgDark: "linear-gradient(135deg, #151916 0%, #1d231e 50%, #101311 100%)",
    accent: "#7A9A80",
    borderLight: "rgba(122, 154, 128, 0.2)",
    borderDark: "rgba(122, 154, 128, 0.25)",
    previewGradient: "linear-gradient(135deg, #f4f7f4 0%, #e3eae3 50%, #ced9ce 100%)"
  },
  {
    id: "velvet-obsidian",
    name: "Velvet Obsidian (Matte Dark)",
    type: "gradient",
    description: "Ultra-clean stealth charcoal with low reflection and precision dark borders",
    bgLight: "linear-gradient(135deg, #f4f4f6 0%, #e8e8ed 100%)",
    bgDark: "linear-gradient(135deg, #121316 0%, #17191e 50%, #0d0e11 100%)",
    accent: "#71717a",
    borderLight: "rgba(0, 0, 0, 0.08)",
    borderDark: "rgba(255, 255, 255, 0.09)",
    previewGradient: "linear-gradient(135deg, #1f2229 0%, #131418 50%, #0a0b0d 100%)"
  },

  // ─── SOFT SMOOTH SOLIDS (Zero glare, clean flat luxury) ───
  {
    id: "solid-alabaster",
    name: "Alabaster White Stone",
    type: "solid",
    description: "Soothing pure chalk stone with organic warm white reflection",
    bgLight: "#F9F8F5",
    bgDark: "#181716",
    accent: "#C8A97E",
    borderLight: "#E8E5DD",
    borderDark: "#2C2A26",
    previewGradient: "#F9F8F5"
  },
  {
    id: "solid-bisque",
    name: "Warm Bisque Linen",
    type: "solid",
    description: "Comforting artisan wheat bisque and tactile parchment",
    bgLight: "#F5EFEB",
    bgDark: "#1C1916",
    accent: "#C2856E",
    borderLight: "#E6DED7",
    borderDark: "#302B24",
    previewGradient: "#F5EFEB"
  },
  {
    id: "solid-oatmeal",
    name: "Oatmeal Bone Cloth",
    type: "solid",
    description: "Warm architectural concrete and soft unbleached cotton",
    bgLight: "#EEEBE5",
    bgDark: "#191817",
    accent: "#8C7A6B",
    borderLight: "#DED8CE",
    borderDark: "#2B2926",
    previewGradient: "#EEEBE5"
  },
  {
    id: "solid-sage",
    name: "Earthy Sage Tint",
    type: "solid",
    description: "Soft muted botanical moss and calming Nordic pine undertone",
    bgLight: "#EBF1EC",
    bgDark: "#151B17",
    accent: "#7A9A80",
    borderLight: "#D7E3D9",
    borderDark: "#243027",
    previewGradient: "#EBF1EC"
  },
  {
    id: "solid-slate",
    name: "Muted Slate Blue",
    type: "solid",
    description: "Gentle overcast sky and architectural denim gray",
    bgLight: "#EDF1F6",
    bgDark: "#14181F",
    accent: "#6B8BA4",
    borderLight: "#D9E2ED",
    borderDark: "#242C38",
    previewGradient: "#EDF1F6"
  },
  {
    id: "solid-lavender",
    name: "Soft Lavender Dusk",
    type: "solid",
    description: "Muted lilac twilight with gentle soothing aura",
    bgLight: "#F3EEF7",
    bgDark: "#1B1622",
    accent: "#9B86A8",
    borderLight: "#E3D9EC",
    borderDark: "#2F253C",
    previewGradient: "#F3EEF7"
  },
  {
    id: "solid-clay",
    name: "Blush Clay Suede",
    type: "solid",
    description: "Soft terracotta rose petal and subtle warm clay",
    bgLight: "#F7EFEF",
    bgDark: "#201618",
    accent: "#BA7E84",
    borderLight: "#EBDBDB",
    borderDark: "#362428",
    previewGradient: "#F7EFEF"
  },
  {
    id: "solid-basalt",
    name: "Basalt Graphite Gray",
    type: "solid",
    description: "Sophisticated neutral industrial mineral matte surface",
    bgLight: "#E9E9EA",
    bgDark: "#131417",
    accent: "#5A5D64",
    borderLight: "#D4D4D6",
    borderDark: "#23252B",
    previewGradient: "#E9E9EA"
  },
  {
    id: "solid-charcoal",
    name: "Deep Velvet Smoke",
    type: "solid",
    description: "Ultra-dark velvety studio carbon with crisp micro contrast",
    bgLight: "#E1E2E5",
    bgDark: "#0F1013",
    accent: "#71717A",
    borderLight: "#CBCDD3",
    borderDark: "#1E2026",
    previewGradient: "#121316"
  }
];

export const SOFT_ACCENT_PALETTES = [
  { label: "Champagne Sand", value: "#C8A97E", desc: "Warm luxury gold" },
  { label: "Terracotta Clay", value: "#C2856E", desc: "Soothing desert earth" },
  { label: "Matcha Sage", value: "#7A9A80", desc: "Calming botanical green" },
  { label: "Nordic Slate", value: "#6B8BA4", desc: "Soft arctic slate blue" },
  { label: "Heather Lilac", value: "#9B86A8", desc: "Muted dusk lavender" },
  { label: "Rose Quartz", value: "#BA7E84", desc: "Gentle dusty rose" },
  { label: "Warm Umber", value: "#8C7A6B", desc: "Artisan linen brown" },
  { label: "Graphite Noir", value: "#5A5D64", desc: "Modern mineral gray" },
  { label: "Oyster Platinum", value: "#8C929E", desc: "Iridescent soft silver" },
  { label: "Desert Sun", value: "#D4B996", desc: "Warm Mojave dune" }
];

export const TEXTURE_DEFINITIONS: Array<{
  id: SidebarTexturePreset;
  name: string;
  description: string;
  preview: string;
}> = [
  {
    id: "clean",
    name: "Pure Silk Glass",
    description: "Flawless mirror-smooth surface with crystal refraction and zero grain",
    preview: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 100%)"
  },
  {
    id: "subtle-grain",
    name: "Tactile Micro-Grain",
    description: "Fine physical noise texture resembling frosted glass micro-etching",
    preview: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.06) 1px, transparent 1px)"
  },
  {
    id: "mesh-dots",
    name: "Micro Dot Matrix",
    description: "Precision engineered geometric micro-dot grid array with Apple aesthetics",
    preview: "radial-gradient(circle, rgba(140,140,140,0.18) 1px, transparent 1px)"
  },
  {
    id: "carbon-fiber",
    name: "Diagonal Twill Weave",
    description: "Subtle 45° diagonal micro-hatch weave texture for depth and structure",
    preview: "repeating-linear-gradient(45deg, rgba(0,0,0,0.04), rgba(0,0,0,0.04) 1.5px, transparent 1.5px, transparent 4px)"
  },
  {
    id: "linear-specular",
    name: "Linear Specular Sheen",
    description: "Vertical brushed titanium and light-catching crystal refraction bands",
    preview: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)"
  },
  {
    id: "paper-fiber",
    name: "Artisan Paper Fiber",
    description: "Organic handmade cotton paper fiber texture with warm tactile depth",
    preview: "repeating-radial-gradient(circle at 20% 30%, rgba(0,0,0,0.02) 0px, transparent 3px)"
  },
  {
    id: "aurora-dust",
    name: "Aurora Stardust",
    description: "Ambient micro stardust luminescence with subtle starry reflections",
    preview: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 1px, transparent 1px)"
  }
];

export function getTextureOverlayStyle(texture: SidebarTexturePreset): React.CSSProperties {
  switch (texture) {
    case "subtle-grain":
      return {
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(120, 120, 120, 0.08) 1px, transparent 1px)`,
        backgroundSize: "4px 4px",
        opacity: 0.85
      };
    case "mesh-dots":
      return {
        backgroundImage: `radial-gradient(circle, rgba(100, 100, 100, 0.12) 1px, transparent 1px)`,
        backgroundSize: "6px 6px",
        opacity: 0.75
      };
    case "carbon-fiber":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.035) 0, rgba(0, 0, 0, 0.035) 1.5px, transparent 1.5px, transparent 4px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.04) 0, rgba(255, 255, 255, 0.04) 1.5px, transparent 1.5px, transparent 4px)`,
        backgroundSize: "6px 6px",
        opacity: 0.9
      };
    case "linear-specular":
      return {
        backgroundImage: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.08) 25%, transparent 50%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)`,
        backgroundSize: "120px 100%",
        opacity: 0.65
      };
    case "paper-fiber":
      return {
        backgroundImage: `radial-gradient(circle at 10% 20%, rgba(0, 0, 0, 0.03) 0, transparent 2px), radial-gradient(circle at 80% 70%, rgba(0, 0, 0, 0.03) 0, transparent 2px)`,
        backgroundSize: "12px 12px",
        opacity: 0.8
      };
    case "aurora-dust":
      return {
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.25) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.18) 1px, transparent 1px)`,
        backgroundSize: "14px 14px",
        opacity: 0.9
      };
    case "clean":
    default:
      return {};
  }
}

const STORAGE_KEY = "noska_sidebar_customization_v3";
const EVENT_KEY = "noska:sidebar_customization_changed";

export function getSidebarCustomization(): SidebarCustomizationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SIDEBAR_CUSTOMIZATION;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SIDEBAR_CUSTOMIZATION,
      ...parsed,
      quickTabs: { ...DEFAULT_SIDEBAR_CUSTOMIZATION.quickTabs, ...(parsed.quickTabs || {}) },
      sectionVisibility: { ...DEFAULT_SIDEBAR_CUSTOMIZATION.sectionVisibility, ...(parsed.sectionVisibility || {}) },
      itemVisibility: { ...DEFAULT_SIDEBAR_CUSTOMIZATION.itemVisibility, ...(parsed.itemVisibility || {}) }
    };
  } catch {
    return DEFAULT_SIDEBAR_CUSTOMIZATION;
  }
}

export function setSidebarCustomization(config: SidebarCustomizationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: config }));
  } catch (e) {
    console.error("Failed to save sidebar customization", e);
  }
}

export function useSidebarCustomization() {
  const [config, setConfigState] = useState<SidebarCustomizationConfig>(() => getSidebarCustomization());

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SidebarCustomizationConfig>;
      if (customEvent.detail) {
        setConfigState(customEvent.detail);
      } else {
        setConfigState(getSidebarCustomization());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setConfigState(getSidebarCustomization());
      }
    };

    window.addEventListener(EVENT_KEY, handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(EVENT_KEY, handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateConfig = useCallback((patch: Partial<SidebarCustomizationConfig>) => {
    setConfigState((prev) => {
      const updated = { ...prev, ...patch };
      setSidebarCustomization(updated);
      return updated;
    });
  }, []);

  const resetToDefault = useCallback(() => {
    setSidebarCustomization(DEFAULT_SIDEBAR_CUSTOMIZATION);
    setConfigState(DEFAULT_SIDEBAR_CUSTOMIZATION);
  }, []);

  return { config, updateConfig, resetToDefault };
}
