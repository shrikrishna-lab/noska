import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryCache, MutationCache, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogProvider } from "@/components/ui/ConfirmationDialog";
import { AuthProvider, useAuth } from "@/lib/auth";
import { isUnauthorizedError, triggerSessionExpired } from "@/lib/session-expired";
import { Shell } from "@/components/layout/Shell";
import { Dashboard } from "@/pages/Dashboard";
import { Analytics } from "@/pages/Analytics";
import { Waitlist } from "@/pages/Waitlist";
import WaitlistAnalyticsPage from "@/pages/WaitlistAnalyticsPage";
import { Users } from "@/pages/Users";
import { BannedUsers } from "@/pages/BannedUsers";
import { Trash } from "@/pages/Trash";
import { Workspaces } from "@/pages/Workspaces";
import { Teams } from "@/pages/Teams";
import { Subscriptions } from "@/pages/Subscriptions";
import { Payments } from "@/pages/Payments";
import { AiUsage } from "@/pages/AiUsage";
import { Models } from "@/pages/Models";
import { FeatureFlags } from "@/pages/FeatureFlags";
import { EmailCampaigns } from "@/pages/EmailCampaigns";
import { Referrals } from "@/pages/Referrals";
import { LaunchControl } from "@/pages/LaunchControl";
import { LandingPage } from "@/pages/LandingPage";
import { CTAManager } from "@/pages/CTAManager";
import { AnnouncementBarPage } from "@/pages/AnnouncementBar";
import { WaitlistSettingsPage } from "@/pages/WaitlistSettings";
import { SEOSettingsPage } from "@/pages/SEOSettings";
import { SocialLinksPage } from "@/pages/SocialLinks";
import { DemoRequests } from "@/pages/DemoRequests";

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
import { ContentPages } from "@/pages/ContentPages";
import { ContentFiles } from "@/pages/ContentFiles";
import { ContentTemplates } from "@/pages/ContentTemplates";
import { Sentry } from "@/pages/Sentry";
import { PostHog } from "@/pages/PostHog";
import { MonitoringHub } from "@/pages/MonitoringHub";
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
const EmailDashboard = lazy(() => import("@/pages/EmailDashboard").then((m) => ({ default: m.EmailDashboard })));
const EmailTemplates = lazy(() => import("@/pages/EmailTemplates").then((m) => ({ default: m.EmailTemplates })));
const EmailTemplateEditor = lazy(() => import("@/pages/EmailTemplateEditor").then((m) => ({ default: m.EmailTemplateEditor })));
const TransactionalEmails = lazy(() => import("@/pages/TransactionalEmails").then((m) => ({ default: m.TransactionalEmails })));
const AudienceManager = lazy(() => import("@/pages/AudienceManager").then((m) => ({ default: m.AudienceManager })));
const Subscribers = lazy(() => import("@/pages/Subscribers").then((m) => ({ default: m.Subscribers })));
const Segments = lazy(() => import("@/pages/Segments").then((m) => ({ default: m.Segments })));
const ScheduledEmails = lazy(() => import("@/pages/ScheduledEmails").then((m) => ({ default: m.ScheduledEmails })));
const BrandSettings = lazy(() => import("@/pages/BrandSettings").then((m) => ({ default: m.BrandSettings })));
const EmailHistory = lazy(() => import("@/pages/EmailHistory").then((m) => ({ default: m.EmailHistory })));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  queryCache: new QueryCache({
    onError: (err) => {
      // Defense in depth: if the fetch wrapper somehow missed it,
      // catch the same signature here when it's thrown into React Query.
      if (isUnauthorizedError(err)) {
        triggerSessionExpired(
          err instanceof Error ? err.message : "UNAUTHORIZED",
          "react-query",
        );
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (isUnauthorizedError(err)) {
        triggerSessionExpired(
          err instanceof Error ? err.message : "UNAUTHORIZED",
          "react-query",
        );
      }
    },
  }),
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
            <AuthProvider queryClient={queryClient}>
          <AuthGate>
            <TooltipProvider delayDuration={200}>
              <DialogProvider>
              <Routes>
                <Route element={<Shell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="waitlist" element={<Waitlist />} />
                  <Route path="users" element={<Users />} />
                  <Route path="banned-users" element={<BannedUsers />} />
                  <Route path="trash" element={<Trash />} />
                  <Route path="workspaces" element={<Workspaces />} />
                  <Route path="teams" element={<Teams />} />
                  <Route path="subscriptions" element={<Subscriptions />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="ai-usage" element={<AiUsage />} />
                  <Route path="models" element={<Models />} />
                  <Route path="launch-control" element={<LaunchControl />} />
                  <Route path="landing-page" element={<LandingPage />} />
                  <Route path="cta-buttons" element={<CTAManager />} />
                  <Route path="announcement-bar" element={<AnnouncementBarPage />} />
                  <Route path="waitlist-analytics" element={<WaitlistAnalyticsPage />} />
                  <Route path="waitlist-settings" element={<WaitlistSettingsPage />} />
                  <Route path="demo-requests" element={<DemoRequests />} />
                  <Route path="seo-settings" element={<SEOSettingsPage />} />
                  <Route path="social-links" element={<SocialLinksPage />} />
                  <Route path="pages" element={<ContentPages />} />
                  <Route path="files" element={<ContentFiles />} />
                  <Route path="templates" element={<ContentTemplates />} />
                  <Route path="feature-flags" element={<FeatureFlags />} />
                  <Route path="email-dashboard" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailDashboard /></Suspense>} />
                  <Route path="email-templates" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailTemplates /></Suspense>} />
                  <Route path="email-templates/:id/edit" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailTemplateEditor /></Suspense>} />
                  <Route path="email-campaigns" element={<EmailCampaigns />} />
                  <Route path="transactional-emails" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><TransactionalEmails /></Suspense>} />
                  <Route path="audience-manager" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><AudienceManager /></Suspense>} />
                  <Route path="subscribers" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><Subscribers /></Suspense>} />
                  <Route path="segments" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><Segments /></Suspense>} />
                  <Route path="scheduled-emails" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><ScheduledEmails /></Suspense>} />
                  <Route path="email-analytics" element={<EmailAnalytics />} />
                  <Route path="brand-settings" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><BrandSettings /></Suspense>} />
                  <Route path="email-history" element={<Suspense fallback={<div className="p-6"><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" /></div>}><EmailHistory /></Suspense>} />
                  <Route path="referrals" element={<Referrals />} />
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
                  <Route path="sentry" element={<Sentry />} />
                  <Route path="posthog" element={<PostHog />} />
                  <Route path="monitoring" element={<MonitoringHub />} />
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
              </DialogProvider>
              <Toaster
                position="bottom-right"
                containerClassName="noska-toaster"
                toastOptions={{
                  duration: 4500,
                  style: {
                    /* Strip default padding/bg/shadow — our noska-toast-card handles all of that */
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                  },
                  /* Disable built-in success/error icons (cards render their own) */
                  success: { iconTheme: { primary: "transparent", secondary: "transparent" } },
                  error: { iconTheme: { primary: "transparent", secondary: "transparent" } },
                }}
              />
            </TooltipProvider>
          </AuthGate>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
