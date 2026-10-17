import React from "react";

export type PageTexturePreset =
  | "tone-grain"
  | "paper-fiber"
  | "canvas-weave"
  | "mesh-dots"
  | "architectural-grid"
  | "topographic"
  | "clean";

export interface PageTextureDefinition {
  id: PageTexturePreset;
  name: string;
  description: string;
  preview: string;
}

// ─── SVG TEXTURE DATA URIs (Stitched, seamless, lightweight) ───

// 1. Fine Micro Grain tone-matched to page color
const SVG_GRAIN_LIGHT = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.06  0 0 0 0 0.12  0 0 0 0 0.22  0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`;
const SVG_GRAIN_DARK = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.045 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`;

// 2. Artisan Cotton Paper Fiber
const SVG_PAPER_LIGHT = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.08  0 0 0 0 0.14  0 0 0 0 0.2  0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`;
const SVG_PAPER_DARK = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.038 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`;

export const PAGE_TEXTURE_DEFINITIONS: PageTextureDefinition[] = [
  {
    id: "tone-grain",
    name: "Tone-Matched Micro Grain",
    description: "Ultra-fine tactile physical grain matching the exact hue and luminosity of the page color",
    preview: "radial-gradient(circle at 50% 50%, rgba(120,140,160,0.18) 1px, transparent 1px)"
  },
  {
    id: "paper-fiber",
    name: "Artisan Cotton Paper",
    description: "Organic handmade cotton paper fibers with warm tactile depth and natural stationery texture",
    preview: "repeating-radial-gradient(circle at 20% 30%, rgba(120,140,160,0.12) 0px, transparent 3px)"
  },
  {
    id: "canvas-weave",
    name: "Woven Linen Canvas",
    description: "Refined architectural textile cross-weave texture tone-matched to page surface",
    preview: "repeating-linear-gradient(0deg, rgba(120,140,160,0.12) 0, rgba(120,140,160,0.12) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(120,140,160,0.12) 0, rgba(120,140,160,0.12) 1px, transparent 1px, transparent 4px)"
  },
  {
    id: "mesh-dots",
    name: "Harmonic Micro-Dots",
    description: "Precision engineered geometric 16px dot matrix array styled to complement page color",
    preview: "radial-gradient(circle, rgba(120,140,160,0.25) 1px, transparent 1px)"
  },
  {
    id: "architectural-grid",
    name: "Architectural Drafting Grid",
    description: "Fine technical millimeter drafting guidelines gently harmonized with page background",
    preview: "linear-gradient(rgba(120,140,160,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(120,140,160,0.18) 1px, transparent 1px)"
  },
  {
    id: "topographic",
    name: "Topographic Elevation",
    description: "Organic contour elevation lines flowing naturally across the page canvas",
    preview: "radial-gradient(ellipse at center, transparent 30%, rgba(120,140,160,0.18) 31%, transparent 32%, rgba(120,140,160,0.18) 55%, transparent 56%)"
  },
  {
    id: "clean",
    name: "Pure Smooth Glass",
    description: "Flawless minimal surface with zero physical grain or texture overlay",
    preview: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 100%)"
  }
];

/**
 * Generates the CSS properties for the page texture overlay layer.
 * Dynamically adjusts color tints, opacities, and blend modes to ensure
 * the texture is always "similar to page color".
 */
export function getPageTextureOverlayStyle(
  texture: string | null | undefined,
  isDark: boolean,
  pageBg?: string | null
): React.CSSProperties | null {
  // If explicitly set to "clean" or "none", render no texture
  if (texture === "clean" || texture === "none") {
    return null;
  }

  // Default to tone-grain if not explicitly set
  const activeTexture = (texture as PageTexturePreset) || "tone-grain";

  // Check if custom page background has specific warmth or tone
  const isWarmPaper = pageBg && (pageBg.includes("#FAF7F2") || pageBg.includes("#fdfbf7") || pageBg.includes("Sepia") || pageBg.includes("#241c12"));

  switch (activeTexture) {
    case "tone-grain":
      return {
        backgroundImage: isDark ? SVG_GRAIN_DARK : (isWarmPaper ? SVG_PAPER_LIGHT : SVG_GRAIN_LIGHT),
        backgroundSize: "180px 180px",
        backgroundRepeat: "repeat",
        mixBlendMode: isDark ? "overlay" : "multiply",
        opacity: isDark ? 0.9 : 0.85
      };

    case "paper-fiber":
      return {
        backgroundImage: isDark ? SVG_PAPER_DARK : SVG_PAPER_LIGHT,
        backgroundSize: "120px 120px",
        backgroundRepeat: "repeat",
        mixBlendMode: isDark ? "overlay" : "multiply",
        opacity: isDark ? 0.85 : 0.8
      };

    case "canvas-weave":
      return {
        backgroundImage: isDark
          ? `repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 1px, transparent 1px, transparent 4px)`
          : `repeating-linear-gradient(0deg, rgba(20, 60, 100, 0.025) 0px, rgba(20, 60, 100, 0.025) 1px, transparent 1px, transparent 4px), repeating-linear-gradient(90deg, rgba(20, 60, 100, 0.025) 0px, rgba(20, 60, 100, 0.025) 1px, transparent 1px, transparent 4px)`,
        backgroundSize: "8px 8px",
        backgroundRepeat: "repeat",
        mixBlendMode: isDark ? "screen" : "multiply",
        opacity: isDark ? 0.85 : 0.8
      };

    case "mesh-dots":
      return {
        backgroundImage: isDark
          ? `radial-gradient(circle, rgba(227, 207, 179, 0.07) 1px, transparent 1px)`
          : `radial-gradient(circle, rgba(0, 102, 255, 0.08) 1px, transparent 1px)`,
        backgroundSize: "16px 16px",
        backgroundRepeat: "repeat",
        mixBlendMode: isDark ? "screen" : "multiply",
        opacity: 0.9
      };

    case "architectural-grid":
      return {
        backgroundImage: isDark
          ? `linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px)`
          : `linear-gradient(rgba(0, 102, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 102, 255, 0.05) 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
        backgroundRepeat: "repeat",
        mixBlendMode: isDark ? "screen" : "multiply",
        opacity: 0.85
      };

    case "topographic":
      return {
        backgroundImage: isDark
          ? `radial-gradient(ellipse at center, transparent 35%, rgba(227, 207, 179, 0.05) 36%, transparent 37%, rgba(227, 207, 179, 0.05) 65%, transparent 66%)`
          : `radial-gradient(ellipse at center, transparent 35%, rgba(0, 102, 255, 0.04) 36%, transparent 37%, rgba(0, 102, 255, 0.04) 65%, transparent 66%)`,
        backgroundSize: "44px 44px",
        backgroundRepeat: "repeat",
        mixBlendMode: isDark ? "screen" : "multiply",
        opacity: 0.9
      };

    default:
      return null;
  }
}
