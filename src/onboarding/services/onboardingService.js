import { uid, now, textToBlocks } from "../../utils/helpers";

const STORAGE_KEY = "noska_onboarding";

export function saveOnboardingState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("onboardingService: failed to save state", e);
  }
}

export function loadOnboardingState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("onboardingService: failed to load state", e);
    return null;
  }
}

export function clearOnboardingState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

function basePage() {
  return {
    favorite: false,
    trashed: false,
    tags: [],
    parentId: null,
    lineage: [{ action: "created", timestamp: now(), detail: "Starter page from onboarding" }]
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

export function starterPageForTemplate(templateId) {
  const t = TEMPLATE_CONTENT[templateId] || TEMPLATE_CONTENT["getting-started"];
  return { ...basePage(), id: uid(), title: t.title, icon: t.icon, blocks: textToBlocks(t.blocks) };
}

export function createPageTree(starterPagesArray) {
  const root = { id: "root", children: [] };
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
export function previewPagesFor(form) {
  if (form.template) {
    const t = TEMPLATE_CONTENT[form.template] || TEMPLATE_CONTENT["getting-started"];
    return [{ title: t.title, icon: t.icon }];
  }
  return [{ title: "Getting Started", icon: "✦" }];
}
