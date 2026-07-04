import { uid, now, textToBlocks } from "../../utils/helpers";

const STORAGE_KEY = "noska_onboarding";

const useCaseOptions = [
  { id: "student", label: "Student", icon: "🎓", desc: "Notes, assignments, study plans" },
  { id: "developer", label: "Developer", icon: "💻", desc: "Sprints, docs, project tracking" },
  { id: "founder", label: "Founder", icon: "🚀", desc: "Business plans, pitches, roadmaps" },
  { id: "writer", label: "Writer", icon: "✍️", desc: "Drafts, research, editorial calendars" },
  { id: "team", label: "Team", icon: "🤝", desc: "Wikis, meetings, dashboards" },
  { id: "personal", label: "Personal Knowledge", icon: "🧠", desc: "Notes, highlights, journaling" }
];

export function getUseCaseOptions() {
  return useCaseOptions;
}

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

export function starterPagesFor(useCase) {
  const u = uid;
  const b = basePage();
  const sets = {
    student: [
      { ...b, id: u(), title: "Study Notes", icon: "📖", blocks: textToBlocks("# Study Notes\n\nCentral hub for all your course materials.\n\n## Current Courses\n\n- \n\n## Exam Schedule\n\n- [ ] Midterm — \n- [ ] Final — \n\n## Study Resources\n\n") },
      { ...b, id: u(), title: "Assignment Tracker", icon: "✅", blocks: textToBlocks("# Assignment Tracker\n\n## Upcoming\n\n- [ ] \n- [ ] \n- [ ] \n\n## Completed\n\n") },
      { ...b, id: u(), title: "Course Schedule", icon: "📅", blocks: textToBlocks("# Course Schedule\n\n## Weekly Schedule\n\n| Time | Monday | Tuesday | Wednesday | Thursday | Friday |\n|------|--------|---------|-----------|----------|--------|\n|      |        |         |           |          |        |\n\n## Important Dates\n\n") }
    ],
    developer: [
      { ...b, id: u(), title: "Project Plan", icon: "📋", blocks: textToBlocks("# Project Plan\n\n## Goals\n\n- \n- \n- \n\n## Milestones\n\n- [ ] \n- [ ] \n- [ ] \n\n## Tech Stack\n\n") },
      { ...b, id: u(), title: "Sprint Backlog", icon: "🎯", blocks: textToBlocks("# Sprint Backlog\n\n## To Do\n\n- [ ] \n- [ ] \n\n## In Progress\n\n- [ ] \n\n## Done\n\n- [x] \n") },
      { ...b, id: u(), title: "API Reference", icon: "🔌", blocks: textToBlocks("# API Reference\n\n## Endpoints\n\n### GET /\n\n### POST /\n\n### PUT /\n\n## Authentication\n\n## Error Codes\n\n") }
    ],
    founder: [
      { ...b, id: u(), title: "Business Plan", icon: "📈", blocks: textToBlocks("# Business Plan\n\n## Executive Summary\n\n## Problem\n\n## Solution\n\n## Market Size\n\n## Business Model\n\n## Team\n\n") },
      { ...b, id: u(), title: "Meeting Notes", icon: "📝", blocks: textToBlocks("# Meeting Notes\n\n## Attendees\n\n## Agenda\n\n1. \n2. \n3. \n\n## Notes\n\n## Action Items\n\n- [ ] \n- [ ] \n") },
      { ...b, id: u(), title: "Product Roadmap", icon: "🗺️", blocks: textToBlocks("# Product Roadmap\n\n## Q1\n\n- [ ] \n- [ ] \n\n## Q2\n\n- [ ] \n- [ ] \n\n## Future\n\n") }
    ],
    writer: [
      { ...b, id: u(), title: "Draft Ideas", icon: "✏️", blocks: textToBlocks("# Draft Ideas\n\n## Active Projects\n\n### \n\n## Ideas\n\n- \n- \n- \n\n## Notes & Inspiration\n\n") },
      { ...b, id: u(), title: "Research Notes", icon: "🔍", blocks: textToBlocks("# Research Notes\n\n## Sources\n\n- \n- \n\n## Key Findings\n\n## Questions\n\n- [ ] \n- [ ] \n") },
      { ...b, id: u(), title: "Editorial Calendar", icon: "📆", blocks: textToBlocks("# Editorial Calendar\n\n## This Week\n\n- [ ] \n- [ ] \n\n## Next Week\n\n- [ ] \n- [ ] \n\n## Pitches\n\n") }
    ],
    team: [
      { ...b, id: u(), title: "Team Wiki", icon: "📚", blocks: textToBlocks("# Team Wiki\n\n## About Us\n\n## Team Members\n\n- \n- \n\n## Processes\n\n### \n\n## Guidelines\n\n") },
      { ...b, id: u(), title: "Meeting Notes", icon: "📝", blocks: textToBlocks("# Meeting Notes\n\n## Date\n\n## Attendees\n\n## Agenda\n\n1. \n2. \n\n## Decisions\n\n## Action Items\n\n- [ ] @ \n- [ ] @ \n") },
      { ...b, id: u(), title: "Project Dashboard", icon: "📊", blocks: textToBlocks("# Project Dashboard\n\n## Active Projects\n\n### \n\nStatus: \nOwner: \n\n## Health\n\n- Velocity: \n- Blockers: \n") }
    ],
    personal: [
      { ...b, id: u(), title: "Quick Notes", icon: "📓", blocks: textToBlocks("# Quick Notes\n\nCapture anything that comes to mind.\n\n## Today\n\n- \n- \n\n## Ideas\n\n") },
      { ...b, id: u(), title: "Book Highlights", icon: "📕", blocks: textToBlocks("# Book Highlights\n\n## Currently Reading\n\n### \n\n## Key Takeaways\n\n- \n- \n- \n\n## Quotes\n\n> \n") },
      { ...b, id: u(), title: "Journal", icon: "📔", blocks: textToBlocks("# Journal\n\n## \n\n") }
    ]
  };
  return sets[useCase] || sets.personal;
}

export function starterPageForTemplate(templateId) {
  const templates = {
    "project": { title: "Project Plan", icon: "📋", blocks: "# Project Plan\n\n## Goals\n\n## Milestones\n\n## Timeline\n\n## Resources\n\n" },
    "meeting": { title: "Meeting Notes", icon: "📝", blocks: "# Meeting Notes\n\n## Attendees\n\n## Agenda\n\n## Notes\n\n## Action Items\n\n" },
    "study": { title: "Study Notes", icon: "📖", blocks: "# Study Notes\n\n## Topic\n\n## Key Concepts\n\n## Summary\n\n" },
    "journal": { title: "Journal Entry", icon: "📔", blocks: "# Journal\n\n## \n\n" },
    "roadmap": { title: "Product Roadmap", icon: "🗺️", blocks: "# Product Roadmap\n\n## Q1\n\n## Q2\n\n## Q3\n\n## Q4\n\n" },
    "sprint": { title: "Sprint Backlog", icon: "🎯", blocks: "# Sprint Backlog\n\n## To Do\n\n## In Progress\n\n## Done\n\n" },
    "wiki": { title: "Team Wiki", icon: "📚", blocks: "# Team Wiki\n\n## About\n\n## Members\n\n## Processes\n\n" },
    "finance": { title: "Finance Tracker", icon: "💰", blocks: "# Finance Tracker\n\n## Income\n\n## Expenses\n\n## Budget\n\n" },
    "ideas": { title: "Idea Board", icon: "💡", blocks: "# Idea Board\n\n## Concepts\n\n- \n- \n- \n\n## Next Steps\n\n" },
    "notes": { title: "Quick Notes", icon: "📓", blocks: "# Quick Notes\n\n## \n\n" }
  };
  const t = templates[templateId] || templates.notes;
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
  if (form.useCase) {
    return starterPagesFor(form.useCase).map((p) => ({ title: p.title, icon: p.icon }));
  }
  const pages = [];
  if (form.pageTitle) {
    pages.push({ title: form.pageTitle, icon: "📄" });
  }
  if (form.template) {
    const templatePage = starterPageForTemplate(form.template);
    pages.push({ title: templatePage.title, icon: templatePage.icon });
  }
  if (pages.length === 0) {
    pages.push({ title: "Getting Started", icon: "🚀" });
  }
  return pages;
}
