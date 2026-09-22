import { uid, now, textToBlocks } from "../../utils/helpers";
import type { OnboardingFormData, OnboardingPagePreview } from "../types";

const STORAGE_KEY = "noska_onboarding";

// Persisted shape is whatever the reducer's state object looks like at
// save time (see OnboardingContext.tsx) — kept loose here since this
// service only round-trips it through localStorage/JSON without reading
// individual fields itself.
type PersistedOnboardingState = Record<string, unknown>;

export function saveOnboardingState(state: PersistedOnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("onboardingService: failed to save state", e);
  }
}

export function loadOnboardingState(): PersistedOnboardingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("onboardingService: failed to load state", e);
    return null;
  }
}

export function clearOnboardingState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

interface BasePageFields {
  favorite: false;
  trashed: false;
  tags: never[];
  parentId: null;
  createdAt: string;
  updatedAt: string;
  lineage: { action: string; timestamp: string; detail: string }[];
}

function basePage(): BasePageFields {
  // Real bug, fixed: this never set createdAt/updatedAt, so every
  // onboarding starter page (including the "Getting Started" default)
  // had no real timestamp. timeAgo() (src/utils/helpers.ts) fell back to
  // the Unix epoch for a missing value, showing "~20640d ago" on a page
  // that was created seconds earlier — visible to every new user
  // immediately after onboarding finishes.
  const timestamp = now();
  return {
    favorite: false,
    trashed: false,
    tags: [],
    parentId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    lineage: [{ action: "created", timestamp, detail: "Starter page from onboarding" }]
  };
}

// Starter content for each template offered in the "Start with a template"
// step. Ids match TEMPLATES in ../data.js.
const TEMPLATE_CONTENT = {
  "empty": { title: "Untitled", icon: "📄", blocks: "" },
  "getting-started": {
    title: "Getting Started",
    icon: "✦",
    blocks: "# Getting Started\n\nWelcome to Noska! Here are a few tips to get moving fast.\n\n- Type `/` anywhere to insert a block\n- Press `Ctrl+K` to open the command palette\n- Press `Ctrl+N` to create a new page\n\n## Next steps\n\n- [ ] Explore the sidebar\n- [ ] Create your first database\n- [ ] Invite a teammate\n"
  },
  "project": {
    title: "Project Tracker",
    icon: "📋",
    blocks: "# Project Tracker\n\n## Goals\n\n- \n- \n\n## Milestones\n\n- [ ] \n- [ ] \n- [ ] \n\n## Progress\n\n"
  },
  "notes": {
    title: "Meeting Notes",
    icon: "📝",
    blocks: "# Meeting Notes\n\n## Attendees\n\n## Agenda\n\n1. \n2. \n\n## Decisions\n\n## Action Items\n\n- [ ] \n- [ ] \n"
  },
  "wiki": {
    title: "Team Wiki",
    icon: "📚",
    blocks: "# Team Wiki\n\n## About\n\n## Team Members\n\n- \n- \n\n## Processes\n\n"
  },
  "roadmap": {
    title: "Product Roadmap",
    icon: "🗺️",
    blocks: "# Product Roadmap\n\n## Q1\n\n- [ ] \n\n## Q2\n\n- [ ] \n\n## Q3\n\n- [ ] \n\n## Q4\n\n- [ ] \n"
  }
};

export function starterPageForTemplate(templateId: string) {
  const t = TEMPLATE_CONTENT[templateId as keyof typeof TEMPLATE_CONTENT] || TEMPLATE_CONTENT["getting-started"];
  return { ...basePage(), id: uid(), title: t.title, icon: t.icon, blocks: textToBlocks(t.blocks) };
}

interface StarterPage {
  id: string;
  title: string;
  icon: string;
}

interface PageTreeNode {
  id: string;
  title?: string;
  icon?: string;
  children: PageTreeNode[];
}

export function createPageTree(starterPagesArray: StarterPage[]): PageTreeNode {
  const root: PageTreeNode = { id: "root", children: [] };
  for (const page of starterPagesArray) {
    root.children.push({ id: page.id, title: page.title, icon: page.icon, children: [] });
  }
  return root;
}

/**
 * Lightweight preview of what handleFinalize (src/App.jsx) will actually
 * create, so the live sidebar preview shown during onboarding never drifts
 * from the real result. Returns just { title, icon } pairs — cheap to
 * recompute on every keystroke/selection, no ids/blocks needed for display.
 */
export function previewPagesFor(form: OnboardingFormData): OnboardingPagePreview[] {
  const out: OnboardingPagePreview[] = [];
  if (form.template) {
    const t = TEMPLATE_CONTENT[form.template as keyof typeof TEMPLATE_CONTENT] || TEMPLATE_CONTENT["getting-started"];
    out.push({ title: t.title, icon: t.icon });
  } else {
    out.push({ title: "Getting Started", icon: "✦" });
  }
  // Pages staged in the "Bring your notes" import step show up live too.
  for (const p of form.importedPages || []) {
    if (p?.title) out.push({ title: p.title, icon: p.icon || "📝" });
  }
  return out;
}
