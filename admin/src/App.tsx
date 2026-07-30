import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Shell } from "@/components/layout/Shell";
import { Dashboard } from "@/pages/Dashboard";
import { Analytics } from "@/pages/Analytics";
import { Waitlist } from "@/pages/Waitlist";
import { Users } from "@/pages/Users";
import { BannedUsers } from "@/pages/BannedUsers";
import { Workspaces } from "@/pages/Workspaces";
import { Teams } from "@/pages/Teams";
import { Subscriptions } from "@/pages/Subscriptions";
import { Payments } from "@/pages/Payments";
import { AiUsage } from "@/pages/AiUsage";
import { Models } from "@/pages/Models";
import { FeatureFlags } from "@/pages/FeatureFlags";
import { EmailCampaigns } from "@/pages/EmailCampaigns";
import { Feedback } from "@/pages/Feedback";
import { Support } from "@/pages/Support";
import { AuditLogs } from "@/pages/AuditLogs";
import { NotificationDetail } from "@/pages/NotificationDetail";
import { Roadmap } from "@/pages/Roadmap";
import { ChangelogEntries } from "@/pages/ChangelogEntries";
import { BlogPosts } from "@/pages/BlogPosts";
import { LegalPages } from "@/pages/LegalPages";
import { Broadcasts } from "@/pages/Broadcasts";
import { Integrations } from "@/pages/Integrations";
import { ApiKeys } from "@/pages/ApiKeys";
import { SystemStatus } from "@/pages/SystemStatus";
import { SystemHealth } from "@/pages/SystemHealth";
import { EmailAnalytics } from "@/pages/EmailAnalytics";
import { Settings } from "@/pages/Settings";
import { AdminAccounts } from "@/pages/AdminAccounts";
import { Webhooks } from "@/pages/Webhooks";
import { Forbidden } from "@/pages/Forbidden";
import { Login } from "@/pages/Login";
import { Loader2 } from "lucide-react";

const MonitoringOverview = lazy(() => import("@/pages/monitoring/Overview").then((m) => ({ default: m.MonitoringOverview })));
const MonitoringErrors = lazy(() => import("@/pages/monitoring/Errors").then((m) => ({ default: m.MonitoringErrors })));
const MonitoringPerformance = lazy(() => import("@/pages/monitoring/Performance").then((m) => ({ default: m.MonitoringPerformance })));
const MonitoringSessions = lazy(() => import("@/pages/monitoring/Sessions").then((m) => ({ default: m.MonitoringSessions })));
const MonitoringInfrastructure = lazy(() => import("@/pages/monitoring/Infrastructure").then((m) => ({ default: m.MonitoringInfrastructure })));
const MonitoringEmailHealth = lazy(() => import("@/pages/monitoring/EmailHealth").then((m) => ({ default: m.MonitoringEmailHealth })));
const MonitoringDeployments = lazy(() => import("@/pages/monitoring/Deployments").then((m) => ({ default: m.MonitoringDeployments })));
const MonitoringLogs = lazy(() => import("@/pages/monitoring/Logs").then((m) => ({ default: m.MonitoringLogs })));
const MonitoringIntegrations = lazy(() => import("@/pages/monitoring/Integrations").then((m) => ({ default: m.MonitoringIntegrations })));
const NotificationCenter = lazy(() => import("@/pages/NotificationCenter").then((m) => ({ default: m.NotificationCenter })));

const LaunchControl = lazy(() => import("@/pages/LaunchControl").then((m) => ({ default: m.LaunchControl })));
const Referrals = lazy(() => import("@/pages/Referrals").then((m) => ({ default: m.Referrals })));
const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const CTAManager = lazy(() => import("@/pages/CTAManager").then((m) => ({ default: m.CTAManager })));
const AnnouncementBar = lazy(() => import("@/pages/AnnouncementBar").then((m) => ({ default: m.AnnouncementBarPage })));
const WaitlistSettings = lazy(() => import("@/pages/WaitlistSettings").then((m) => ({ default: m.WaitlistSettingsPage })));
const SEOSettings = lazy(() => import("@/pages/SEOSettings").then((m) => ({ default: m.SEOSettingsPage })));
const SocialLinks = lazy(() => import("@/pages/SocialLinks").then((m) => ({ default: m.SocialLinksPage })));
const DemoRequests = lazy(() => import("@/pages/DemoRequests").then((m) => ({ default: m.DemoRequests })));
const ContentPages = lazy(() => import("@/pages/ContentPages").then((m) => ({ default: m.ContentPages })));
const ContentFiles = lazy(() => import("@/pages/ContentFiles").then((m) => ({ default: m.ContentFiles })));
const ContentTemplates = lazy(() => import("@/pages/ContentTemplates").then((m) => ({ default: m.ContentTemplates })));
const SentryHub = lazy(() => import("@/pages/Sentry").then((m) => ({ default: m.Sentry })));
const PostHogHub = lazy(() => import("@/pages/PostHog").then((m) => ({ default: m.PostHog })));
const Trash = lazy(() => import("@/pages/Trash").then((m) => ({ default: m.Trash })));
const AudienceManager = lazy(() => import("@/pages/AudienceManager").then((m) => ({ default: m.AudienceManager })));
const BrandSettings = lazy(() => import("@/pages/BrandSettings").then((m) => ({ default: m.BrandSettings })));
const EmailDashboard = lazy(() => import("@/pages/EmailDashboard").then((m) => ({ default: m.EmailDashboard })));
const EmailHistory = lazy(() => import("@/pages/EmailHistory").then((m) => ({ default: m.EmailHistory })));
const EmailTemplateEditor = lazy(() => import("@/pages/EmailTemplateEditor").then((m) => ({ default: m.EmailTemplateEditor })));
const EmailTemplates = lazy(() => import("@/pages/EmailTemplates").then((m) => ({ default: m.EmailTemplates })));
const ScheduledEmails = lazy(() => import("@/pages/ScheduledEmails").then((m) => ({ default: m.ScheduledEmails })));
const SegmentsPage = lazy(() => import("@/pages/Segments").then((m) => ({ default: m.Segments })));
const Subscribers = lazy(() => import("@/pages/Subscribers").then((m) => ({ default: m.Subscribers })));
const TransactionalEmails = lazy(() => import("@/pages/TransactionalEmails").then((m) => ({ default: m.TransactionalEmails })));
const WaitlistAnalyticsPage = lazy(() => import("@/pages/WaitlistAnalyticsPage").then((m) => ({ default: m.default })));
const PerfDashboard = lazy(() => import("@/pages/PerfDashboard").then((m) => ({ default: m.default })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/control">
        <AuthProvider>
          <AuthGate>
            <TooltipProvider delayDuration={200}>
              <Routes>
                <Route element={<Shell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="waitlist" element={<Waitlist />} />
                  <Route path="users" element={<Users />} />
                  <Route path="banned-users" element={<BannedUsers />} />
                  <Route path="workspaces" element={<Workspaces />} />
                  <Route path="teams" element={<Teams />} />
                  <Route path="subscriptions" element={<Subscriptions />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="ai-usage" element={<AiUsage />} />
                  <Route path="models" element={<Models />} />
                  <Route path="feature-flags" element={<FeatureFlags />} />
                  <Route path="email-campaigns" element={<EmailCampaigns />} />
                  <Route path="notifications" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><NotificationCenter /></Suspense>} />
                  <Route path="notifications/:id" element={<NotificationDetail />} />
                  <Route path="feedback" element={<Feedback />} />
                  <Route path="support" element={<Support />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="roadmap" element={<Roadmap />} />
                  <Route path="changelog" element={<ChangelogEntries />} />
                  <Route path="blog" element={<BlogPosts />} />
                  <Route path="legal" element={<LegalPages />} />
                  <Route path="broadcasts" element={<Broadcasts />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="api-keys" element={<ApiKeys />} />
                  <Route path="system-status" element={<SystemStatus />} />
                  <Route path="system-health" element={<SystemHealth />} />
                  <Route path="email-analytics" element={<EmailAnalytics />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="admin-accounts" element={<AdminAccounts />} />
                  <Route path="webhooks" element={<Webhooks />} />
                  <Route path="launch-control" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><LaunchControl /></Suspense>} />
                  <Route path="referrals" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><Referrals /></Suspense>} />
                  <Route path="landing-page" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><LandingPage /></Suspense>} />
                  <Route path="cta-manager" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><CTAManager /></Suspense>} />
                  <Route path="announcement-bar" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><AnnouncementBar /></Suspense>} />
                  <Route path="waitlist-settings" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><WaitlistSettings /></Suspense>} />
                  <Route path="seo-settings" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><SEOSettings /></Suspense>} />
                  <Route path="social-links" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><SocialLinks /></Suspense>} />
                  <Route path="demo-requests" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><DemoRequests /></Suspense>} />
                  <Route path="content/pages" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><ContentPages /></Suspense>} />
                  <Route path="content/files" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><ContentFiles /></Suspense>} />
                  <Route path="content/templates" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><ContentTemplates /></Suspense>} />
                  <Route path="sentry" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><SentryHub /></Suspense>} />
                  <Route path="posthog" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><PostHogHub /></Suspense>} />
                  <Route path="trash" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><Trash /></Suspense>} />
                  <Route path="audience-manager" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><AudienceManager /></Suspense>} />
                  <Route path="brand-settings" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><BrandSettings /></Suspense>} />
                  <Route path="email-dashboard" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailDashboard /></Suspense>} />
                  <Route path="email-history" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailHistory /></Suspense>} />
                  <Route path="email-template-editor" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailTemplateEditor /></Suspense>} />
                  <Route path="email-templates" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailTemplates /></Suspense>} />
                  <Route path="scheduled-emails" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><ScheduledEmails /></Suspense>} />
                  <Route path="segments" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><SegmentsPage /></Suspense>} />
                  <Route path="subscribers" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><Subscribers /></Suspense>} />
                  <Route path="transactional-emails" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><TransactionalEmails /></Suspense>} />
                  <Route path="waitlist-analytics" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><WaitlistAnalyticsPage /></Suspense>} />
                  <Route path="perf-dashboard" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><PerfDashboard /></Suspense>} />
                  <Route path="monitoring/overview" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringOverview /></Suspense>} />
                  <Route path="monitoring/errors" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringErrors /></Suspense>} />
                  <Route path="monitoring/performance" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringPerformance /></Suspense>} />
                  <Route path="monitoring/sessions" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringSessions /></Suspense>} />
                  <Route path="monitoring/infrastructure" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringInfrastructure /></Suspense>} />
                  <Route path="monitoring/email-health" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringEmailHealth /></Suspense>} />
                  <Route path="monitoring/deployments" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringDeployments /></Suspense>} />
                  <Route path="monitoring/logs" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringLogs /></Suspense>} />
                  <Route path="monitoring/integrations" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><MonitoringIntegrations /></Suspense>} />
                </Route>
                <Route path="/403" element={<Forbidden />} />
                <Route path="*" element={<Forbidden />} />
              </Routes>
              <Toaster position="bottom-right" toastOptions={{
                style: { borderRadius: "10px", background: "hsl(var(--background))", color: "hsl(var(--foreground))", border: "1px solid hsl(var(--border))" },
              }} />
            </TooltipProvider>
          </AuthGate>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
