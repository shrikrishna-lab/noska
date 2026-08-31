import { NoskaTemplate } from "./templateTypes";

export const OFFICIAL_TEMPLATES: NoskaTemplate[] = [
  // ── Team & Work Templates ───────────────────────────────────────────────
  {
    id: "sprint_retro",
    name: "Sprint Retrospective",
    description: "Reflect on sprint momentum: celebrate wins, diagnose blockers, assign owners, and track follow-ups.",
    icon: "🔄",
    category: "team",
    tags: ["Agile", "Scrum", "Engineering", "Team", "Weekly"],
    isOfficial: true,
    isRecurring: true,
    recurrenceCadence: "biweekly",
    isTrending: true,
    curatedCollection: "engineering_agile",
    version: "1.2.0",
    changelog: "Added automatic action item assignment rules & sprint metrics column",
    defaultNamePattern: "Sprint Retro #{{number}} — {{project}}",
    sections: [
      { id: "went_well", name: "🌟 What Went Well", color: "green", defaultEnabled: true, roleHint: "All Teammates" },
      { id: "needs_improve", name: "❓ What Could Be Better", color: "pink", defaultEnabled: true, roleHint: "All Teammates" },
      { id: "action_items", name: "✅ Action Items", color: "blue", defaultEnabled: true, roleHint: "Scrum Master / Lead" },
      { id: "shoutouts", name: "👏 Kudos & Shoutouts", color: "purple", isOptional: true, defaultEnabled: true, roleHint: "Open Mic" },
      { id: "metrics", name: "📊 Sprint Metrics", color: "yellow", isOptional: true, defaultEnabled: false, roleHint: "Product Owner" }
    ],
    starterCards: [
      { sectionId: "went_well", text: "Fast turnaround on the auth refactor 🚀", color: "green", scaleTier: "all", statusTag: "Shipped" },
      { sectionId: "went_well", text: "Zero downtime during database migration", color: "green", scaleTier: "medium_large", statusTag: "Shipped" },
      { sectionId: "went_well", text: "Async PR review latency cut in half", color: "green", scaleTier: "large_only", statusTag: "Milestone" },
      { sectionId: "needs_improve", text: "Unclear API documentation delayed QA testing", color: "pink", scaleTier: "all", statusTag: "Blocker / Risk" },
      { sectionId: "needs_improve", text: "Flaky integration tests caused CI queue delays", color: "pink", scaleTier: "medium_large", statusTag: "Blocker / Risk" },
      { sectionId: "action_items", text: "Enforce OpenAPI spec review before development", color: "blue", scaleTier: "all", statusTag: "Action Item" },
      { sectionId: "action_items", text: "Quarantine flaky Playwright tests by Friday", color: "blue", scaleTier: "medium_large", statusTag: "Action Item" },
      { sectionId: "shoutouts", text: "Huge thanks to @Sarah for unblocking the release!", color: "purple", scaleTier: "all" },
      { sectionId: "metrics", text: "Velocity: 42 pts • Burndown: 94% on schedule", color: "yellow", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "needs_improve", fromCardIndex: 0, toSection: "action_items", toCardIndex: 0, type: "leads_to", label: "Resolves" }
    ],
    workflowRules: [
      {
        id: "rule_action_item_tag",
        name: "Stamp Action Items",
        trigger: "card_moved_to_section",
        condition: { sectionId: "action_items" },
        action: { type: "update_status", badgeText: "Action Item", badgeColor: "#3b82f6" }
      },
      {
        id: "rule_blocker_warning",
        name: "Alert on Blockers",
        trigger: "dependency_blocked",
        condition: { connectorType: "blocks" },
        action: { type: "flag_warning", badgeText: "Blocked", badgeColor: "#ef4444" }
      }
    ],
    checklist: [
      { id: "c1", label: "Review previous retro action items", completed: true },
      { id: "c2", label: "Brainstorm wins & opportunities (5 min silent write)", completed: false },
      { id: "c3", label: "Cluster common themes & vote on priority topics", completed: false },
      { id: "c4", label: "Assign owners and deadlines to all Action Items", completed: false }
    ],
    scaleHints: {
      small: { label: "Small (1-4)", description: "1-2 key items per column for focused retros", cardCount: 4 },
      medium: { label: "Medium (5-10)", description: "Balanced view with follow-ups & kudos", cardCount: 7 },
      large: { label: "Large (10+)", description: "Comprehensive breakdown for squad-wide syncs", cardCount: 9 }
    },
    installCount: 14200,
    rating: 4.9,
    ratingCount: 382,
    reviews: [
      {
        id: "r1",
        authorId: "u1",
        authorName: "Marcus Vance",
        rating: 5,
        comment: "The automated action item rule saves our team 15 minutes of manual tagging every sprint.",
        createdAt: "2026-08-20T10:00:00Z",
        verifiedUser: true
      }
    ]
  },
  {
    id: "product_roadmap",
    name: "Product Roadmap & Releases",
    description: "Visual release plan across Discovery, Build, Polish, and Launch with dependency warning flows.",
    icon: "🚀",
    category: "team",
    tags: ["Product", "Roadmap", "Strategy", "Quarterly", "Milestones"],
    isOfficial: true,
    isRecurring: false,
    isTrending: true,
    curatedCollection: "featured",
    version: "1.1.0",
    defaultNamePattern: "Product Roadmap — {{project}} — {{date}}",
    sections: [
      { id: "discovery", name: "🔍 Discovery & Research", color: "yellow", defaultEnabled: true, roleHint: "Product & Design" },
      { id: "building", name: "⚡ In Build (Q1)", color: "blue", defaultEnabled: true, roleHint: "Engineering" },
      { id: "testing", name: "🧪 QA & Polishing (Q2)", color: "peach", defaultEnabled: true, roleHint: "QA & Beta Users" },
      { id: "launched", name: "🎉 Target Launch (Q3)", color: "green", defaultEnabled: true, roleHint: "Go-To-Market" },
      { id: "backlog", name: "💡 Future Explorations", color: "purple", isOptional: true, defaultEnabled: true, roleHint: "All Teams" }
    ],
    starterCards: [
      { sectionId: "discovery", text: "User research & customer interviews (N=15)", color: "yellow", scaleTier: "all" },
      { sectionId: "discovery", text: "Competitive teardowns & technical feasibility", color: "yellow", scaleTier: "large_only" },
      { sectionId: "building", text: "Real-time sync engine & offline local cache", color: "blue", scaleTier: "all", statusTag: "Milestone" },
      { sectionId: "building", text: "Desktop companion deep linking protocols", color: "blue", scaleTier: "medium_large" },
      { sectionId: "testing", text: "End-to-end load testing (1,000 concurrent cards)", color: "peach", scaleTier: "all" },
      { sectionId: "launched", text: "Enterprise GA Launch & Marketplace debut", color: "green", scaleTier: "all", statusTag: "Shipped" },
      { sectionId: "backlog", text: "Voice memo AI transcription into sticky notes", color: "purple", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "discovery", fromCardIndex: 0, toSection: "building", toCardIndex: 0, type: "leads_to", label: "Spec ready" },
      { fromSection: "building", fromCardIndex: 0, toSection: "testing", toCardIndex: 0, type: "depends_on", label: "Blocks QA" },
      { fromSection: "testing", fromCardIndex: 0, toSection: "launched", toCardIndex: 0, type: "leads_to", label: "Unlocks GA" }
    ],
    workflowRules: [
      {
        id: "rule_launch_shipped",
        name: "Mark Shipped on Launch",
        trigger: "card_moved_to_section",
        condition: { sectionId: "launched" },
        action: { type: "update_status", badgeText: "Shipped", badgeColor: "#10b981" }
      }
    ],
    checklist: [
      { id: "rc1", label: "Align quarterly themes with executive leadership", completed: true },
      { id: "rc2", label: "Define tech feasibility and dependency connectors", completed: false },
      { id: "rc3", label: "Set target milestone dates for GA release", completed: false }
    ],
    scaleHints: {
      small: { label: "Lean (1-3 Milestones)", description: "Direct pathway to shipping MVP", cardCount: 4 },
      medium: { label: "Standard (Quarterly)", description: "Multi-track roadmap with dependencies", cardCount: 6 },
      large: { label: "Enterprise (Multi-Team)", description: "Detailed stages across squads", cardCount: 7 }
    },
    installCount: 18900,
    rating: 5.0,
    ratingCount: 512
  },
  {
    id: "meeting_notes",
    name: "Executive Meeting Notes",
    description: "Structured agenda, key discussion takeaways, final decisions, and assigned action items.",
    icon: "📋",
    category: "team",
    tags: ["Meeting", "Decisions", "Executive", "Notes", "Leadership"],
    isOfficial: true,
    isRecurring: true,
    curatedCollection: "remote_teams",
    defaultNamePattern: "Meeting Notes — {{project}} — {{date}}",
    sections: [
      { id: "agenda", name: "📌 Agenda & Context", color: "peach", defaultEnabled: true, roleHint: "Meeting Lead" },
      { id: "decisions", name: "⚡ Final Decisions", color: "yellow", defaultEnabled: true, roleHint: "Executive Sponsor" },
      { id: "questions", name: "❓ Open Questions", color: "pink", defaultEnabled: true, roleHint: "All Attendees" },
      { id: "next_steps", name: "🎯 Next Steps & Owners", color: "blue", defaultEnabled: true, roleHint: "Assigned Owners" },
      { id: "parking_lot", name: "🚗 Parking Lot", color: "purple", isOptional: true, defaultEnabled: false }
    ],
    starterCards: [
      { sectionId: "agenda", text: "Q3 Pricing structure overhaul & enterprise tiers", color: "peach", scaleTier: "all" },
      { sectionId: "decisions", text: "Approved: Launch $15/seat Pro Tier with unlimited boards", color: "yellow", scaleTier: "all", statusTag: "Decision" },
      { sectionId: "questions", text: "Do we offer grandfathered pricing to existing beta users?", color: "pink", scaleTier: "all" },
      { sectionId: "next_steps", text: "@Alex to draft terms of service by Wednesday", color: "blue", scaleTier: "all", statusTag: "Action Item" },
      { sectionId: "next_steps", text: "@Design to finalize billing dashboard mockups", color: "blue", scaleTier: "medium_large", statusTag: "Action Item" }
    ],
    defaultConnectors: [
      { fromSection: "decisions", fromCardIndex: 0, toSection: "next_steps", toCardIndex: 0, type: "leads_to", label: "Execute" }
    ],
    installCount: 9400,
    rating: 4.8,
    ratingCount: 210
  },
  {
    id: "okr_tree",
    name: "Company OKR Tree",
    description: "Cascade high-level objectives down into measurable quarterly key results and lead metrics.",
    icon: "🎯",
    category: "team",
    tags: ["OKR", "Goals", "Strategy", "Alignment", "Executive"],
    isOfficial: true,
    isRecurring: false,
    curatedCollection: "featured",
    defaultNamePattern: "OKR Goal Tree — {{project}} — Q{{quarter}}",
    sections: [
      { id: "objective", name: "🎯 Top-Level Objective", color: "purple", defaultEnabled: true, roleHint: "Founders / C-Suite" },
      { id: "kr1", name: "📈 KR 1: Growth", color: "blue", defaultEnabled: true, roleHint: "Marketing & Sales" },
      { id: "kr2", name: "💎 KR 2: Retention", color: "green", defaultEnabled: true, roleHint: "Product & Customer Success" },
      { id: "kr3", name: "⚡ KR 3: Efficiency", color: "yellow", defaultEnabled: true, roleHint: "Infrastructure & Ops" },
      { id: "initiatives", name: "🚀 Supporting Initiatives", color: "peach", isOptional: true, defaultEnabled: true, roleHint: "Squad Leads" }
    ],
    starterCards: [
      { sectionId: "objective", text: "Establish Noska as the leading whiteboard for fast-moving teams", color: "purple", scaleTier: "all", statusTag: "Milestone" },
      { sectionId: "kr1", text: "Scale active weekly boards from 5,000 to 25,000", color: "blue", scaleTier: "all" },
      { sectionId: "kr2", text: "Achieve 45% D30 team retention rate", color: "green", scaleTier: "all" },
      { sectionId: "kr3", text: "Sub-100ms real-time latency across all geo regions", color: "yellow", scaleTier: "all" },
      { sectionId: "initiatives", text: "Launch Community Template Marketplace", color: "peach", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "objective", fromCardIndex: 0, toSection: "kr1", toCardIndex: 0, type: "leads_to", label: "Measure" },
      { fromSection: "objective", fromCardIndex: 0, toSection: "kr2", toCardIndex: 0, type: "leads_to", label: "Measure" },
      { fromSection: "initiatives", fromCardIndex: 0, toSection: "kr1", toCardIndex: 0, type: "leads_to", label: "Drives" }
    ],
    installCount: 11200,
    rating: 4.9,
    ratingCount: 310
  },
  {
    id: "brainstorm_matrix",
    name: "Effort vs. Impact Matrix",
    description: "2x2 prioritization grid to separate high-impact quick wins from complex strategic bets.",
    icon: "💡",
    category: "team",
    tags: ["Brainstorm", "Prioritization", "Strategy", "Product", "Matrix"],
    isOfficial: true,
    isRecurring: false,
    curatedCollection: "engineering_agile",
    defaultNamePattern: "Prioritization Matrix — {{project}} — {{date}}",
    sections: [
      { id: "quick_wins", name: "⚡ Quick Wins (High Impact, Low Effort)", color: "green", defaultEnabled: true },
      { id: "major_projects", name: "💎 Strategic Bets (High Impact, High Effort)", color: "purple", defaultEnabled: true },
      { id: "fill_ins", name: "🧩 Fill-Ins (Low Impact, Low Effort)", color: "yellow", defaultEnabled: true },
      { id: "thankless", name: "⏳ Deprioritize (Low Impact, High Effort)", color: "pink", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "quick_wins", text: "Keyboard shortcut cheatsheet for fast canvas navigation", color: "green", scaleTier: "all", statusTag: "Action Item" },
      { sectionId: "quick_wins", text: "One-click copy markdown export", color: "green", scaleTier: "medium_large" },
      { sectionId: "major_projects", text: "Full bi-directional document sync engine", color: "purple", scaleTier: "all", statusTag: "Milestone" },
      { sectionId: "fill_ins", text: "Add 3 new pastel tape texture patterns", color: "yellow", scaleTier: "all" },
      { sectionId: "thankless", text: "Custom canvas WebGL particle renderer", color: "pink", scaleTier: "all" }
    ],
    installCount: 16400,
    rating: 5.0,
    ratingCount: 440
  },
  {
    id: "onboarding_checklist",
    name: "Team Onboarding Checklist",
    description: "Structured ramp-up roadmap for new engineers and teammates across Day 1, Week 1, and Month 1.",
    icon: "🌱",
    category: "team",
    tags: ["HR", "Onboarding", "Team", "Checklist", "Culture"],
    isOfficial: true,
    isRecurring: false,
    curatedCollection: "remote_teams",
    defaultNamePattern: "Onboarding — {{project}} — {{date}}",
    sections: [
      { id: "day_1", name: "👋 Day 1: Access & Setup", color: "peach", defaultEnabled: true, roleHint: "Manager / IT" },
      { id: "week_1", name: "📚 Week 1: Knowledge & 1st PR", color: "blue", defaultEnabled: true, roleHint: "Mentor" },
      { id: "month_1", name: "🚀 Month 1: Ownership & Projects", color: "green", defaultEnabled: true, roleHint: "New Hire" },
      { id: "buddies", name: "🤝 Key Team Contacts", color: "purple", isOptional: true, defaultEnabled: true, roleHint: "Buddy" }
    ],
    starterCards: [
      { sectionId: "day_1", text: "GitHub access & local repo clone running", color: "peach", scaleTier: "all" },
      { sectionId: "day_1", text: "1:1 Welcome coffee with team mentor", color: "peach", scaleTier: "all" },
      { sectionId: "week_1", text: "Ship first bugfix PR to production", color: "blue", scaleTier: "all" },
      { sectionId: "month_1", text: "Lead first sprint feature planning review", color: "green", scaleTier: "all" },
      { sectionId: "buddies", text: "Mentor: @David • Squad Lead: @Elena", color: "purple", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "day_1", fromCardIndex: 0, toSection: "week_1", toCardIndex: 0, type: "leads_to", label: "Next step" },
      { fromSection: "week_1", fromCardIndex: 0, toSection: "month_1", toCardIndex: 0, type: "leads_to", label: "Graduate" }
    ],
    checklist: [
      { id: "ob1", label: "Grant GitHub, Slack, and Supabase credentials", completed: true },
      { id: "ob2", label: "1:1 Team intro & pairing session with assigned buddy", completed: false },
      { id: "ob3", label: "Submit and merge first pull request", completed: false }
    ],
    installCount: 7800,
    rating: 4.7,
    ratingCount: 160
  },
  {
    id: "user_journey_map",
    name: "User Journey Map",
    description: "Map customer experience stages from discovery, onboarding, aha moment, to advocacy.",
    icon: "🗺️",
    category: "team",
    tags: ["UX", "Design", "Customer", "Journey", "Product"],
    isOfficial: true,
    isRecurring: false,
    curatedCollection: "featured",
    defaultNamePattern: "User Journey Map — {{project}}",
    sections: [
      { id: "discover", name: "1. Awareness & Discovery", color: "yellow", defaultEnabled: true },
      { id: "consider", name: "2. Sign Up & First Visit", color: "blue", defaultEnabled: true },
      { id: "aha", name: "3. 'Aha!' Magic Moment", color: "green", defaultEnabled: true },
      { id: "retention", name: "4. Daily Habit & Retention", color: "purple", defaultEnabled: true },
      { id: "pain_points", name: "⚠️ Friction Points", color: "pink", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "discover", text: "Discovers Noska on Twitter/Product Hunt demo", color: "yellow", scaleTier: "all" },
      { sectionId: "consider", text: "Creates first workspace and opens whiteboard", color: "blue", scaleTier: "all" },
      { sectionId: "aha", text: "Auto-Tidies 15 sticky notes into a clean roadmap!", color: "green", scaleTier: "all" },
      { sectionId: "retention", text: "Shares live board link with team during retro", color: "purple", scaleTier: "all" },
      { sectionId: "pain_points", text: "Friction: Initial blank board without template guidance", color: "pink", scaleTier: "all", statusTag: "Blocker / Risk" }
    ],
    defaultConnectors: [
      { fromSection: "discover", fromCardIndex: 0, toSection: "consider", toCardIndex: 0, type: "leads_to" },
      { fromSection: "consider", fromCardIndex: 0, toSection: "aha", toCardIndex: 0, type: "leads_to" },
      { fromSection: "aha", fromCardIndex: 0, toSection: "retention", toCardIndex: 0, type: "leads_to" }
    ],
    installCount: 8900,
    rating: 4.8,
    ratingCount: 224
  },

  // ── Personal & Productivity Templates ───────────────────────────────────
  {
    id: "daily_journal",
    name: "Daily Reflection & Journal",
    description: "Start the day with morning intentions and wrap up with gratitude, wins, and lessons.",
    icon: "☕",
    category: "personal",
    tags: ["Personal", "Journal", "Mindset", "Daily", "Wellness"],
    isOfficial: true,
    isRecurring: true,
    recurrenceCadence: "weekly",
    isTrending: true,
    curatedCollection: "solo_productivity",
    defaultNamePattern: "Daily Journal — {{date}}",
    sections: [
      { id: "intentions", name: "🌅 Morning Focus & Intentions", color: "yellow", defaultEnabled: true },
      { id: "wins", name: "🌟 Highlights & Wins", color: "green", defaultEnabled: true },
      { id: "learnings", name: "💡 Key Learnings", color: "blue", defaultEnabled: true },
      { id: "gratitude", name: "🙏 Gratitude Note", color: "purple", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "intentions", text: "Top Priority: Ship the template system before 4 PM", color: "yellow", scaleTier: "all", statusTag: "Action Item" },
      { sectionId: "wins", text: "Deep work session: 3 uninterrupted hours of coding", color: "green", scaleTier: "all", statusTag: "Shipped" },
      { sectionId: "learnings", text: "Clear contracts make complex UI state simple to maintain", color: "blue", scaleTier: "all" },
      { sectionId: "gratitude", text: "Grateful for crisp coffee & supportive teammates", color: "purple", scaleTier: "all" }
    ],
    checklist: [
      { id: "dj1", label: "Write 3 core daily priorities before opening email", completed: false },
      { id: "dj2", label: "Complete 90-minute morning deep work block", completed: false },
      { id: "dj3", label: "Evening reflection and gratitude journal", completed: false }
    ],
    installCount: 15300,
    rating: 5.0,
    ratingCount: 490
  },
  {
    id: "weekly_planner",
    name: "Weekly Planner & Sprint",
    description: "Organize Monday through Friday focus cards with top 3 weekly goals and priority flags.",
    icon: "📅",
    category: "personal",
    tags: ["Personal", "Planner", "Weekly", "Productivity", "Schedule"],
    isOfficial: true,
    isRecurring: true,
    recurrenceCadence: "weekly",
    curatedCollection: "solo_productivity",
    defaultNamePattern: "Weekly Plan — Week {{week_number}} ({{date}})",
    sections: [
      { id: "goals", name: "🎯 Top 3 Weekly Goals", color: "purple", defaultEnabled: true },
      { id: "mon_tue", name: "⚡ Mon / Tue: Deep Work", color: "blue", defaultEnabled: true },
      { id: "wed_thu", name: "🔨 Wed / Thu: Build & Polish", color: "peach", defaultEnabled: true },
      { id: "fri", name: "🚀 Friday: Ship & Retro", color: "green", defaultEnabled: true },
      { id: "habits", name: "🌿 Habit Check", color: "yellow", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "goals", text: "1. Finalize Noska Marketplace v1", color: "purple", scaleTier: "all", statusTag: "Milestone" },
      { sectionId: "mon_tue", text: "Architecture spec & data model unit tests", color: "blue", scaleTier: "all" },
      { sectionId: "wed_thu", text: "Modal components & live preview polish", color: "peach", scaleTier: "all" },
      { sectionId: "fri", text: "Full test suite run & production build validation", color: "green", scaleTier: "all", statusTag: "Action Item" },
      { sectionId: "habits", text: "Daily 30 min exercise • 2L water • No screens at 11 PM", color: "yellow", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "goals", fromCardIndex: 0, toSection: "mon_tue", toCardIndex: 0, type: "leads_to" },
      { fromSection: "mon_tue", fromCardIndex: 0, toSection: "wed_thu", toCardIndex: 0, type: "leads_to" },
      { fromSection: "wed_thu", fromCardIndex: 0, toSection: "fri", toCardIndex: 0, type: "leads_to" }
    ],
    installCount: 19400,
    rating: 4.9,
    ratingCount: 620
  },
  {
    id: "goal_tracker",
    name: "Annual Goal Tracker",
    description: "Turn your year's ambition into quarterly milestones and weekly actionable habits.",
    icon: "🏔️",
    category: "personal",
    tags: ["Personal", "Goals", "Life", "Milestones", "Yearly"],
    isOfficial: true,
    isRecurring: false,
    curatedCollection: "solo_productivity",
    defaultNamePattern: "Annual Goals — {{year}}",
    sections: [
      { id: "vision", name: "🌌 Vision & Core Themes", color: "purple", defaultEnabled: true },
      { id: "career", name: "💼 Career & Craft", color: "blue", defaultEnabled: true },
      { id: "health", name: "🏃 Health & Vitality", color: "green", defaultEnabled: true },
      { id: "learning", name: "📖 Learning & Curiosity", color: "yellow", defaultEnabled: true },
      { id: "finance", name: "💰 Financial Growth", color: "peach", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "vision", text: "Focus on craftsmanship, depth, and consistent daily momentum", color: "purple", scaleTier: "all" },
      { sectionId: "career", text: "Launch Noska to 10,000 active collaborative teams", color: "blue", scaleTier: "all", statusTag: "Milestone" },
      { sectionId: "health", text: "Run 10km under 50 minutes & sleep 8 hours consistently", color: "green", scaleTier: "all" },
      { sectionId: "learning", text: "Read 12 high-impact books on product design & psychology", color: "yellow", scaleTier: "all" }
    ],
    installCount: 11800,
    rating: 4.8,
    ratingCount: 275
  },
  {
    id: "habit_streak",
    name: "Habit Streak Board",
    description: "Track daily keystone habits with milestones, trigger routines, and streak celebrations.",
    icon: "🔥",
    category: "personal",
    tags: ["Personal", "Habits", "Routine", "Tracking", "Discipline"],
    isOfficial: true,
    isRecurring: true,
    curatedCollection: "solo_productivity",
    defaultNamePattern: "Habit Streaks — {{date}}",
    sections: [
      { id: "keystone", name: "👑 Keystone Daily Habits", color: "yellow", defaultEnabled: true },
      { id: "triggers", name: "⚡ Routine Triggers (When X → Do Y)", color: "blue", defaultEnabled: true },
      { id: "milestones", name: "🏆 30-Day Streak Milestones", color: "green", defaultEnabled: true },
      { id: "reflections", name: "💭 What Got in the Way", color: "pink", isOptional: true, defaultEnabled: true }
    ],
    starterCards: [
      { sectionId: "keystone", text: "1. 30 min morning exercise\n2. 45 min deep writing\n3. 10 min daily review", color: "yellow", scaleTier: "all" },
      { sectionId: "triggers", text: "After morning coffee → Open Noska whiteboard and write 3 intentions", color: "blue", scaleTier: "all" },
      { sectionId: "milestones", text: "Day 30 reached! Reward: weekend retreat", color: "green", scaleTier: "all", statusTag: "Shipped" },
      { sectionId: "reflections", text: "Late phone usage before bed hurts morning energy", color: "pink", scaleTier: "all" }
    ],
    defaultConnectors: [
      { fromSection: "keystone", fromCardIndex: 0, toSection: "triggers", toCardIndex: 0, type: "leads_to", label: "Anchor" },
      { fromSection: "triggers", fromCardIndex: 0, toSection: "milestones", toCardIndex: 0, type: "leads_to", label: "Builds" }
    ],
    installCount: 8400,
    rating: 4.9,
    ratingCount: 190
  }
];

export function getOfficialTemplateById(id: string): NoskaTemplate | undefined {
  return OFFICIAL_TEMPLATES.find(t => t.id === id);
}
