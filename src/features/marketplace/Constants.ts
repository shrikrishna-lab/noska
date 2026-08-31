import { uid } from "../../utils/helpers";

export type MarketplaceNavTab = "discover" | "templates" | "agents" | "consultants" | "skills" | "connections";

export interface CreatorProfile {
  id: string;
  name: string;
  role: string;
  avatar: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  description: string;
  bgGradient: string;
  templatesCount: number;
  ranking?: string;
  languages?: string;
}

export interface AIAgentItem {
  id: string;
  title: string;
  description: string;
  aboutDetailed: string;
  iconBg: string;
  iconSymbol: string;
  creatorName: string;
  creatorAvatar?: string;
  creatorTemplatesCount: number;
  downloads: string;
  price: string;
  ranking?: string;
  versionUpdate: string;
  languages: string;
  systemPrompt?: string;
  capabilities: string[];
  featuresList: Array<{ icon: string; text: string }>;
  categoryTags: string[];
  accessPermissions: string[];
}

export interface NotionStyleTemplate {
  id: string;
  title: string;
  description: string;
  aboutDetailed: string;
  category: "work" | "life" | "school" | "design" | "productivity" | "writing" | "finance" | "health" | "tech";
  authorName: string;
  authorAvatar?: string;
  authorTemplatesCount: number;
  rating: number;
  downloads: string;
  price: string;
  ranking?: string;
  versionUpdate: string;
  languages: string;
  previewType: "board" | "table" | "doc" | "portfolio" | "dashboard" | "sop";
  accentColor: string;
  categoryTags: string[];
  canvasTemplateId?: string;
  realBlocks: Array<{
    id: string;
    type: "h1" | "h2" | "h3" | "text" | "callout" | "checklist" | "divider" | "table" | "quote";
    text: string;
    completed?: boolean;
  }>;
}

export const FEATURED_CONSULTANTS: CreatorProfile[] = [
  {
    id: "c1",
    name: "The Organized Notebook",
    role: "Noska Certified Workspace Architect",
    avatar: "📓",
    rating: 5.0,
    reviewCount: 3,
    templatesCount: 42,
    ranking: "#1 in Personal Productivity",
    languages: "EN, JA, +8",
    description: "Designing minimalist, high-functionality systems for founders, creators, and students.",
    bgGradient: "from-[#4a4228] to-[#2d2817]"
  },
  {
    id: "c2",
    name: "The Notion Bar",
    role: "Certified Systems Strategist & Speaker",
    avatar: "👩🏾‍💼",
    rating: 5.0,
    reviewCount: 24,
    templatesCount: 88,
    ranking: "#2 in Team Systems",
    languages: "EN, FR, +12",
    description: "Empowering fast-scaling agency teams with aesthetic workflows that eliminate chaos.",
    bgGradient: "from-[#1e344e] to-[#122031]"
  },
  {
    id: "c3",
    name: "Notion State",
    role: "Enterprise Systems Studio",
    avatar: "⚡",
    rating: 5.0,
    reviewCount: 5,
    templatesCount: 65,
    ranking: "#5 in Enterprise Ops",
    languages: "EN, DE, +10",
    description: "Building resilient operating systems for modern remote organizations and venture studios.",
    bgGradient: "from-[#1c3629] to-[#102018]"
  },
  {
    id: "c4",
    name: "Primary Goals",
    role: "Productivity & OKR Specialist",
    avatar: "👩🏼‍🏫",
    rating: 5.0,
    reviewCount: 3,
    templatesCount: 31,
    ranking: "#3 in Executive Strategy",
    languages: "EN, ES, +6",
    description: "Cascading company-wide strategy into quarterly execution roadmaps and measurable habits.",
    bgGradient: "from-[#402038] to-[#261321]"
  }
];

export const FEATURED_AGENTS: AIAgentItem[] = [
  {
    id: "ag_pm",
    title: "Project Manager",
    description: "Manages projects by organizing tasks, timelines, and execution inside Noska.",
    aboutDetailed: "Designed for creators, founders, and operators managing multiple moving parts. Organizes and manages projects directly inside your workspace. Mention the agent on any page to break down goals, structure tasks, define timelines, and guide execution. Built to turn ideas into clear, trackable systems without overcomplicating your workflow.",
    iconBg: "bg-[#a3e635]/20 text-[#65a30d] border border-[#a3e635]/40",
    iconSymbol: "📋",
    creatorName: "desbyseb",
    creatorTemplatesCount: 495,
    downloads: "3.4K+",
    price: "Free",
    ranking: "#1 in Agile & Project Management",
    versionUpdate: "2 weeks ago",
    languages: "EN, ES, JA, +15",
    featuresList: [
      { icon: "🔔", text: "Sends notifications and unblock alerts" },
      { icon: "⏱️", text: "Generates weekly burndown and sprint reports" },
      { icon: "📊", text: "Analyzes velocity metrics and milestone dependencies" }
    ],
    capabilities: ["Task dependency tracking", "Automated burndown calculation", "Sprint velocity summary"],
    categoryTags: ["Project Schedule", "Project Roadmap", "Planning & Goals", "Agile", "Scrum"],
    accessPermissions: ["Read and update task status on active project boards", "Generate summary checklists in sprint documents", "Trigger reminder notifications for upcoming milestones"]
  },
  {
    id: "ag_competitor",
    title: "Small Business Competitor Analysis",
    description: "AI agent that analyzes 5–10 competitors by parsing open web data (websites, social media, reviews, pricing) and generates structured competitive teardowns.",
    aboutDetailed: "Automatically aggregates pricing models, feature tiers, customer sentiment from public reviews, and value propositions across your target industry competitors. Converts unstructured competitive intel into executive matrices with clear strategic positioning recommendations.",
    iconBg: "bg-[#38bdf8]/20 text-[#0284c7] border border-[#38bdf8]/40",
    iconSymbol: "🌐",
    creatorName: "danyanovich",
    creatorTemplatesCount: 142,
    downloads: "5.1K+",
    price: "Free",
    ranking: "#2 in Market Research & Strategy",
    versionUpdate: "1 month ago",
    languages: "EN, DE, FR, +18",
    featuresList: [
      { icon: "🌐", text: "Crawls public pricing and feature tiers" },
      { icon: "⚖️", text: "Builds side-by-side capability matrices" },
      { icon: "💡", text: "Identifies unmet customer pain points" }
    ],
    capabilities: ["Competitive pricing matrix", "Feature parity gap analysis", "GTM positioning recommendations"],
    categoryTags: ["Competitor Intel", "Market Research", "Strategy", "Pricing Analysis"],
    accessPermissions: ["Generate comparative tables in workspace research pages", "Read product spec documents to detect differentiation opportunities"]
  },
  {
    id: "ag_social",
    title: "Social Media Manager",
    description: "Plans, drafts, and schedules high-engagement multi-platform social content and maintains your editorial content calendar.",
    aboutDetailed: "Streamlines content creation across Twitter/X, LinkedIn, Threads, and YouTube Community. Formats hooks, body copy, hashtags, and call-to-actions according to each platform's optimal algorithmic cadence.",
    iconBg: "bg-[#38bdf8]/20 text-[#0284c7] border border-[#38bdf8]/40",
    iconSymbol: "📢",
    creatorName: "Noska Studio",
    creatorTemplatesCount: 649,
    downloads: "2.2K+",
    price: "Free",
    ranking: "#3 in Content & Marketing",
    versionUpdate: "3 weeks ago",
    languages: "EN, JA, KO, +20",
    featuresList: [
      { icon: "✍️", text: "Drafts viral platform-specific post variations" },
      { icon: "📅", text: "Organizes editorial pipeline and publishing queue" },
      { icon: "📈", text: "Optimizes hashtags and hook engagement" }
    ],
    capabilities: ["Multi-platform post drafting", "Hashtag & SEO keyword suggestion", "Editorial calendar scheduling"],
    categoryTags: ["Social Media", "Editorial Calendar", "Copywriting", "Marketing"],
    accessPermissions: ["Write draft posts to content calendar database", "Update publishing timeline dates"]
  },
  {
    id: "ag_coo",
    title: "Startup COO",
    description: "Specialized operational partner designed for founders who need clarity, rhythm, and execution support while building fast.",
    aboutDetailed: "Acts as an asynchronous chief of staff. Reviews weekly priorities against company runway, prepares board meeting briefs, isolates operational bottlenecks, and drafts company-wide cadence updates.",
    iconBg: "bg-[#60a5fa]/20 text-[#2563eb] border border-[#60a5fa]/40",
    iconSymbol: "🧙",
    creatorName: "Nation4Business",
    creatorTemplatesCount: 280,
    downloads: "4.5K+",
    price: "Free",
    ranking: "#1 in Executive Operations",
    versionUpdate: "1 week ago",
    languages: "EN, ES, +14",
    featuresList: [
      { icon: "💼", text: "Monitors monthly burn and financial runway" },
      { icon: "🧭", text: "Triages cross-team operational blockers" },
      { icon: "📋", text: "Structures weekly leadership sync agendas" }
    ],
    capabilities: ["Runway & burn rate checks", "Team onboarding roadmap", "Hiring priority triage"],
    categoryTags: ["Executive Ops", "Startup Rhythm", "Leadership", "Finance"],
    accessPermissions: ["Read financial summary tables", "Create executive decision logs"]
  },
  {
    id: "ag_contacts",
    title: "Contacts Manager",
    description: "Automatically builds and maintains a clean relationship database from your meeting notes and interactions.",
    aboutDetailed: "Extracts key relationship context from meeting minutes, categorizes contacts into mentorship and collaboration tiers, and surfaces proactive reminders when critical relationships haven't been touched in over 60 days.",
    iconBg: "bg-[#60a5fa]/20 text-[#2563eb] border border-[#60a5fa]/40",
    iconSymbol: "📁",
    creatorName: "Noska Studio",
    creatorTemplatesCount: 649,
    downloads: "3.2K+",
    price: "Free",
    ranking: "#4 in Relationship Management",
    versionUpdate: "4 weeks ago",
    languages: "EN, FR, DE, +16",
    featuresList: [
      { icon: "👥", text: "Auto-extracts attendee details from meeting notes" },
      { icon: "⏰", text: "Calculates follow-up cadence reminders" },
      { icon: "🏷️", text: "Tags relationships into tier-1, tier-2, tier-3" }
    ],
    capabilities: ["Interaction history logging", "Cadence follow-up reminders", "Network tier grouping"],
    categoryTags: ["Personal CRM", "Networking", "Contacts", "Meeting Notes"],
    accessPermissions: ["Read meeting attendees", "Update contacts directory"]
  },
  {
    id: "ag_trends",
    title: "Market Trends & Insights Scout",
    description: "Synthesizes industry whitepapers, research developments, and customer sentiment into executive summaries.",
    aboutDetailed: "Scans technical publications, developer forums, and open market research to extract the top 5 emerging technology trends impacting your product roadmap each quarter.",
    iconBg: "bg-[#f472b6]/20 text-[#db2777] border border-[#f472b6]/40",
    iconSymbol: "📈",
    creatorName: "TechScout Studio",
    creatorTemplatesCount: 95,
    downloads: "2.8K+",
    price: "Free",
    ranking: "#5 in Market Intelligence",
    versionUpdate: "2 weeks ago",
    languages: "EN, JA, ZH, +22",
    featuresList: [
      { icon: "🔍", text: "Scans research papers and tech developments" },
      { icon: "📄", text: "Generates 2-minute executive intelligence briefs" },
      { icon: "🎯", text: "Maps competitor trend alignment" }
    ],
    capabilities: ["Weekly trend briefs", "Customer sentiment clustering", "Emerging market signals"],
    categoryTags: ["Market Trends", "Intelligence", "Tech Scout", "Research"],
    accessPermissions: ["Create weekly trend digest pages in workspace"]
  }
];

export const NOTION_STYLE_TEMPLATES: NotionStyleTemplate[] = [
  {
    id: "tmpl_sop_process",
    title: "SOP from a process description",
    description: "Converts a walkthrough of how something is done into a step-by-step standard operating procedure. Captures tribal knowledge so a process can be run the same way every time.",
    aboutDetailed: "Converts a walkthrough of how something is done into a step-by-step standard operating procedure. Captures tribal knowledge so a process can be run the same way every time by any team member. Includes pre-requisites, step-by-step action items, error escalation protocols, and role owners.",
    category: "work",
    authorName: "Noska Studio",
    authorAvatar: "📄",
    authorTemplatesCount: 649,
    rating: 4.9,
    downloads: "28.4K+",
    price: "Free",
    ranking: "#4 in Summary & Organization Skills",
    versionUpdate: "3 weeks ago",
    languages: "EN, JA, +17 Languages",
    previewType: "sop",
    accentColor: "#f59e0b",
    categoryTags: ["Summary & Organization Skills", "Standard Operating Procedure (SOP)", "AI Skills", "Docs", "Documentation", "Work", "Operations"],
    canvasTemplateId: "onboarding_checklist",
    realBlocks: [
      { id: uid(), type: "h1", text: "Standard Operating Procedure: Production Release Deployment" },
      { id: uid(), type: "callout", text: "📌 Purpose: Ensure zero-downtime, fully audited deployments to production clusters with automated rollback triggers." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "1. Pre-Deployment Verification" },
      { id: uid(), type: "checklist", text: "All PRs merged into main have passing CI test suites and required 2 approvals", completed: true },
      { id: uid(), type: "checklist", text: "Verify database migration backward compatibility against active schemas", completed: true },
      { id: uid(), type: "checklist", text: "Notify customer engineering team in #deployments channel", completed: false },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "2. Execution & Post-Deployment Monitoring" },
      { id: uid(), type: "checklist", text: "Trigger production release workflow in GitHub Actions", completed: false },
      { id: uid(), type: "checklist", text: "Monitor Datadog P99 latency and error rates for 15 minutes post-deployment", completed: false }
    ]
  },
  {
    id: "tmpl_proposal_draft",
    title: "Proposal draft",
    description: "High-win project proposal: executive problem statement, proposed solution architecture, milestone deliverables, timeline, and investment tiers.",
    aboutDetailed: "Draft a client-ready proposal or statement of work from the provided scope inputs. Uses the objectives, deliverables, timeline, and pricing provided. Ensures clear commercial terms, milestone payment schedules, and liability limits.",
    category: "writing",
    authorName: "Sarah Chen",
    authorAvatar: "💼",
    authorTemplatesCount: 84,
    rating: 4.8,
    downloads: "19.3K+",
    price: "Free",
    ranking: "#2 in Proposal & Contract Writing",
    versionUpdate: "2 weeks ago",
    languages: "EN, FR, DE, +10 Languages",
    previewType: "doc",
    accentColor: "#3b82f6",
    categoryTags: ["Client Proposals", "Sales", "Statement of Work", "Consulting", "Finance"],
    canvasTemplateId: "meeting_notes",
    realBlocks: [
      { id: uid(), type: "h1", text: "Project Proposal: Enterprise Real-Time Whiteboard Integration" },
      { id: uid(), type: "callout", text: "🎯 Executive Summary: Deliver a secure, sub-100ms collaborative whiteboard system for 5,000+ cross-functional squad members." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Scope of Work & Deliverables" },
      { id: uid(), type: "text", text: "• Phase 1: Real-time Presence & Cursor Synchronization Engine (Weeks 1-3)" },
      { id: uid(), type: "text", text: "• Phase 2: Template Library & Workflow Automation Rules System (Weeks 4-6)" },
      { id: uid(), type: "text", text: "• Phase 3: Security Audit, SOC-2 Compliance Verification, and Enterprise GA (Weeks 7-8)" },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Investment & Commercial Terms" },
      { id: uid(), type: "text", text: "Fixed Scope Delivery: $48,000 • Milestone Schedule: 40% Kickoff / 30% Midpoint / 30% GA Signoff" }
    ]
  },
  {
    id: "tmpl_job_description",
    title: "Job description from a brief",
    description: "Attract world-class talent: role mission, key responsibilities, 30-60-90 day outcomes, required competencies, and compensation transparency.",
    aboutDetailed: "Expand the provided role brief into a complete, consistent job description. Uses the brief to list outcomes, responsibilities, culture alignment criteria, salary bands, and interview stages.",
    category: "work",
    authorName: "Elena Rostova",
    authorAvatar: "🌟",
    authorTemplatesCount: 56,
    rating: 4.9,
    downloads: "15.7K+",
    price: "Free",
    ranking: "#3 in Recruiting & HR",
    versionUpdate: "1 month ago",
    languages: "EN, ES, +12 Languages",
    previewType: "doc",
    accentColor: "#f97316",
    categoryTags: ["Recruiting", "Human Resources", "Hiring", "Engineering Management"],
    canvasTemplateId: "onboarding_checklist",
    realBlocks: [
      { id: uid(), type: "h1", text: "Senior Full-Stack Engineer — Real-Time Systems" },
      { id: uid(), type: "callout", text: "🚀 About the Role: Lead the architecture of Noska's core collaborative canvas, real-time presence engine, and template marketplace." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "What You'll Achieve in the First 90 Days" },
      { id: uid(), type: "checklist", text: "Day 30: Ship your first major PR to the canvas DAG topological reordering engine", completed: false },
      { id: uid(), type: "checklist", text: "Day 60: Optimize websocket connection pooling to support 10,000 concurrent rooms", completed: false },
      { id: uid(), type: "checklist", text: "Day 90: Mentor junior engineers and establish team RFC review standards", completed: false },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Compensation & Benefits" },
      { id: uid(), type: "text", text: "Salary: $165,000 - $195,000 USD • 0.25% - 0.5% Equity • 100% Remote • Unlimited PTO" }
    ]
  },
  {
    id: "tmpl_todo",
    title: "Todo",
    description: "Clean daily task board with prioritized sections, quick memos, active status columns, and daily wins log.",
    aboutDetailed: "A clean, frictionless daily action system designed to keep cognitive load low. Categorize tasks into Today, This Week, and Backlog, with dedicated quick scratchpad memos and completion logs.",
    category: "productivity",
    authorName: "Sarah Chen",
    authorAvatar: "👩🏻",
    authorTemplatesCount: 84,
    rating: 4.9,
    downloads: "18.2K+",
    price: "Free",
    ranking: "#1 in Personal Task Management",
    versionUpdate: "1 week ago",
    languages: "EN, JA, KO, +20 Languages",
    previewType: "board",
    accentColor: "#f59e0b",
    categoryTags: ["Task Management", "Todo", "Focus", "Daily Rhythm", "Productivity"],
    canvasTemplateId: "daily_journal",
    realBlocks: [
      { id: uid(), type: "h1", text: "Daily Action Dashboard & Todo" },
      { id: uid(), type: "callout", text: "⚡ Priority Rule: Focus on the single highest leverage task first before context switching into reactive messages." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Today's Top 3 Priorities" },
      { id: uid(), type: "checklist", text: "Ship template marketplace with Notion studio layout", completed: true },
      { id: uid(), type: "checklist", text: "Review database composite index performance on production", completed: false },
      { id: uid(), type: "checklist", text: "Prepare Q3 roadmap presentation for executive sync", completed: false },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Quick Scratchpad & Memos" },
      { id: uid(), type: "text", text: "• Remember to check websocket connection latency across all regional clusters." },
      { id: uid(), type: "text", text: "• Design system tokens must follow WCAG AA 4.5:1 color contrast ratio." }
    ]
  },
  {
    id: "tmpl_student_studio",
    title: "Student Design Studio",
    description: "Academic creative space with study timers, syllabus milestones, class notes repository, and visual moodboards.",
    aboutDetailed: "All-in-one student workspace combining Pomodoro study intervals, active recall study checklists, assignment deadlines, and design portfolio showcases.",
    category: "school",
    authorName: "Aiko Tanaka",
    authorAvatar: "🎨",
    authorTemplatesCount: 38,
    rating: 4.7,
    downloads: "12.4K+",
    price: "Free",
    ranking: "#1 in Student Workspaces",
    versionUpdate: "3 weeks ago",
    languages: "EN, JA, +8 Languages",
    previewType: "dashboard",
    accentColor: "#8b5cf6",
    categoryTags: ["Academic", "Student OS", "Design Studio", "Study Rhythm", "College"],
    canvasTemplateId: "weekly_planner",
    realBlocks: [
      { id: uid(), type: "h1", text: "Student Design Studio & Workspace" },
      { id: uid(), type: "callout", text: "🎓 Semester Focus: Human-Computer Interaction, Design Systems, and Distributed Systems Architecture." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Active Coursework & Deliverables" },
      { id: uid(), type: "checklist", text: "Submit interactive prototype for Design Systems final project", completed: true },
      { id: uid(), type: "checklist", text: "Complete Distributed Systems consensus algorithm paper review", completed: false },
      { id: uid(), type: "checklist", text: "Prepare presentation slides for Friday seminar", completed: false }
    ]
  },
  {
    id: "tmpl_portfolio",
    title: "Easy Personal Website / Portfolio",
    description: "Modern portfolio layout showcasing case studies, core skills, client testimonials, and direct contact protocols.",
    aboutDetailed: "Launch a personal portfolio website in minutes. Features high-impact case study cards, skills matrix, interactive testimonials, and contact links.",
    category: "design",
    authorName: "Elena Rostova",
    authorAvatar: "🚀",
    authorTemplatesCount: 56,
    rating: 4.8,
    downloads: "14.9K+",
    price: "Free",
    ranking: "#2 in Portfolio & Personal Websites",
    versionUpdate: "2 weeks ago",
    languages: "EN, DE, +14 Languages",
    previewType: "portfolio",
    accentColor: "#0ea5e9",
    categoryTags: ["Portfolio", "Personal Brand", "Design Showcase", "Websites"],
    canvasTemplateId: "user_journey_map",
    realBlocks: [
      { id: uid(), type: "h1", text: "Elena Rostova — Staff Product Architect" },
      { id: uid(), type: "callout", text: "👋 Designing intuitive, lightning-fast collaborative tools used by over 500,000 engineers and creators worldwide." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Selected Case Studies" },
      { id: uid(), type: "text", text: "1. Noska Real-Time Sync Engine: Scaled collaborative canvas to 1,000 concurrent sticky cards with zero framerate drops." },
      { id: uid(), type: "text", text: "2. Design Token System v3: Standardized 40+ UI primitives with automated WCAG AA compliance verification." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Core Technical Competencies" },
      { id: uid(), type: "text", text: "• TypeScript • React 19 • Tailwind CSS • WebGL Canvas • PostgreSQL • Supabase • Distributed Systems" }
    ]
  },
  {
    id: "tmpl_monthly_budget",
    title: "Monthly budget",
    description: "Comprehensive financial tracking: monthly income sources, fixed vs variable expense allocations, and net savings rate.",
    aboutDetailed: "Track monthly cashflow, categorize spending automatically, calculate liquid savings rates, and visualize net runway progression.",
    category: "finance",
    authorName: "Noska Studio",
    authorAvatar: "💼",
    authorTemplatesCount: 649,
    rating: 4.8,
    downloads: "21.6K+",
    price: "Free",
    ranking: "#1 in Personal Finance",
    versionUpdate: "1 month ago",
    languages: "EN, ES, JA, +24 Languages",
    previewType: "table",
    accentColor: "#10b981",
    categoryTags: ["Finance", "Budgeting", "Cashflow", "Savings", "Runway"],
    canvasTemplateId: "okr_tree",
    realBlocks: [
      { id: uid(), type: "h1", text: "Monthly Financial Budget & Cashflow Tracker" },
      { id: uid(), type: "callout", text: "💰 Savings Goal: Maintain a minimum 35% net savings rate allocated to index investments and emergency runway." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "1. Income Streams Overview" },
      { id: uid(), type: "text", text: "• Primary Salary: $8,500/mo • Consulting / Advisory: $2,200/mo • Digital Products & Templates: $850/mo" },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "2. Monthly Expense Allocations" },
      { id: uid(), type: "checklist", text: "Housing & Utilities: $2,400 (Fixed)", completed: true },
      { id: uid(), type: "checklist", text: "Groceries & Nutrition: $650 (Variable)", completed: true },
      { id: uid(), type: "checklist", text: "SaaS & Cloud Infrastructure: $180 (Fixed)", completed: true },
      { id: uid(), type: "checklist", text: "Health & Fitness Memberships: $120 (Fixed)", completed: true }
    ]
  },
  {
    id: "tmpl_company_pack",
    title: "Company pack",
    description: "The complete operating kit for startups: team directory, company wiki, sprint roadmap, meeting cadence, and brand guidelines.",
    aboutDetailed: "Everything an early-stage company needs in a single unified workspace. Contains employee directories, onboarding playbooks, company goals (OKRs), and investor update templates.",
    category: "work",
    authorName: "Noska Studio",
    authorAvatar: "💼",
    authorTemplatesCount: 649,
    rating: 4.9,
    downloads: "32.1K+",
    price: "Free",
    ranking: "#1 in Team Operating Systems",
    versionUpdate: "2 weeks ago",
    languages: "EN, JA, FR, +18 Languages",
    previewType: "doc",
    accentColor: "#3b82f6",
    categoryTags: ["Company OS", "Wiki", "Team Directory", "Onboarding", "Startups"],
    canvasTemplateId: "onboarding_checklist",
    realBlocks: [
      { id: uid(), type: "h1", text: "Company Operating Pack & Team Wiki" },
      { id: uid(), type: "callout", text: "🏢 Company Mission: Empower modern distributed teams to build world-class products with total clarity." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Core Workspace Portals" },
      { id: uid(), type: "text", text: "• 👥 Team Directory & Roles • 🚀 Product & Sprint Roadmap • 📚 Engineering RFC Wiki • 📋 Company OKRs" }
    ]
  },
  {
    id: "tmpl_career_pack",
    title: "Career pack",
    description: "Manage your professional career trajectory: resume versions, job application pipeline, interview debriefs, and salary negotiation notes.",
    aboutDetailed: "Structured career management system. Track job applications across stages, store tailored resume versions, record recruiter notes, and practice common system design and behavioral questions.",
    category: "life",
    authorName: "Noska Studio",
    authorAvatar: "📎",
    authorTemplatesCount: 649,
    rating: 4.9,
    downloads: "24.5K+",
    price: "Free",
    ranking: "#2 in Career & Professional Growth",
    versionUpdate: "3 weeks ago",
    languages: "EN, ES, +15 Languages",
    previewType: "doc",
    accentColor: "#8b5cf6",
    categoryTags: ["Career", "Job Search", "Resume", "Interviews", "Growth"],
    canvasTemplateId: "goal_tracker",
    realBlocks: [
      { id: uid(), type: "h1", text: "Professional Career OS & Job Tracker" },
      { id: uid(), type: "callout", text: "🎯 Career Objective: Secure a Staff/Lead engineering position at a high-growth developer tools company." },
      { id: uid(), type: "divider", text: "" },
      { id: uid(), type: "h2", text: "Application Pipeline Stages" },
      { id: uid(), type: "checklist", text: "Initial Recruiter Screen completed", completed: true },
      { id: uid(), type: "checklist", text: "System Architecture Deep-Dive scheduled", completed: false }
    ]
  }
];
