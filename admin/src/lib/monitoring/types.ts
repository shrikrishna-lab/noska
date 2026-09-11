export interface SentryError {
  id: string;
  title: string;
  count: number;
  users: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  environment: string;
  release: string;
  level: "fatal" | "error" | "warning" | "info";
  platform: string;
  status: "unresolved" | "resolved" | "ignored";
}

export interface PerformanceMetric {
  // Core Web Vitals from PostHog $web_vitals events, p75 (Google's
  // assessment percentile) in ms — CLS is unitless.
  lcp: number;
  cls: number;
  fcp: number;
  inp: number;
  ttfb: number;
  vitalsSamples: number;
  // Real traffic/activity counters — no synthetic latency derivations.
  pageviews24h: number;
  realtimeConnections: number;
  pageVersions24h: number;
  largestSnapshot: string;
  // Real PostHog failure surfaced to the UI; null when PostHog responded.
  posthogError: string | null;
}

export interface ConnectorStat {
  id: string;
  name: string;
  category: string;
  activeConnections: number;
  totalConnections: number;
  lastConnectedAt: string | null;
  inCatalog: boolean;
}

export interface PerformancePoint {
  timestamp: string;
  value: number;
}

export interface SessionData {
  liveUsers: number;
  todaySessions: number;
  returningUsers: number;
  retention: number;
  bounceRate: number;
  avgSessionDuration: number;
  replayCount: number;
  topPages: Array<{ path: string; views: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
}

export interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  latency: number;
  health: number;
  lastIncident: string | null;
  version: string;
}

export interface EmailMetric {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  bounced: number;
  complaint: number;
  spam: number;
}

export interface RecentEmail {
  id: string;
  to: string;
  subject: string;
  status: "delivered" | "opened" | "clicked" | "bounced" | "failed";
  sentAt: string;
}

export interface EmailCampaignMetric {
  id: string;
  name: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  sentAt: string;
}

export interface Deployment {
  id: string;
  name: string;
  version: string;
  commitSha: string;
  branch: string;
  commitMessage: string;
  author: string;
  status: "ready" | "building" | "error" | "canceled";
  deployedAt: string;
  previousDeployments: number;
  rollbackAvailable: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info" | "debug";
  source: "application" | "edge_function" | "webhook" | "email" | "audit" | "auth";
  message: string;
  detail?: string;
}

export interface IntegrationStatus {
  name: string;
  configured: boolean;
  environment: string;
  lastSync: string | null;
  lastError: string | null;
  dashboardUrl: string;
}

export interface OverviewMetrics {
  systemStatus: "healthy" | "degraded" | "critical";
  usersOnline: number;
  todayUsers: number;
  workspaces: number;
  pages: number;
  aiRequests: number;
  errorsToday: number;
  errorsCritical: number;
  errorsHigh: number;
  errorsMedium: number;
  errorsLow: number;
  emailsDelivered: number;
  pageviews24h: number;
  storageUsed: string;
  storageBytes: number;
  databaseStatus: "healthy" | "degraded" | "critical";
  currentVersion: string;
  environment: string;
  realtimeStatus: "connected" | "disconnected" | "error";
  supabaseStatus: "operational" | "degraded" | "outage" | "unknown";
  clerkStatus: "operational" | "degraded" | "outage" | "unknown";
  resendStatus: "operational" | "degraded" | "outage" | "unknown";
  sentryStatus: "operational" | "degraded" | "outage" | "unknown";
  posthogStatus: "operational" | "degraded" | "outage" | "unknown";
}
