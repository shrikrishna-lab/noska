import type {
  AdminUser, Workspace, WaitlistEntry, AuditLog, Subscription,
  Payment, FeatureFlag, AIModelUsage, FeedbackItem, SupportTicket,
  EmailCampaign, RoadmapItem, Integration, ApiKey, NotificationItem,
  SystemComponent, TrendPoint, AiUsageByDay,
} from "./types";

function subDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
}

function format(date: Date, fmt: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = String(date.getDate()).padStart(2, "0");
  const m = months[date.getMonth()];
  if (fmt.startsWith("MMM dd")) return `${m} ${d}`;
  if (fmt === "MMM") return m;
  return date.toISOString();
}

function daysAgo(n: number): string {
  return subDays(new Date(), n).toISOString();
}

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const names = [
  "Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Ross", "Eve Davis",
  "Frank Miller", "Grace Lee", "Henry Wilson", "Ivy Chen", "Jack Taylor",
  "Karen White", "Leo Martinez", "Mia Anderson", "Noah Thomas", "Olivia Garcia",
  "Peter Robinson", "Quinn Harris", "Rachel Clark", "Sam Lewis", "Tina Walker",
  "Uma Patel", "Victor Hall", "Wendy Allen", "Xavier Young", "Yara King",
  "Zane Wright", "Aria Scott", "Benjamin Green", "Chloe Adams", "Daniel Baker",
];

const emails = [
  "alice@example.com", "bob@example.com", "charlie@example.com", "diana@example.com",
  "eve@example.com", "frank@example.com", "grace@example.com", "henry@example.com",
  "ivy@example.com", "jack@example.com", "karen@example.com", "leo@example.com",
  "mia@example.com", "noah@example.com", "olivia@example.com", "peter@example.com",
  "quinn@example.com", "rachel@example.com", "sam@example.com", "tina@example.com",
  "uma@example.com", "victor@example.com", "wendy@example.com", "xavier@example.com",
  "yara@example.com", "zane@example.com", "aria@example.com", "ben@example.com",
  "chloe@example.com", "daniel@example.com",
];

const countries = ["US", "UK", "CA", "DE", "FR", "AU", "JP", "BR", "IN", "SG"];
const categories = ["ui", "performance", "feature", "bug", "praise"] as const;
const ticketCategories = ["billing", "technical", "account", "feature", "other"] as const;
const devices = ["Chrome 120 / macOS", "Safari 17 / iOS", "Chrome 119 / Windows", "Firefox 121 / Linux", "Edge 120 / Windows"];

export function generateTrendPoints(days: number): TrendPoint[] {
  return Array.from({ length: days }, (_, i) => ({
    date: format(subDays(new Date(), days - 1 - i), "MMM dd"),
    value: random(50, 500),
  }));
}

export function generateKpiTrend(): number[] {
  return Array.from({ length: 12 }, () => random(-15, 25));
}

export const KPI_DATA = {
  totalUsers: 28491,
  activeUsers: 18234,
  betaUsers: 3456,
  waitlistUsers: 2891,
  newUsersToday: 142,
  newUsersThisWeek: 987,
  newUsersThisMonth: 4231,
  workspaces: 8923,
  documents: 182934,
  aiRequestsToday: 45231,
  averageResponseTime: 342,
  mrr: 84750,
  arr: 1017000,
  activeSubscriptions: 4823,
  freeUsers: 18291,
  proUsers: 8234,
  enterpriseUsers: 1966,
  supportTickets: 47,
  errorRate: 0.32,
  apiHealth: 99.97,
  databaseHealth: 99.99,
  storageUsage: 2847,
};

export const TREND_DATA = {
  dailyUsers: generateTrendPoints(30),
  weeklyUsers: generateTrendPoints(12),
  monthlyUsers: generateTrendPoints(12),
  retention: Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, rate: random(60, 95) })),
  revenueGrowth: Array.from({ length: 12 }, (_, i) => ({ month: format(subDays(new Date(), 11 - i), "MMM"), value: random(40000, 100000) })),
  signups: Array.from({ length: 12 }, (_, i) => ({ month: format(subDays(new Date(), 11 - i), "MMM"), value: random(200, 800) })),
  workspaceGrowth: Array.from({ length: 12 }, (_, i) => ({ month: format(subDays(new Date(), 11 - i), "MMM"), value: random(50, 200) })),
  countries: [
    { name: "United States", value: 35 }, { name: "United Kingdom", value: 15 },
    { name: "Canada", value: 12 }, { name: "Germany", value: 10 },
    { name: "France", value: 8 }, { name: "Australia", value: 6 },
    { name: "Japan", value: 5 }, { name: "Brazil", value: 4 }, { name: "Other", value: 5 },
  ],
  trafficSources: [
    { name: "Organic", value: 42 }, { name: "Direct", value: 25 },
    { name: "Social", value: 15 }, { name: "Referral", value: 12 },
    { name: "Email", value: 6 },
  ],
  deviceTypes: [
    { name: "Desktop", value: 55 }, { name: "Mobile", value: 35 }, { name: "Tablet", value: 10 },
  ],
  browserUsage: [
    { name: "Chrome", value: 62 }, { name: "Safari", value: 18 },
    { name: "Firefox", value: 10 }, { name: "Edge", value: 7 }, { name: "Other", value: 3 },
  ],
  conversionFunnel: [
    { name: "Visited", value: 50000 }, { name: "Signed Up", value: 12000 },
    { name: "Onboarded", value: 8500 }, { name: "Active", value: 6200 },
    { name: "Paid", value: 2800 },
  ],
};

export const MOCK_USERS: AdminUser[] = names.slice(0, 25).map((name, i) => ({
  id: `usr-${String(i + 1).padStart(4, "0")}`,
  name,
  email: emails[i],
  role: i === 0 ? "owner" : i < 3 ? "admin" : i < 8 ? "member" : "viewer",
  plan: i < 3 ? "enterprise" : i < 10 ? "pro" : i < 18 ? "starter" : "free",
  workspace: `workspace-${String(random(1, 100)).padStart(3, "0")}`,
  avatarUrl: null,
  status: i % 7 === 0 ? "suspended" : i % 11 === 0 ? "invited" : "active",
  lastLogin: daysAgo(random(0, 30)),
  createdAt: daysAgo(random(30, 365)),
  country: countries[i % countries.length],
  aiRequestsMonth: random(0, 5000),
}));

export const MOCK_WORKSPACES: Workspace[] = Array.from({ length: 20 }, (_, i) => ({
  id: `ws-${String(i + 1).padStart(4, "0")}`,
  name: [
    "Acme Corp", "Globex Inc", "Initech", "Umbrella Corp", "Stark Industries",
    "Wayne Enterprises", "Cyberdyne Systems", "Wonka Industries", "Oscorp", "Massive Dynamic",
    "Hooli", "Pied Piper", "Dunder Mifflin", "Sterling Cooper", "Weyland-Yutani",
    "Tyrell Corp", "Soylent Corp", "Delos Inc", "Vault-Tec", "Aperture Science",
  ][i],
  owner: names[i],
  ownerEmail: emails[i],
  members: random(3, 150),
  storageUsedGb: random(1, 500),
  storageQuotaGb: 1000,
  documents: random(50, 5000),
  aiRequestsMonth: random(100, 10000),
  plan: ["free", "starter", "pro", "enterprise"][i % 4] as Workspace["plan"],
  status: i === 3 ? "suspended" : i === 7 ? "archived" : "active",
  createdAt: daysAgo(random(30, 400)),
  country: countries[i % countries.length],
}));

export const MOCK_WAITLIST: WaitlistEntry[] = Array.from({ length: 50 }, (_, i) => ({
  id: `wl-${String(i + 1).padStart(4, "0")}`,
  name: `Person ${i + 1}`,
  email: `person${i + 1}@example.com`,
  provider: ["google", "github", "email", "apple"][i % 4],
  country: countries[i % countries.length],
  joinedAt: daysAgo(random(1, 90)),
  referralCount: random(0, 12),
  status: (i < 20 ? "waiting" : i < 30 ? "invited" : i < 40 ? "accepted" : i < 45 ? "active" : "rejected") as WaitlistEntry["status"],
  position: i + 1,
  inviteSent: i >= 20,
  accepted: i >= 30,
}));

export const MOCK_SUBSCRIPTIONS: Subscription[] = Array.from({ length: 30 }, (_, i) => ({
  id: `sub-${String(i + 1).padStart(4, "0")}`,
  customer: names[i],
  email: emails[i],
  plan: ["free", "starter", "pro", "enterprise"][i % 4] as Subscription["plan"],
  status: i < 25 ? "active" : i < 28 ? "past_due" : "canceled",
  mrr: [0, 29, 99, 499][i % 4],
  startedAt: daysAgo(random(30, 365)),
  renewsAt: daysAgo(random(-30, 30)),
  paymentMethod: i % 3 === 0 ? "invoice" : i % 5 === 0 ? "trial" : "card",
}));

export const MOCK_PAYMENTS: Payment[] = Array.from({ length: 30 }, (_, i) => ({
  id: `pay-${String(i + 1).padStart(4, "0")}`,
  amount: random(1000, 50000),
  currency: "USD",
  customer: names[i],
  status: i < 25 ? "succeeded" : i < 28 ? "refunded" : i < 29 ? "failed" : "pending",
  method: ["card", "invoice", "bank"][i % 3] as Payment["method"],
  at: daysAgo(random(0, 60)),
}));

export const MOCK_FEATURE_FLAGS: FeatureFlag[] = [
  { id: "ff-001", key: "waitlist", name: "Waitlist", description: "Enable waitlist registration", enabled: true, rolloutPercent: 100, updatedAt: daysAgo(2), category: "growth" },
  { id: "ff-002", key: "registration", name: "Registration", description: "Allow new user registration", enabled: true, rolloutPercent: 100, updatedAt: daysAgo(5), category: "growth" },
  { id: "ff-003", key: "invite_only", name: "Invite Only", description: "Restrict signups to invites only", enabled: false, rolloutPercent: 0, updatedAt: daysAgo(10), category: "ops" },
  { id: "ff-004", key: "maintenance_mode", name: "Maintenance Mode", description: "Put platform in read-only mode", enabled: false, rolloutPercent: 0, updatedAt: daysAgo(1), category: "ops" },
  { id: "ff-005", key: "ai_assistant", name: "AI Assistant", description: "Enable AI chat assistant", enabled: true, rolloutPercent: 90, updatedAt: daysAgo(3), category: "platform" },
  { id: "ff-006", key: "calendar", name: "Calendar", description: "Enable calendar integration", enabled: true, rolloutPercent: 50, updatedAt: daysAgo(7), category: "experimental" },
  { id: "ff-007", key: "canvas", name: "Canvas", description: "Infinite canvas view", enabled: true, rolloutPercent: 75, updatedAt: daysAgo(4), category: "experimental" },
  { id: "ff-008", key: "offline_mode", name: "Offline Mode", description: "Offline editing support", enabled: false, rolloutPercent: 0, updatedAt: daysAgo(14), category: "platform" },
  { id: "ff-009", key: "voice_notes", name: "Voice Notes", description: "Voice recording and transcription", enabled: true, rolloutPercent: 40, updatedAt: daysAgo(6), category: "experimental" },
  { id: "ff-010", key: "public_api", name: "Public API", description: "REST API for external integrations", enabled: true, rolloutPercent: 30, updatedAt: daysAgo(8), category: "platform" },
  { id: "ff-011", key: "mcp", name: "MCP", description: "AI Model Context Protocol", enabled: false, rolloutPercent: 0, updatedAt: daysAgo(12), category: "experimental" },
  { id: "ff-012", key: "knowledge_graph", name: "Knowledge Graph", description: "Graph-based page relationships", enabled: true, rolloutPercent: 60, updatedAt: daysAgo(5), category: "platform" },
  { id: "ff-013", key: "workspace_templates", name: "Workspace Templates", description: "Pre-built workspace templates", enabled: true, rolloutPercent: 80, updatedAt: daysAgo(3), category: "growth" },
  { id: "ff-014", key: "realtime_collab", name: "Realtime Collaboration", description: "Multi-user real-time editing", enabled: true, rolloutPercent: 65, updatedAt: daysAgo(4), category: "platform" },
];

export const MOCK_AI_USAGE: AiUsageByDay[] = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(new Date(), 29 - i), "MMM dd"),
  requests: random(5000, 50000),
  tokens: random(1000000, 10000000),
  cost: random(50, 500),
}));

export const MOCK_AI_MODELS: AIModelUsage[] = [
  { model: "GPT-4o", provider: "OpenAI", requestsToday: 15234, requestsMonth: 423000, avgLatencyMs: 1200, avgTokens: 4567, costMonth: 8234, errorRate: 0.12, contextWindow: 128000 },
  { model: "GPT-4o-mini", provider: "OpenAI", requestsToday: 28912, requestsMonth: 834000, avgLatencyMs: 450, avgTokens: 1234, costMonth: 2345, errorRate: 0.05, contextWindow: 128000 },
  { model: "Claude 3.5 Sonnet", provider: "Anthropic", requestsToday: 8234, requestsMonth: 245000, avgLatencyMs: 980, avgTokens: 3890, costMonth: 5678, errorRate: 0.08, contextWindow: 200000 },
  { model: "Gemini 1.5 Pro", provider: "Google", requestsToday: 4567, requestsMonth: 134000, avgLatencyMs: 750, avgTokens: 3200, costMonth: 3456, errorRate: 0.15, contextWindow: 1000000 },
  { model: "DeepSeek V3", provider: "DeepSeek", requestsToday: 3456, requestsMonth: 98000, avgLatencyMs: 1100, avgTokens: 4100, costMonth: 1234, errorRate: 0.22, contextWindow: 65536 },
  { model: "Mistral Large", provider: "Mistral", requestsToday: 2345, requestsMonth: 67000, avgLatencyMs: 600, avgTokens: 2800, costMonth: 890, errorRate: 0.10, contextWindow: 128000 },
  { model: "OpenRouter (various)", provider: "OpenRouter", requestsToday: 1234, requestsMonth: 34000, avgLatencyMs: 1500, avgTokens: 3500, costMonth: 567, errorRate: 0.30, contextWindow: 128000 },
  { model: "Ollama (self-hosted)", provider: "Ollama", requestsToday: 567, requestsMonth: 12000, avgLatencyMs: 2500, avgTokens: 4000, costMonth: 0, errorRate: 0.45, contextWindow: 32768 },
];

export const MOCK_FEEDBACK: FeedbackItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `fb-${String(i + 1).padStart(4, "0")}`,
  user: names[i],
  email: emails[i],
  rating: random(2, 5),
  category: categories[i % categories.length],
  message: [
    "Love the AI features! Really helps with writing.",
    "App is a bit slow on mobile devices.",
    "Can we get dark mode support?",
    "The canvas view is amazing for brainstorming.",
    "Search functionality could be improved.",
    "Great for team collaboration!",
    "I found a bug with page sharing permissions.",
    "Would love to see integration with Jira.",
    "The editor is fantastic. Best Notion alternative!",
    "Please add more export options.",
    "Keyboard shortcuts are really helpful.",
    "The knowledge graph feature is mind-blowing.",
    "Pricing is a bit high for small teams.",
    "Realtime collaboration works great!",
    "AI suggestions are sometimes off-topic.",
  ][i % 15],
  status: ["new", "in_review", "planned", "shipped", "archived"][i % 5] as FeedbackItem["status"],
  at: daysAgo(random(0, 60)),
}));

export const MOCK_TICKETS: SupportTicket[] = Array.from({ length: 15 }, (_, i) => ({
  id: `tkt-${String(i + 1).padStart(4, "0")}`,
  subject: [
    "Cannot login to my account", "Billing issue with subscription",
    "Feature request: CSV export", "AI responses are very slow today",
    "Need help with workspace setup", "Payment failed unexpectedly",
    "How to invite team members?", "Data loss after sync issue",
    "API rate limiting too strict", "Account upgrade not reflecting",
    "Integration with Slack broken", "Mobile app crashes on startup",
    "Security concern with sharing", "Trial period questions",
    "Can't delete workspace",
  ][i],
  user: names[i],
  email: emails[i],
  category: ticketCategories[i % ticketCategories.length],
  priority: ["low", "medium", "high", "urgent"][i % 4] as SupportTicket["priority"],
  status: ["open", "in_progress", "pending", "resolved", "closed"][i % 5] as SupportTicket["status"],
  assignedTo: i % 3 === 0 ? "Aarav Patel" : null,
  replies: random(1, 12),
  lastUpdate: daysAgo(random(0, 14)),
}));

export const MOCK_CAMPAIGNS: EmailCampaign[] = [
  { id: "cmp-001", name: "Welcome Email", status: "sent", recipients: 12450, sent: 12450, openRate: 68.5, clickRate: 24.3, bounceRate: 1.2, scheduledFor: null, sentAt: daysAgo(3) },
  { id: "cmp-002", name: "Weekly Digest", status: "scheduled", recipients: 18200, sent: 0, openRate: 0, clickRate: 0, bounceRate: 0, scheduledFor: daysAgo(-2), sentAt: null },
  { id: "cmp-003", name: "Beta Invites Batch 1", status: "sending", recipients: 500, sent: 342, openRate: 72.1, clickRate: 45.6, bounceRate: 0.8, scheduledFor: null, sentAt: null },
  { id: "cmp-004", name: "Product Update v2.0", status: "sent", recipients: 15300, sent: 15300, openRate: 55.2, clickRate: 18.7, bounceRate: 2.1, scheduledFor: null, sentAt: daysAgo(10) },
  { id: "cmp-005", name: "Newsletter - July", status: "draft", recipients: 19500, sent: 0, openRate: 0, clickRate: 0, bounceRate: 0, scheduledFor: null, sentAt: null },
  { id: "cmp-006", name: "Feature Launch: Canvas", status: "scheduled", recipients: 16500, sent: 0, openRate: 0, clickRate: 0, bounceRate: 0, scheduledFor: daysAgo(-5), sentAt: null },
  { id: "cmp-007", name: "Churn Prevention", status: "draft", recipients: 340, sent: 0, openRate: 0, clickRate: 0, bounceRate: 0, scheduledFor: null, sentAt: null },
  { id: "cmp-008", name: "Enterprise Onboarding", status: "sent", recipients: 89, sent: 89, openRate: 92.4, clickRate: 78.2, bounceRate: 0, scheduledFor: null, sentAt: daysAgo(20) },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = Array.from({ length: 40 }, (_, i) => ({
  id: `log-${String(i + 1).padStart(4, "0")}`,
  admin: names[i % names.length],
  action: ["updated user role", "deleted workspace", "sent campaign", "modified flag", "viewed audit log", "changed settings", "suspended user", "invited admin", "exported data", "changed plan"][i % 10],
  target: `user/workspace-${String(random(1, 100))}`,
  ip: `192.168.${random(1, 255)}.${random(1, 255)}`,
  device: devices[i % devices.length],
  location: countries[i % countries.length],
  severity: i % 7 === 0 ? "critical" : i % 3 === 0 ? "warning" : "info",
  at: daysAgo(random(0, 14)),
}));

export const MOCK_ROADMAP: RoadmapItem[] = [
  { id: "road-001", title: "AI-Powered Search", description: "Semantic search across all workspace content", status: "in_progress", priority: "critical", progress: 75, eta: "Q3 2026", owner: "Mira Chen", dependencies: 2 },
  { id: "road-002", title: "Realtime Collaboration", description: "Multi-user real-time editing with cursors", status: "review", priority: "high", progress: 95, eta: "Q3 2026", owner: "Diego Martinez", dependencies: 1 },
  { id: "road-003", title: "Mobile App", description: "Native iOS and Android applications", status: "in_progress", priority: "high", progress: 45, eta: "Q4 2026", owner: "Mira Chen", dependencies: 3 },
  { id: "road-004", title: "API v2", description: "Public REST API with webhooks", status: "backlog", priority: "medium", progress: 10, eta: "Q1 2027", owner: "Diego Martinez", dependencies: 0 },
  { id: "road-005", title: "Enterprise SSO", description: "SAML/SSO for enterprise customers", status: "in_progress", priority: "high", progress: 60, eta: "Q3 2026", owner: "Yuki Tanaka", dependencies: 1 },
  { id: "road-006", title: "Offline Mode", description: "Full offline editing with sync", status: "backlog", priority: "medium", progress: 5, eta: "Q4 2026", owner: "Diego Martinez", dependencies: 4 },
  { id: "road-007", title: "Knowledge Graph", description: "Visual graph of page relationships", status: "shipped", priority: "high", progress: 100, eta: "Q2 2026", owner: "Aarav Patel", dependencies: 1 },
  { id: "road-008", title: "Template Marketplace", description: "Community-driven workspace templates", status: "review", priority: "medium", progress: 90, eta: "Q3 2026", owner: "Lena Brooks", dependencies: 0 },
  { id: "road-009", title: "Calendar Integration", description: "Google Calendar and Outlook sync", status: "in_progress", priority: "low", progress: 30, eta: "Q4 2026", owner: "Yuki Tanaka", dependencies: 2 },
  { id: "road-010", title: "AI Agent Platform", description: "Custom AI agents for automation", status: "backlog", priority: "critical", progress: 15, eta: "Q1 2027", owner: "Aarav Patel", dependencies: 3 },
];

export const MOCK_INTEGRATIONS: Integration[] = [
  { id: "int-001", name: "Supabase", description: "Database and authentication", category: "auth", status: "connected", lastSync: daysAgo(0) },
  { id: "int-002", name: "OpenRouter", description: "Multi-provider AI routing", category: "ai", status: "connected", lastSync: daysAgo(0) },
  { id: "int-003", name: "Resend", description: "Email delivery service", category: "analytics", status: "connected", lastSync: daysAgo(1) },
  { id: "int-004", name: "GitHub", description: "Code repository and auth", category: "auth", status: "connected", lastSync: daysAgo(2) },
  { id: "int-005", name: "Google OAuth", description: "Google sign-in integration", category: "auth", status: "connected", lastSync: daysAgo(0) },
  { id: "int-006", name: "Stripe", description: "Payment processing", category: "billing", status: "connected", lastSync: daysAgo(0) },
  { id: "int-007", name: "PostHog", description: "Product analytics", category: "analytics", status: "connected", lastSync: daysAgo(3) },
  { id: "int-008", name: "Sentry", description: "Error monitoring", category: "monitoring", status: "connected", lastSync: daysAgo(0) },
  { id: "int-009", name: "Vercel", description: "Deployment platform", category: "deployment", status: "connected", lastSync: daysAgo(1) },
];

export const MOCK_API_KEYS: ApiKey[] = [
  { id: "ak-001", name: "Production API", prefix: "nsk_prod", createdAt: daysAgo(120), lastUsed: daysAgo(0), expiresAt: null, scopes: ["read", "write", "admin"], usageThisMonth: 452301 },
  { id: "ak-002", name: "Staging API", prefix: "nsk_stag", createdAt: daysAgo(90), lastUsed: daysAgo(1), expiresAt: null, scopes: ["read", "write"], usageThisMonth: 89234 },
  { id: "ak-003", name: "Development", prefix: "nsk_dev", createdAt: daysAgo(60), lastUsed: daysAgo(2), expiresAt: null, scopes: ["read", "write", "admin"], usageThisMonth: 12034 },
  { id: "ak-004", name: "Mobile App", prefix: "nsk_mob", createdAt: daysAgo(30), lastUsed: daysAgo(0), expiresAt: daysAgo(335), scopes: ["read", "write"], usageThisMonth: 234567 },
  { id: "ak-005", name: "Analytics Service", prefix: "nsk_analytics", createdAt: daysAgo(45), lastUsed: daysAgo(5), expiresAt: null, scopes: ["read"], usageThisMonth: 56789 },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `notif-${String(i + 1).padStart(4, "0")}`,
  type: ["invitation", "error", "deployment", "billing", "feedback", "security"][i % 6] as NotificationItem["type"],
  title: [
    "New team joined workspace", "High error rate detected", "Deployment successful: v2.1.0",
    "Payment received from Acme Corp", "New feedback submitted", "Security audit completed",
    "User milestone: 50k users!", "Database failover completed", "New integration added",
    "Subscription upgraded to Enterprise", "Feature flag toggled", "Workspace limit reached",
  ][i],
  detail: [
    "Acme Corp invited 15 members.", "Error rate spiked to 2.3% in last 5 minutes.",
    "Production deployed commit a3f8c2d.", "$499 received for Enterprise plan.",
    "Rating: 5/5 - 'Amazing product!'", "All systems passed security review.",
    "Platform has reached 50,000 registered users.", "Secondary replica promoted successfully.",
    "Resend email service connected successfully.", "Stark Industries upgraded plan.",
    "Canvas feature enabled for all users.", "Workspace 'Design Team' reached 95% storage.",
  ][i],
  at: daysAgo(i),
  unread: i < 5,
  severity: i % 5 === 0 ? "critical" : i % 3 === 0 ? "warning" : "info",
}));

export const MOCK_SYSTEM_STATUS: SystemComponent[] = [
  { id: "sys-001", name: "CPU", status: "operational", value: 42, unit: "%", description: "Server CPU utilization" },
  { id: "sys-002", name: "Memory", status: "operational", value: 68, unit: "%", description: "RAM usage" },
  { id: "sys-003", name: "Database", status: "operational", value: 23, unit: "%", description: "Postgres connections" },
  { id: "sys-004", name: "Redis", status: "operational", value: 15, unit: "%", description: "Cache hit ratio" },
  { id: "sys-005", name: "Storage", status: "operational", value: 42, unit: "GB", description: "Used of 100GB" },
  { id: "sys-006", name: "API", status: "operational", value: 99.97, unit: "%", description: "Uptime (24h)" },
  { id: "sys-007", name: "Queue", status: "operational", value: 0, unit: "pending", description: "Background job queue" },
  { id: "sys-008", name: "Background Jobs", status: "operational", value: 12, unit: "active", description: "Running workers" },
  { id: "sys-009", name: "Cron Jobs", status: "operational", value: 8, unit: "of 10", description: "Healthy cron tasks" },
];

export const MOCK_HEALTH_SCORE = 96;

export const MOCK_TEAMS = Array.from({ length: 15 }, (_, i) => ({
  id: `team-${String(i + 1).padStart(4, "0")}`,
  name: ["Engineering", "Design", "Product", "Marketing", "Sales", "Support", "Data", "Security", "Growth", "Research", "Content", "Community", "Analytics", "Mobile", "Infrastructure"][i],
  members: random(3, 25),
  workspaces: random(1, 8),
  createdAt: daysAgo(random(30, 400)),
  lead: names[i],
}));
