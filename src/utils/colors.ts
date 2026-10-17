export const TEXT_COLORS = [
  { name: "Default", value: "#ffffff" },
  { name: "Gray", value: "#9e9e9e" },
  { name: "Brown", value: "#a1887f" },
  { name: "Orange", value: "#ffa726" },
  { name: "Yellow", value: "#ffd54f" },
  { name: "Green", value: "#81c784" },
  { name: "Teal", value: "#4db6ac" },
  { name: "Blue", value: "#64b5f6" },
  { name: "Indigo", value: "#7986cb" },
  { name: "Purple", value: "#ba68c8" },
  { name: "Pink", value: "#f06292" },
  { name: "Red", value: "#e57373" },
  { name: "Coral", value: "#ef9a9a" },
  { name: "Rose", value: "#f48fb1" },
  { name: "Lime", value: "#d4e157" },
  { name: "Mint", value: "#aed581" },
  { name: "Sky", value: "#81d4fa" },
  { name: "Lavender", value: "#b39ddb" },
  { name: "Peach", value: "#ffcc80" },
  { name: "Charcoal", value: "#78909c" }
];

export const BG_COLORS = [
  { name: "None", value: "transparent" },
  { name: "Gray", value: "#616161" },
  { name: "Brown", value: "#5d4037" },
  { name: "Orange", value: "#ef6c00" },
  { name: "Yellow", value: "#fbc02d" },
  { name: "Green", value: "#388e3c" },
  { name: "Teal", value: "#00897b" },
  { name: "Blue", value: "#1976d2" },
  { name: "Indigo", value: "#303f9f" },
  { name: "Purple", value: "#7b1fa2" },
  { name: "Pink", value: "#c2185b" },
  { name: "Red", value: "#d32f2f" },
  { name: "Coral", value: "#c62828" },
  { name: "Rose", value: "#ad1457" },
  { name: "Lime", value: "#9e9d24" },
  { name: "Mint", value: "#558b2f" },
  { name: "Sky", value: "#0277bd" },
  { name: "Lavender", value: "#6a1b9a" },
  { name: "Peach", value: "#e65100" },
  { name: "Charcoal", value: "#455a64" }
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Resolve a stored block color to something valid CSS can paint.
 *
 * Why this exists: block colors used to be persisted as the palette *name*
 * (`"brown"`) while renderBlockEditor applies `block.color` directly as
 * `style={{ color }}`. `"brown"` is not a CSS color, so the browser discarded
 * the declaration and the menu silently did nothing.
 *
 * Names are still accepted, deliberately:
 *   - blocks already saved with a name keep working, and
 *   - the Background tab and the Text tab both have a "Brown", with different
 *     hexes, so the two resolvers are separate rather than one ambiguous map.
 *
 * Returns undefined for anything unrecognised rather than passing junk
 * through, so a bad value cannot inject an invalid declaration.
 */
export function resolveTextColor(input?: string | null): string | undefined {
  return resolve(input, TEXT_COLORS);
}

export function resolveBgColor(input?: string | null): string | undefined {
  return resolve(input, BG_COLORS);
}

function resolve(
  input: string | null | undefined,
  palette: { name: string; value: string }[]
): string | undefined {
  if (!input) return undefined;
  const v = String(input).trim();
  if (!v) return undefined;
  // Already a literal colour (hex from the custom picker, or a raw CSS value).
  if (HEX.test(v) || v === "transparent") return v;
const name = v.toLowerCase();
  // "None" means an explicitly transparent background, not "inherit".
  if (name === "none") return "transparent";
  const hit = palette.find((c) => c.name.toLowerCase() === name);
  // "Default" means "inherit the theme colour" - deliberately unresolved, so
  // the block keeps the theme's own foreground instead of being forced white.
  if (!hit || name === "default") return undefined;
  return hit.value;
}
