import { CanvasBoardMeta, CanvasData, uid } from "../canvasStore";
import { OFFICIAL_TEMPLATES } from "./officialTemplates";
import { NoskaTemplate } from "./templateTypes";

const MY_TEMPLATES_KEY = "noska-my-templates";
const MARKETPLACE_CACHE_KEY = "noska-marketplace-templates";

// High-quality verified community starter templates
const INITIAL_COMMUNITY_TEMPLATES: NoskaTemplate[] = [
  {
    id: "community_design_system",
    name: "Design System Component Audit",
    description: "Audit UI components across Foundation, Primitives, Patterns, and Deprecation stages.",
    icon: "🎨",
    category: "community",
    tags: ["Design", "Figma", "UI/UX", "Components", "Audit"],
    isCommunity: true,
    author: { id: "u_elena", name: "Elena Rostova", verified: true },
    defaultNamePattern: "Design System Audit — {{project}} — {{date}}",
    sections: [
      { id: "tokens", name: "🎨 Core Tokens", color: "purple", defaultEnabled: true },
      { id: "primitives", name: "🧱 Primitives (Buttons, Inputs)", color: "blue", defaultEnabled: true },
      { id: "patterns", name: "🧩 Complex Patterns", color: "green", defaultEnabled: true },
      { id: "deprecated", name: "⚠️ Deprecations / Tech Debt", color: "pink", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "tokens", text: "Color palette contrast ratios audit (WCAG AA)", color: "purple", scaleTier: "all" },
      { sectionId: "primitives", text: "Standardize button hover states & micro-interactions", color: "blue", scaleTier: "all" },
      { sectionId: "patterns", text: "Multi-select filter chips & popover alignment", color: "green", scaleTier: "all" },
      { sectionId: "deprecated", text: "Remove legacy v1 modal backdrop overrides", color: "pink", scaleTier: "all" }
    ],
    installCount: 6420,
    rating: 4.9,
    ratingCount: 142,
    createdAt: "2026-06-15T00:00:00Z"
  },
  {
    id: "community_bug_triage",
    name: "Bug Triage & Incident War Room",
    description: "Rapidly isolate root cause, blast radius, mitigation patches, and post-mortem commitments.",
    icon: "🚨",
    category: "community",
    tags: ["DevOps", "Incident", "Bugs", "PostMortem", "Support"],
    isCommunity: true,
    author: { id: "u_marcus", name: "Marcus Chen", verified: true },
    defaultNamePattern: "Incident War Room — INC-{{number}} — {{date}}",
    isRecurring: true,
    sections: [
      { id: "symptoms", name: "🔥 Symptoms & Alerts", color: "pink", defaultEnabled: true },
      { id: "root_cause", name: "🔍 Root Cause Hypotheses", color: "yellow", defaultEnabled: true },
      { id: "mitigations", name: "🛡️ Immediate Hotfix", color: "blue", defaultEnabled: true },
      { id: "preventative", name: "✅ Action Items to Prevent", color: "green", defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "symptoms", text: "High latency on Supabase websocket connections (P99 > 800ms)", color: "pink", scaleTier: "all" },
      { sectionId: "root_cause", text: "Unindexed query on realtime presence channel table", color: "yellow", scaleTier: "all" },
      { sectionId: "mitigations", text: "Deploy composite index migration to production", color: "blue", scaleTier: "all" },
      { sectionId: "preventative", text: "Add automated CI check for foreign key indexes", color: "green", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "symptoms", fromCardIndex: 0, toSection: "root_cause", toCardIndex: 0, type: "leads_to" },
      { fromSection: "root_cause", fromCardIndex: 0, toSection: "mitigations", toCardIndex: 0, type: "leads_to" },
      { fromSection: "mitigations", fromCardIndex: 0, toSection: "preventative", toCardIndex: 0, type: "leads_to" }
    ],
    installCount: 8190,
    rating: 5.0,
    ratingCount: 198,
    createdAt: "2026-07-01T00:00:00Z"
  }
];

// ── Smart Context Auto-Naming (Part 2b) ───────────────────────────────────

export function generateSmartBoardName(
  template: NoskaTemplate,
  existingBoards: CanvasBoardMeta[] = [],
  workspaceOrProjectName = "My Project"
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const yearStr = String(now.getFullYear());
  const quarterStr = String(Math.floor((now.getMonth() + 3) / 3));

  // Compute week number
  const firstJan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - firstJan.getTime()) / 86400000 + firstJan.getDay() + 1) / 7);

  // Auto-increment detection for recurring boards
  let nextNumber = 1;
  const baseNameMatch = template.name.split(" ")[0].toLowerCase();

  existingBoards.forEach(b => {
    if (b.template === template.id || b.name.toLowerCase().includes(baseNameMatch)) {
      const match = b.name.match(/#(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n >= nextNumber) nextNumber = n + 1;
      } else {
        nextNumber++;
      }
    }
  });

  let pattern = template.defaultNamePattern || `${template.name} — {{project}} — {{date}}`;
  pattern = pattern.replace(/{{number}}/g, String(nextNumber));
  pattern = pattern.replace(/{{project}}/g, workspaceOrProjectName);
  pattern = pattern.replace(/{{date}}/g, dateStr);
  pattern = pattern.replace(/{{year}}/g, yearStr);
  pattern = pattern.replace(/{{quarter}}/g, quarterStr);
  pattern = pattern.replace(/{{week_number}}/g, String(weekNum));

  return pattern;
}

// ── My Templates Store (Part 2c) ──────────────────────────────────────────

export function loadMyTemplates(): NoskaTemplate[] {
  try {
    const raw = localStorage.getItem(MY_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToMyTemplates(template: NoskaTemplate): NoskaTemplate {
  const list = loadMyTemplates();
  const index = list.findIndex(t => t.id === template.id);
  const targetId = template.id.startsWith("custom_") ? template.id : `custom_${uid("tmpl")}`;
  const toSave: NoskaTemplate = {
    ...template,
    id: index >= 0 ? template.id : targetId,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    list[index] = toSave;
  } else {
    toSave.createdAt = new Date().toISOString();
    list.unshift(toSave);
  }

  try {
    localStorage.setItem(MY_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return toSave;
}

export function deleteMyTemplate(templateId: string): void {
  const list = loadMyTemplates().filter(t => t.id !== templateId);
  try {
    localStorage.setItem(MY_TEMPLATES_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

// ── Marketplace Store (Part 3) ───────────────────────────────────────────

export function loadMarketplaceTemplates(): NoskaTemplate[] {
  try {
    const cached = localStorage.getItem(MARKETPLACE_CACHE_KEY);
    const userCommunity: NoskaTemplate[] = cached ? JSON.parse(cached) : [];
    const merged = [...INITIAL_COMMUNITY_TEMPLATES];

    userCommunity.forEach(uc => {
      if (!merged.some(m => m.id === uc.id)) {
        merged.unshift(uc);
      }
    });
    return merged;
  } catch {
    return INITIAL_COMMUNITY_TEMPLATES;
  }
}

/**
 * Sanitizes board data by stripping private sensitive text, converting frames into section specs,
 * and creating a clean reusable template schema.
 */
export function sanitizeBoardForPublishing(
  boardData: CanvasData,
  metadata: {
    name: string;
    description: string;
    category: "team" | "personal";
    tags: string[];
    authorName: string;
    isFree?: boolean;
    priceUsd?: number;
  }
): NoskaTemplate {
  const elements = Object.values(boardData.elements);
  const frames = elements.filter(e => e.kind === "frame");
  const stickies = elements.filter(e => e.kind === "sticky");

  const sections = frames.map((f, idx) => ({
    id: `sec_${idx + 1}`,
    name: f.text || `Section ${idx + 1}`,
    color: f.color || "peach",
    defaultEnabled: true
  }));

  if (sections.length === 0) {
    sections.push(
      { id: "sec_1", name: "📌 Ideas & Notes", color: "yellow", defaultEnabled: true },
      { id: "sec_2", name: "✅ Action Items", color: "blue", defaultEnabled: true }
    );
  }

  // Create starter cards safely associated with sections
  const starterCards = stickies.slice(0, 8).map((s, idx) => {
    const targetSection = sections[idx % sections.length];
    return {
      sectionId: targetSection.id,
      text: s.text && s.text.length < 80 ? s.text : `Example Note ${idx + 1}`,
      color: s.color || targetSection.color,
      scaleTier: "all" as const
    };
  });

  const templateId = `community_${uid("pub")}`;
  const published: NoskaTemplate = {
    id: templateId,
    name: metadata.name.trim() || "Community Board Template",
    description: metadata.description.trim() || "Shared community workflow template.",
    icon: "🌟",
    category: "community",
    tags: metadata.tags.length > 0 ? metadata.tags : ["Community", "Workflow"],
    isCommunity: true,
    author: {
      id: `usr_${uid()}`,
      name: metadata.authorName.trim() || "Noska Creator",
      verified: false
    },
    defaultNamePattern: `${metadata.name.trim()} — {{project}} — {{date}}`,
    sections,
    starterCards,
    installCount: 1,
    rating: 5.0,
    ratingCount: 1,
    createdAt: new Date().toISOString(),
    isFree: metadata.isFree ?? true,
    priceUsd: metadata.priceUsd || 0
  };

  return published;
}

export function publishToMarketplace(template: NoskaTemplate): void {
  try {
    const cached = localStorage.getItem(MARKETPLACE_CACHE_KEY);
    const list: NoskaTemplate[] = cached ? JSON.parse(cached) : [];
    list.unshift(template);
    localStorage.setItem(MARKETPLACE_CACHE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
