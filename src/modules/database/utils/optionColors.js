// optionColors.js — deterministic, theme-aware colors for select/status/priority
// option values, matching Notion's colored-pill treatment. Colors are assigned
// stably from the option string so the same value always gets the same color.

const PALETTE = [
  { name: "gray",   dot: "#9b9a97", fill: "color-mix(in srgb, #9b9a97 20%, var(--surface))", text: "var(--text)" },
  { name: "brown",  dot: "#a1785a", fill: "color-mix(in srgb, #a1785a 20%, var(--surface))", text: "var(--text)" },
  { name: "orange", dot: "#f97316", fill: "color-mix(in srgb, #f97316 20%, var(--surface))", text: "var(--text)" },
  { name: "yellow", dot: "#eab308", fill: "color-mix(in srgb, #eab308 22%, var(--surface))", text: "var(--text)" },
  { name: "green",  dot: "#22c55e", fill: "color-mix(in srgb, #22c55e 20%, var(--surface))", text: "var(--text)" },
  { name: "blue",   dot: "#3b82f6", fill: "color-mix(in srgb, #3b82f6 20%, var(--surface))", text: "var(--text)" },
  { name: "purple", dot: "#a855f7", fill: "color-mix(in srgb, #a855f7 20%, var(--surface))", text: "var(--text)" },
  { name: "pink",   dot: "#ec4899", fill: "color-mix(in srgb, #ec4899 20%, var(--surface))", text: "var(--text)" },
  { name: "red",    dot: "#ef4444", fill: "color-mix(in srgb, #ef4444 20%, var(--surface))", text: "var(--text)" },
];

// Common status/priority words get intuitive fixed colors (like Notion).
const SEMANTIC = {
  "not started": "gray", "todo": "gray", "backlog": "gray", "none": "gray",
  "in progress": "blue", "doing": "blue", "active": "blue", "next": "blue",
  "done": "green", "completed": "green", "complete": "green", "closed won": "green", "published": "green",
  "blocked": "red", "urgent": "red", "critical": "red", "closed lost": "red",
  "high": "orange", "medium": "yellow", "low": "gray",
  "review": "purple", "planning": "purple", "on hold": "yellow",
};

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

export function colorForOption(value) {
  if (value == null || value === "") return PALETTE[0];
  const key = String(value).trim().toLowerCase();
  const semantic = SEMANTIC[key];
  if (semantic) return PALETTE.find((p) => p.name === semantic) || PALETTE[0];
  return PALETTE[hashString(key) % PALETTE.length];
}

export { PALETTE as OPTION_PALETTE };
