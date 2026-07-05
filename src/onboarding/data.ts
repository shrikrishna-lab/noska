// Static option lists for the onboarding flow — ported 1:1 from the final
// design (Noska Onboarding/src/app/App.tsx).

export const WORKSPACE_ICONS = ["🏢", "🚀", "⚡", "🎯", "💡", "🌿", "🔮", "🦋", "🏔️", "🌊", "🎨", "🦄"];

export const ROLES = [
  { id: "engineering", label: "Engineering" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "marketing", label: "Marketing" },
  { id: "operations", label: "Operations" },
  { id: "sales", label: "Sales" },
  { id: "finance", label: "Finance" },
  { id: "other", label: "Other" },
];

export const USE_CASES = [
  { id: "notes", label: "Taking notes", icon: "📝" },
  { id: "docs", label: "Writing docs", icon: "📄" },
  { id: "projects", label: "Managing projects", icon: "📊" },
  { id: "wiki", label: "Building a wiki", icon: "📚" },
  { id: "crm", label: "Tracking leads", icon: "🤝" },
  { id: "roadmap", label: "Planning a roadmap", icon: "🗺️" },
];

export const TEMPLATES = [
  { id: "empty", label: "Empty page", desc: "A blank canvas.", icon: "□", emoji: false },
  { id: "getting-started", label: "Getting started", desc: "Guided tips for Noska.", icon: "✦", emoji: false },
  { id: "project", label: "Project tracker", desc: "Tasks, milestones, progress.", icon: "📋", emoji: true },
  { id: "notes", label: "Meeting notes", desc: "Agendas, decisions, actions.", icon: "📝", emoji: true },
  { id: "wiki", label: "Team wiki", desc: "Organize team knowledge.", icon: "📚", emoji: true },
  { id: "roadmap", label: "Product roadmap", desc: "Plan and share direction.", icon: "🗺️", emoji: true },
];
