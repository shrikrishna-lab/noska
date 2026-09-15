export interface CoverItem {
  id: string;
  value: string;
  label: string;
  type: "gradient" | "solid" | "texture" | "photo" | "art";
  category?: string;
}

export const COVER_GRADIENTS: CoverItem[] = [
  // Classic Original Gradients
  { id: "classic-teal-gold", value: "linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)", label: "Classic Teal & Sand Dune", type: "gradient" },
  { id: "classic-monochrome", value: "linear-gradient(135deg,#262626,#737373,#d4d4d4)", label: "Classic Charcoal & Silver", type: "gradient" },
  { id: "classic-purple-warm", value: "linear-gradient(135deg,#7c3aed,#ec4899,#f59e0b)", label: "Classic Sunset Velvet", type: "gradient" },
  { id: "classic-ocean", value: "linear-gradient(135deg,#1d4ed8,#06b6d4,#84cc16)", label: "Classic Pacific Ocean Glow", type: "gradient" },
  { id: "classic-sunset", value: "linear-gradient(135deg,#dc2626,#f97316,#fbbf24)", label: "Classic Sahara Orange", type: "gradient" },
  { id: "classic-forest", value: "linear-gradient(135deg,#059669,#34d399,#a7f3d0)", label: "Classic Emerald Pine", type: "gradient" },
  { id: "classic-sky", value: "linear-gradient(135deg,#1e40af,#3b82f6,#93c5fd)", label: "Classic Alpine Sky Blue", type: "gradient" },
  { id: "classic-ember", value: "linear-gradient(135deg,#7c2d12,#c2410c,#fdba74)", label: "Classic Volcanic Ember", type: "gradient" },
  { id: "classic-slate", value: "linear-gradient(135deg,#374151,#6b7280,#9ca3af)", label: "Classic Slate Cloud Mineral", type: "gradient" },
  { id: "classic-berry", value: "linear-gradient(135deg,#831843,#ec4899,#fbcfe8)", label: "Classic Berry Rose & Pink", type: "gradient" },
  { id: "classic-cyan-breeze", value: "linear-gradient(135deg,#0c4a6e,#0ea5e9,#bae6fd)", label: "Classic Deep Cyan Breeze", type: "gradient" },
  { id: "classic-moss", value: "linear-gradient(135deg,#14532d,#22c55e,#bbf7d0)", label: "Classic Kyoto Moss Green", type: "gradient" },

  // New Luxury & Cyberpunk Gradient Presets
  { id: "sonoma-amber", value: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 40%, #ea580c 100%)", label: "Sonoma Amber Horizon", type: "gradient" },
  { id: "obsidian-gold", value: "linear-gradient(135deg, #18181b 0%, #27272a 40%, #b45309 100%)", label: "Obsidian & Smoked Gold", type: "gradient" },
  { id: "aurora-lights", value: "linear-gradient(135deg, #4338ca 0%, #06b6d4 50%, #10b981 100%)", label: "Arctic Aurora Lights", type: "gradient" },
  { id: "cosmic-nebula", value: "linear-gradient(135deg, #1e1b4b 0%, #7c3aed 50%, #c084fc 100%)", label: "Deep Cosmic Nebula", type: "gradient" },
  { id: "rose-gold", value: "linear-gradient(135deg, #be185d 0%, #f472b6 50%, #fde047 100%)", label: "Rose Quartz Gold", type: "gradient" },
  { id: "tokyo-rain", value: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)", label: "Tokyo Midnight Rain", type: "gradient" },
  { id: "cyber-cyan", value: "linear-gradient(135deg, #083344 0%, #0891b2 50%, #06b6d4 100%)", label: "Electric Cyber Cyan", type: "gradient" },
  { id: "matcha-mist", value: "linear-gradient(135deg, #14532d 0%, #22c55e 50%, #86efac 100%)", label: "Kyoto Matcha Mist", type: "gradient" },
  { id: "espresso-dusk", value: "linear-gradient(135deg, #261710 0%, #451a03 50%, #78350f 100%)", label: "Espresso & Roasted Crema", type: "gradient" },
  { id: "iridescent-mesh", value: "linear-gradient(135deg, #ff007f 0%, #7928ca 35%, #00dfd8 70%, #ff8000 100%)", label: "Iridescent Prismatic Mesh", type: "gradient" }
];

export const COVER_PHOTOS: CoverItem[] = [
  {
    id: "photo-minimal-arch",
    value: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
    label: "Minimalist Japandi Concrete & Sun",
    type: "photo"
  },
  {
    id: "photo-misty-mountains",
    value: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80",
    label: "Misty Alpine Peaks & Fog",
    type: "photo"
  },
  {
    id: "photo-tokyo-night",
    value: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=80",
    label: "Tokyo Shibuya Neon Rain",
    type: "photo"
  },
  {
    id: "photo-ocean-aerial",
    value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    label: "Turquoise Waves & White Sand",
    type: "photo"
  },
  {
    id: "photo-nordic-forest",
    value: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80",
    label: "Pine Forest Canopy at Dawn",
    type: "photo"
  },
  {
    id: "photo-desert-dunes",
    value: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80",
    label: "Golden Mojave Desert Dunes",
    type: "photo"
  },
  {
    id: "photo-cosmic-stars",
    value: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80",
    label: "Deep Space Stargazing Milky Way",
    type: "photo"
  },
  {
    id: "photo-architectural-curves",
    value: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1600&q=80",
    label: "Modern Architectural Glass Spiral",
    type: "photo"
  },
  {
    id: "photo-brutalist-museum",
    value: "https://images.unsplash.com/photo-1541888946425-d0fbb18f1563?auto=format&fit=crop&w=1600&q=80",
    label: "Geometric Brutalist Museum Light",
    type: "photo"
  },
  {
    id: "photo-acrylic-abstract",
    value: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1600&q=80",
    label: "Fluid Acrylic Marbling Flow",
    type: "photo"
  }
];

export const COVER_CYBER_ART: CoverItem[] = [
  {
    id: "cyber-neon-grid",
    value: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80",
    label: "Matrix Phosphor Binary Stream",
    type: "art"
  },
  {
    id: "cyber-synthwave-horizon",
    value: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1600&q=80",
    label: "Retro Synthwave Hardware Studio",
    type: "art"
  },
  {
    id: "cyber-quantum-void",
    value: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
    label: "Liquid Glass Fluid 3D Wave",
    type: "art"
  },
  {
    id: "cyber-holo-prism",
    value: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1600&q=80",
    label: "Holographic 3D Prismatic Geometry",
    type: "art"
  },
  {
    id: "cyber-ambient-dark",
    value: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80",
    label: "Minimal Dark Kinetic Silk Wave",
    type: "art"
  }
];

export const COVER_TEXTURES: CoverItem[] = [
  { id: "marble-carrara", value: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)", label: "Italian Carrara Marble", type: "texture" },
  { id: "obsidian-granite", value: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #0f172a 100%)", label: "Smoked Obsidian Granite", type: "texture" },
  { id: "gold-foil", value: "linear-gradient(135deg, #b45309 0%, #f59e0b 35%, #fde68a 70%, #d97706 100%)", label: "Hand-Hammered Gold Leaf", type: "texture" },
  { id: "brushed-titanium", value: "linear-gradient(135deg, #334155 0%, #64748b 50%, #475569 100%)", label: "Aerospace Brushed Titanium", type: "texture" },
  { id: "noise-light", value: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\"),#f8fafc", label: "Tactile Silk Grain Light", type: "texture" },
  { id: "noise-dark", value: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\"),#0f172a", label: "Tactile Velvet Grain Dark", type: "texture" },
  { id: "paper-fiber", value: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23paper)' opacity='0.03'/%3E%3C/svg%3E\"),#fcfbf7", label: "Artisan Cotton Paper", type: "texture" },
  { id: "blueprint-cad", value: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 40 0 L 0 0 0 40' fill='none' stroke='%233b82f6' stroke-opacity='0.15' stroke-width='1'/%3E%3C/svg%3E\"),#0b132b", label: "Architectural CAD Blueprint", type: "texture" },
  { id: "topo-contour", value: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 1440 320' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23000' fill-opacity='0.04' d='M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,186.7C960,213,1056,235,1152,218.7C1248,203,1344,149,1392,122.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'/%3E%3C/svg%3E\") center/cover no-repeat,#18181b", label: "Topographic Elevation Map", type: "texture" }
];

export const COVER_SOLIDS: CoverItem[] = [
  { id: "solid-white", value: "#ffffff", label: "Pure Porcelain White", type: "solid" },
  { id: "solid-oatmeal", value: "#f4ede4", label: "Warm Linen Sand", type: "solid" },
  { id: "solid-cream", value: "#faf6f0", label: "Artisan Cream Ivory", type: "solid" },
  { id: "solid-stone", value: "#78716c", label: "River Pebble Stone", type: "solid" },
  { id: "solid-charcoal", value: "#1e2024", label: "Velvet Charcoal", type: "solid" },
  { id: "solid-oled", value: "#000000", label: "Pitch Black OLED", type: "solid" },
  { id: "solid-navy", value: "#0f172a", label: "Midnight Deep Navy", type: "solid" },
  { id: "solid-terracotta", value: "#9a3412", label: "Tuscan Terracotta", type: "solid" },
  { id: "solid-sage", value: "#4d7c0f", label: "Kyoto Sage Green", type: "solid" },
  { id: "solid-slate", value: "#334155", label: "Nordic Slate Gray", type: "solid" },
  { id: "solid-rose", value: "#9d174d", label: "Dusty Velvet Rose", type: "solid" },
  { id: "solid-amber", value: "#b45309", label: "Smoked Amber Gold", type: "solid" }
];

export const COVER_CATEGORIES = [
  { id: "gradients", label: "Gradients", covers: COVER_GRADIENTS },
  { id: "photos", label: "Photography", covers: COVER_PHOTOS },
  { id: "art", label: "Cyber & Art", covers: COVER_CYBER_ART },
  { id: "textures", label: "Textures", covers: COVER_TEXTURES },
  { id: "solids", label: "Solid colors", covers: COVER_SOLIDS }
];

export function getAllCovers(): CoverItem[] {
  return [...COVER_GRADIENTS, ...COVER_PHOTOS, ...COVER_CYBER_ART, ...COVER_TEXTURES, ...COVER_SOLIDS];
}

export function getCoverById(id: string): CoverItem | undefined {
  return getAllCovers().find((c) => c.id === id);
}

