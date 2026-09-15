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
  // Cyber & Futuristic OLED Themes
  | "cyberpunk-neon"
  | "tokyo-night"
  | "matrix-terminal"
  | "dracula-vampire"
  | "synthwave-sunset"
  | "oled-pure-black"
  // Artisan & Botanical Nature Themes
  | "kyoto-bamboo"
  | "terracotta-sun"
  | "nordic-pine"
  | "espresso-crema"
  | "parchment-archive"
  // Apple Glass & Aerospace Themes
  | "mac-sonoma"
  | "frost-titanium"
  | "cosmic-aurora"
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
  | "aurora-dust"
  | "holographic-foil"
  | "brushed-titanium"
  | "topo-contour"
  | "dot-matrix-glow"
  | "woven-linen"
  | "blueprint-grid";

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
  },

  // ─── CYBER & FUTURISTIC OLED THEMES ───
  {
    id: "cyberpunk-neon",
    name: "Cyberpunk Neon & Chrome",
    type: "gradient",
    description: "Electric cyan and hyper-magenta glow on deep pitch cyber black",
    bgLight: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 50%, #fdf2f8 100%)",
    bgDark: "linear-gradient(135deg, #090a12 0%, #0d111d 50%, #11091a 100%)",
    accent: "#06B6D4",
    borderLight: "rgba(6, 182, 212, 0.3)",
    borderDark: "rgba(6, 182, 212, 0.35)",
    previewGradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #ec4899 100%)"
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night Indigo",
    type: "gradient",
    description: "Atmospheric Shibuya midnight rain with vibrant neon indigo & violet",
    bgLight: "linear-gradient(135deg, #f3f4fd 0%, #e7eafc 50%, #fbf8ff 100%)",
    bgDark: "linear-gradient(135deg, #101222 0%, #16182e 50%, #131221 100%)",
    accent: "#7AA2F7",
    borderLight: "rgba(122, 162, 247, 0.25)",
    borderDark: "rgba(122, 162, 247, 0.3)",
    previewGradient: "linear-gradient(135deg, #1a1b26 0%, #24283b 50%, #7aa2f7 100%)"
  },
  {
    id: "matrix-terminal",
    name: "Matrix Phosphor Terminal",
    type: "gradient",
    description: "Classic retro cyberpunk green terminal glow with pure obsidian contrast",
    bgLight: "linear-gradient(135deg, #f2fbf4 0%, #e4f6e9 50%, #ffffff 100%)",
    bgDark: "linear-gradient(135deg, #070e09 0%, #0c160f 50%, #050805 100%)",
    accent: "#10B981",
    borderLight: "rgba(16, 185, 129, 0.25)",
    borderDark: "rgba(16, 185, 129, 0.3)",
    previewGradient: "linear-gradient(135deg, #050505 0%, #064e3b 50%, #10b981 100%)"
  },
  {
    id: "dracula-vampire",
    name: "Dracula Twilight",
    type: "gradient",
    description: "Legendary dark slate purple with luminous pink & cyan accents",
    bgLight: "linear-gradient(135deg, #f7f4fb 0%, #eee8f8 50%, #faf8fd 100%)",
    bgDark: "linear-gradient(135deg, #181724 0%, #211f33 50%, #151420 100%)",
    accent: "#BD93F9",
    borderLight: "rgba(189, 147, 249, 0.25)",
    borderDark: "rgba(189, 147, 249, 0.3)",
    previewGradient: "linear-gradient(135deg, #282a36 0%, #44475a 50%, #bd93f9 100%)"
  },
  {
    id: "synthwave-sunset",
    name: "Synthwave Sunset 1984",
    type: "gradient",
    description: "Vibrant retro wave sunset with neon tangerine and purple horizon",
    bgLight: "linear-gradient(135deg, #fff7ed 0%, #fef2f2 50%, #faf5ff 100%)",
    bgDark: "linear-gradient(135deg, #1b0f1d 0%, #241427 50%, #130a17 100%)",
    accent: "#F97316",
    borderLight: "rgba(249, 115, 22, 0.25)",
    borderDark: "rgba(249, 115, 22, 0.3)",
    previewGradient: "linear-gradient(135deg, #ff007f 0%, #7928ca 50%, #ff8000 100%)"
  },
  {
    id: "oled-pure-black",
    name: "OLED Pitch Stealth",
    type: "solid",
    description: "100% True Black OLED display mode with hyper-crisp metallic micro-borders",
    bgLight: "#F8F9FA",
    bgDark: "#000000",
    accent: "#E2E8F0",
    borderLight: "rgba(0, 0, 0, 0.1)",
    borderDark: "rgba(255, 255, 255, 0.14)",
    previewGradient: "#000000"
  },

  // ─── ARTISAN & BOTANICAL NATURE THEMES ───
  {
    id: "kyoto-bamboo",
    name: "Kyoto Bamboo & Moss",
    type: "gradient",
    description: "Serene Japanese bamboo forest and mineral moss stone tranquility",
    bgLight: "linear-gradient(135deg, #f2f7f2 0%, #e5ede5 50%, #f9fcf9 100%)",
    bgDark: "linear-gradient(135deg, #111a13 0%, #17241a 50%, #0d140e 100%)",
    accent: "#22C55E",
    borderLight: "rgba(34, 197, 94, 0.22)",
    borderDark: "rgba(34, 197, 94, 0.25)",
    previewGradient: "linear-gradient(135deg, #22c55e 0%, #15803d 50%, #14532d 100%)"
  },
  {
    id: "terracotta-sun",
    name: "Mediterranean Terracotta",
    type: "gradient",
    description: "Sunbaked Italian clay tiles, warm amber pottery, and golden olive oil aura",
    bgLight: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fefce8 100%)",
    bgDark: "linear-gradient(135deg, #241610 0%, #2f1d15 50%, #1a100c 100%)",
    accent: "#EA580C",
    borderLight: "rgba(234, 88, 12, 0.22)",
    borderDark: "rgba(234, 88, 12, 0.28)",
    previewGradient: "linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)"
  },
  {
    id: "nordic-pine",
    name: "Nordic Evergreen Pine",
    type: "gradient",
    description: "Crisp Scandinavian pine needles and alpine frost with deep cedar tones",
    bgLight: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #f8fafc 100%)",
    bgDark: "linear-gradient(135deg, #0d1b14 0%, #13241b 50%, #0a140f 100%)",
    accent: "#16A34A",
    borderLight: "rgba(22, 163, 74, 0.22)",
    borderDark: "rgba(22, 163, 74, 0.25)",
    previewGradient: "linear-gradient(135deg, #14532d 0%, #166534 50%, #22c55e 100%)"
  },
  {
    id: "espresso-crema",
    name: "Espresso & Roasted Crema",
    type: "gradient",
    description: "Rich dark roasted coffee beans with velvety caramel crema undertones",
    bgLight: "linear-gradient(135deg, #faf6f0 0%, #f0e6d6 50%, #fcf9f5 100%)",
    bgDark: "linear-gradient(135deg, #1e1510 0%, #281c15 50%, #150f0b 100%)",
    accent: "#B45309",
    borderLight: "rgba(180, 83, 9, 0.22)",
    borderDark: "rgba(180, 83, 9, 0.28)",
    previewGradient: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)"
  },
  {
    id: "parchment-archive",
    name: "Oxford Parchment & Gold",
    type: "gradient",
    description: "Historic library manuscript with antique parchment and hand-hammered gold",
    bgLight: "linear-gradient(135deg, #fcf9ee 0%, #f3ecd6 50%, #fefcf5 100%)",
    bgDark: "linear-gradient(135deg, #1c1810 0%, #262016 50%, #14110b 100%)",
    accent: "#D97706",
    borderLight: "rgba(217, 119, 6, 0.25)",
    borderDark: "rgba(217, 119, 6, 0.3)",
    previewGradient: "linear-gradient(135deg, #78350f 0%, #d97706 50%, #fde68a 100%)"
  },

  // ─── APPLE GLASS & AEROSPACE THEMES ───
  {
    id: "mac-sonoma",
    name: "Sonoma Amber Horizon",
    type: "gradient",
    description: "California golden hour horizon with warm ambient blur and glass refraction",
    bgLight: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fefce8 100%)",
    bgDark: "linear-gradient(135deg, #1e1910 0%, #292215 50%, #17130b 100%)",
    accent: "#F59E0B",
    borderLight: "rgba(245, 158, 11, 0.25)",
    borderDark: "rgba(245, 158, 11, 0.3)",
    previewGradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fef08a 100%)"
  },
  {
    id: "frost-titanium",
    name: "Aerospace Titanium",
    type: "gradient",
    description: "Natural grade 5 titanium brushed texture with frosted optical clarity",
    bgLight: "linear-gradient(135deg, #f8fafc 0%, #edf2f7 50%, #ffffff 100%)",
    bgDark: "linear-gradient(135deg, #14161b 0%, #1a1d24 50%, #101216 100%)",
    accent: "#94A3B8",
    borderLight: "rgba(148, 163, 184, 0.25)",
    borderDark: "rgba(148, 163, 184, 0.28)",
    previewGradient: "linear-gradient(135deg, #334155 0%, #64748b 50%, #cbd5e1 100%)"
  },
  {
    id: "cosmic-aurora",
    name: "Cosmic Aurora Borealis",
    type: "gradient",
    description: "Mystical northern polar magnetic lights in iridescent emerald and cyan",
    bgLight: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #f0fdf4 100%)",
    bgDark: "linear-gradient(135deg, #091a18 0%, #0e2724 50%, #061210 100%)",
    accent: "#14B8A6",
    borderLight: "rgba(20, 184, 166, 0.25)",
    borderDark: "rgba(20, 184, 166, 0.3)",
    previewGradient: "linear-gradient(135deg, #0f766e 0%, #06b6d4 50%, #10b981 100%)"
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
  },
  {
    id: "holographic-foil",
    name: "Holographic Prismatic Foil",
    description: "Iridescent prismatic angle-shifting rainbow shimmer",
    preview: "linear-gradient(135deg, rgba(255,0,128,0.2) 0%, rgba(0,255,255,0.2) 50%, rgba(255,215,0,0.2) 100%)"
  },
  {
    id: "brushed-titanium",
    name: "Brushed Grade-5 Titanium",
    description: "Precision aerospace horizontal micro-grain directional finish",
    preview: "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px)"
  },
  {
    id: "topo-contour",
    name: "Topographic Elevation",
    description: "Elegant organic contour map elevation curves and terrain linework",
    preview: "radial-gradient(ellipse at center, transparent 30%, rgba(120,120,120,0.12) 31%, transparent 32%, rgba(120,120,120,0.12) 55%, transparent 56%)"
  },
  {
    id: "dot-matrix-glow",
    name: "Cyber Dot Matrix Glow",
    description: "Sci-fi phosphorescent matrix coordinates with glowing focal points",
    preview: "radial-gradient(circle at 50% 50%, rgba(6,182,212,0.35) 1px, transparent 1px)"
  },
  {
    id: "woven-linen",
    name: "Woven Belgian Linen",
    description: "Warm architectural textile weave with natural acoustic feel",
    preview: "repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 4px)"
  },
  {
    id: "blueprint-grid",
    name: "Blueprint Drafting Grid",
    description: "Technical CAD drafting grid with fine millimeter guidelines",
    preview: "linear-gradient(rgba(59,130,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)"
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
    case "holographic-foil":
      return {
        backgroundImage: `linear-gradient(135deg, rgba(255, 0, 128, 0.08) 0%, rgba(0, 229, 255, 0.08) 35%, rgba(255, 215, 0, 0.08) 70%, rgba(147, 51, 234, 0.08) 100%)`,
        backgroundSize: "100% 100%",
        opacity: 0.85
      };
    case "brushed-titanium":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0px, rgba(255, 255, 255, 0.04) 1px, transparent 1px, transparent 2px)`,
        backgroundSize: "100% 2px",
        opacity: 0.75
      };
    case "topo-contour":
      return {
        backgroundImage: `radial-gradient(ellipse at center, transparent 35%, rgba(140, 140, 140, 0.08) 36%, transparent 37%, rgba(140, 140, 140, 0.08) 65%, transparent 66%)`,
        backgroundSize: "32px 32px",
        opacity: 0.8
      };
    case "dot-matrix-glow":
      return {
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.25) 1px, transparent 1px)`,
        backgroundSize: "8px 8px",
        opacity: 0.85
      };
    case "woven-linen":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.025) 0, rgba(0, 0, 0, 0.025) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 4px)`,
        backgroundSize: "4px 4px",
        opacity: 0.9
      };
    case "blueprint-grid":
      return {
        backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
        opacity: 0.85
      };
    case "clean":
    default:
      return {};
  }
}

export interface SidebarLayoutTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  previewGradient: string;
  accent: string;
  config: Partial<SidebarCustomizationConfig>;
}

export const SIDEBAR_LAYOUT_TEMPLATES: SidebarLayoutTemplate[] = [
  {
    id: "minimal-focus",
    name: "Minimalist Focus",
    tagline: "Distraction-free zen document editor",
    description: "Compact density with only document trees and recents visible. Clean and lightweight.",
    previewGradient: "linear-gradient(135deg, #f7f6f2 0%, #ebe7df 100%)",
    accent: "#706c64",
    config: {
      themePreset: "cashmere-silk",
      density: "compact",
      radius: "squircle",
      texture: "paper-fiber",
      blur: "soft",
      specularBezel: false,
      glowEffect: false,
      accentColor: "#706c64",
      showQuickNav: false,
      showSearch: false,
      showUserInfoCard: false,
      showNewCreationButton: true,
      newCreationColor: "monochrome",
      sectionOrder: ["privateDocs", "recents", "support"],
      sectionVisibility: {
        workspace: false,
        company: false,
        favorites: true,
        recents: true,
        privateDocs: true,
        teams: false,
        sharedSpace: false,
        intelligence: false,
        marketplace: false,
        tools: false,
        support: true
      }
    }
  },
  {
    id: "power-workspace",
    name: "Power Workspace",
    tagline: "All-in-one supercharged command center",
    description: "Full liquid glass body, specular bezel, quick navigation capsule, and all intelligence tools active.",
    previewGradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)",
    accent: "#C8A97E",
    config: {
      themePreset: "liquid-glass",
      density: "standard",
      radius: "apple-curved",
      texture: "linear-specular",
      blur: "ultra",
      specularBezel: true,
      glowEffect: true,
      accentColor: "#C8A97E",
      showQuickNav: true,
      quickTabs: { home: true, aiSpace: true, meetings: true, library: true, inbox: true },
      showSearch: true,
      showUserInfoCard: true,
      showNewCreationButton: true,
      newCreationColor: "amber-gold",
      sectionOrder: ["workspace", "favorites", "recents", "privateDocs", "intelligence", "tools", "company", "teams", "sharedSpace", "marketplace", "support"],
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
      }
    }
  },
  {
    id: "developer-terminal",
    name: "Developer Cyberpunk",
    tagline: "High-contrast neon phosphor terminal",
    description: "Vibrant neon cyan, sharp corners, dot matrix glow texture, and developer tools prioritized.",
    previewGradient: "linear-gradient(135deg, #090a12 0%, #0d111d 50%, #06b6d4 100%)",
    accent: "#06B6D4",
    config: {
      themePreset: "cyberpunk-neon",
      density: "ultra-compact",
      radius: "sharp",
      texture: "dot-matrix-glow",
      blur: "none",
      specularBezel: true,
      glowEffect: true,
      accentColor: "#06B6D4",
      showQuickNav: true,
      quickTabs: { home: true, aiSpace: true, meetings: false, library: true, inbox: true },
      showSearch: true,
      showUserInfoCard: true,
      showNewCreationButton: true,
      newCreationColor: "cyber-cyan",
      sectionOrder: ["intelligence", "tools", "privateDocs", "workspace", "recents", "marketplace", "support"],
      sectionVisibility: {
        workspace: true,
        company: false,
        favorites: true,
        recents: true,
        privateDocs: true,
        teams: false,
        sharedSpace: false,
        intelligence: true,
        marketplace: true,
        tools: true,
        support: true
      }
    }
  },
  {
    id: "executive-studio",
    name: "Executive Studio",
    tagline: "Luxury cashmere parchment & boardroom hub",
    description: "Warm ivory and velvet charcoal tones, subtle grain, and structured organizational hierarchy.",
    previewGradient: "linear-gradient(135deg, #FAF7F2 0%, #EFEBE4 50%, #D5B584 100%)",
    accent: "#B48C5E",
    config: {
      themePreset: "cashmere-silk",
      density: "standard",
      radius: "apple-curved",
      texture: "subtle-grain",
      blur: "deep",
      specularBezel: true,
      glowEffect: false,
      accentColor: "#B48C5E",
      showQuickNav: true,
      quickTabs: { home: true, aiSpace: true, meetings: true, library: true, inbox: true },
      showSearch: true,
      showUserInfoCard: true,
      showNewCreationButton: true,
      newCreationColor: "amber-gold",
      sectionOrder: ["company", "workspace", "favorites", "privateDocs", "teams", "sharedSpace", "recents", "support"],
      sectionVisibility: {
        workspace: true,
        company: true,
        favorites: true,
        recents: true,
        privateDocs: true,
        teams: true,
        sharedSpace: true,
        intelligence: true,
        marketplace: false,
        tools: true,
        support: true
      }
    }
  },
  {
    id: "artisan-botanical",
    name: "Artisan Botanical",
    tagline: "Kyoto bamboo forest & woven linen warmth",
    description: "Relaxing nature green gradients, woven linen texture, and comfortable spacious row density.",
    previewGradient: "linear-gradient(135deg, #f2f7f2 0%, #e5ede5 50%, #22c55e 100%)",
    accent: "#22C55E",
    config: {
      themePreset: "kyoto-bamboo",
      density: "spacious",
      radius: "squircle",
      texture: "woven-linen",
      blur: "soft",
      specularBezel: false,
      glowEffect: false,
      accentColor: "#22C55E",
      showQuickNav: true,
      quickTabs: { home: true, aiSpace: false, meetings: true, library: true, inbox: false },
      showSearch: true,
      showUserInfoCard: false,
      showNewCreationButton: true,
      newCreationColor: "sage-olive",
      sectionOrder: ["privateDocs", "workspace", "favorites", "recents", "tools", "support"],
      sectionVisibility: {
        workspace: true,
        company: false,
        favorites: true,
        recents: true,
        privateDocs: true,
        teams: false,
        sharedSpace: false,
        intelligence: false,
        marketplace: true,
        tools: true,
        support: true
      }
    }
  },
  {
    id: "oled-stealth",
    name: "Pure OLED Stealth",
    tagline: "0% pure black OLED with brushed titanium",
    description: "Battery-saving true black mode with brushed aerospace titanium micro-texture and ultra-compact rows.",
    previewGradient: "linear-gradient(135deg, #000000 0%, #111111 50%, #222222 100%)",
    accent: "#E2E8F0",
    config: {
      themePreset: "oled-pure-black",
      density: "ultra-compact",
      radius: "sharp",
      texture: "brushed-titanium",
      blur: "none",
      specularBezel: true,
      glowEffect: false,
      accentColor: "#E2E8F0",
      showQuickNav: true,
      quickTabs: { home: true, aiSpace: true, meetings: false, library: false, inbox: true },
      showSearch: true,
      showUserInfoCard: true,
      showNewCreationButton: true,
      newCreationColor: "monochrome",
      sectionOrder: ["privateDocs", "favorites", "intelligence", "recents", "tools", "support"],
      sectionVisibility: {
        workspace: true,
        company: false,
        favorites: true,
        recents: true,
        privateDocs: true,
        teams: false,
        sharedSpace: false,
        intelligence: true,
        marketplace: false,
        tools: true,
        support: true
      }
    }
  }
];

export function getFullTemplateConfig(template: SidebarLayoutTemplate): SidebarCustomizationConfig {
  const themePresetDef = SIDEBAR_THEME_PRESETS.find((p) => p.id === template.config.themePreset);
  const themeDefaults = themePresetDef
    ? {
        customBgLight: themePresetDef.bgLight,
        customBgDark: themePresetDef.bgDark,
        customBorderLight: themePresetDef.borderLight,
        customBorderDark: themePresetDef.borderDark,
        accentColor: template.accent || themePresetDef.accent
      }
    : {};

  return {
    ...DEFAULT_SIDEBAR_CUSTOMIZATION,
    ...themeDefaults,
    ...template.config,
    quickTabs: { ...DEFAULT_SIDEBAR_CUSTOMIZATION.quickTabs, ...(template.config.quickTabs || {}) },
    sectionVisibility: { ...DEFAULT_SIDEBAR_CUSTOMIZATION.sectionVisibility, ...(template.config.sectionVisibility || {}) },
    itemVisibility: { ...DEFAULT_SIDEBAR_CUSTOMIZATION.itemVisibility, ...(template.config.itemVisibility || {}) }
  };
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
      let themeOverrides: Partial<SidebarCustomizationConfig> = {};
      if (patch.themePreset && patch.themePreset !== prev.themePreset && !patch.customBgDark && !patch.customBgLight) {
        const themePresetDef = SIDEBAR_THEME_PRESETS.find((p) => p.id === patch.themePreset);
        if (themePresetDef) {
          themeOverrides = {
            customBgLight: themePresetDef.bgLight,
            customBgDark: themePresetDef.bgDark,
            customBorderLight: themePresetDef.borderLight,
            customBorderDark: themePresetDef.borderDark,
            accentColor: patch.accentColor || themePresetDef.accent
          };
        }
      }
      const updated = { ...prev, ...themeOverrides, ...patch };
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

