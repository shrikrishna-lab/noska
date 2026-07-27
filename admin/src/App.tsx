import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryCache, MutationCache, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DialogProvider } from "@/components/ui/ConfirmationDialog";
import { AuthProvider, useAuth } from "@/lib/auth";
import { isUnauthorizedError, triggerSessionExpired } from "@/lib/session-expired";
import { Shell } from "@/components/layout/Shell";
import { Dashboard } from "@/pages/Dashboard";
import { Forbidden } from "@/pages/Forbidden";
import { Login } from "@/pages/Login";
import { Loader2 } from "lucide-react";

const Analytics = lazy(() => import("@/pages/Analytics").then((m) => ({ default: m.Analytics })));
const Waitlist = lazy(() => import("@/pages/Waitlist").then((m) => ({ default: m.Waitlist })));
const WaitlistAnalyticsPage = lazy(() => import("@/pages/WaitlistAnalyticsPage"));
const Users = lazy(() => import("@/pages/Users").then((m) => ({ default: m.Users })));
const BannedUsers = lazy(() => import("@/pages/BannedUsers").then((m) => ({ default: m.BannedUsers })));
const Trash = lazy(() => import("@/pages/Trash").then((m) => ({ default: m.Trash })));
const Workspaces = lazy(() => import("@/pages/Workspaces").then((m) => ({ default: m.Workspaces })));
const Teams = lazy(() => import("@/pages/Teams").then((m) => ({ default: m.Teams })));
const Subscriptions = lazy(() => import("@/pages/Subscriptions").then((m) => ({ default: m.Subscriptions })));
const Payments = lazy(() => import("@/pages/Payments").then((m) => ({ default: m.Payments })));
const AiUsage = lazy(() => import("@/pages/AiUsage").then((m) => ({ default: m.AiUsage })));
const Models = lazy(() => import("@/pages/Models").then((m) => ({ default: m.Models })));
const FeatureFlags = lazy(() => import("@/pages/FeatureFlags").then((m) => ({ default: m.FeatureFlags })));
const EmailCampaigns = lazy(() => import("@/pages/EmailCampaigns").then((m) => ({ default: m.EmailCampaigns })));
const Referrals = lazy(() => import("@/pages/Referrals").then((m) => ({ default: m.Referrals })));
const LaunchControl = lazy(() => import("@/pages/LaunchControl").then((m) => ({ default: m.LaunchControl })));
const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const CTAManager = lazy(() => import("@/pages/CTAManager").then((m) => ({ default: m.CTAManager })));
const AnnouncementBarPage = lazy(() => import("@/pages/AnnouncementBar").then((m) => ({ default: m.AnnouncementBarPage })));
const WaitlistSettingsPage = lazy(() => import("@/pages/WaitlistSettings").then((m) => ({ default: m.WaitlistSettingsPage })));
const SEOSettingsPage = lazy(() => import("@/pages/SEOSettings").then((m) => ({ default: m.SEOSettingsPage })));
const SocialLinksPage = lazy(() => import("@/pages/SocialLinks").then((m) => ({ default: m.SocialLinksPage })));
const DemoRequests = lazy(() => import("@/pages/DemoRequests").then((m) => ({ default: m.DemoRequests })));
const Feedback = lazy(() => import("@/pages/Feedback").then((m) => ({ default: m.Feedback })));
const Support = lazy(() => import("@/pages/Support").then((m) => ({ default: m.Support })));
const AuditLogs = lazy(() => import("@/pages/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const NotificationDetail = lazy(() => import("@/pages/NotificationDetail").then((m) => ({ default: m.NotificationDetail })));
const Roadmap = lazy(() => import("@/pages/Roadmap").then((m) => ({ default: m.Roadmap })));
const ChangelogEntries = lazy(() => import("@/pages/ChangelogEntries").then((m) => ({ default: m.ChangelogEntries })));
const BlogPosts = lazy(() => import("@/pages/BlogPosts").then((m) => ({ default: m.BlogPosts })));
const LegalPages = lazy(() => import("@/pages/LegalPages").then((m) => ({ default: m.LegalPages })));
const Broadcasts = lazy(() => import("@/pages/Broadcasts").then((m) => ({ default: m.Broadcasts })));
const Integrations = lazy(() => import("@/pages/Integrations").then((m) => ({ default: m.Integrations })));
const ApiKeys = lazy(() => import("@/pages/ApiKeys").then((m) => ({ default: m.ApiKeys })));
const SystemStatus = lazy(() => import("@/pages/SystemStatus").then((m) => ({ default: m.SystemStatus })));
const SystemHealth = lazy(() => import("@/pages/SystemHealth").then((m) => ({ default: m.SystemHealth })));
const EmailAnalytics = lazy(() => import("@/pages/EmailAnalytics").then((m) => ({ default: m.EmailAnalytics })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const AdminAccounts = lazy(() => import("@/pages/AdminAccounts").then((m) => ({ default: m.AdminAccounts })));
const Webhooks = lazy(() => import("@/pages/Webhooks").then((m) => ({ default: m.Webhooks })));
const ContentPages = lazy(() => import("@/pages/ContentPages").then((m) => ({ default: m.ContentPages })));
const ContentFiles = lazy(() => import("@/pages/ContentFiles").then((m) => ({ default: m.ContentFiles })));
const ContentTemplates = lazy(() => import("@/pages/ContentTemplates").then((m) => ({ default: m.ContentTemplates })));
const Sentry = lazy(() => import("@/pages/Sentry").then((m) => ({ default: m.Sentry })));
const PostHog = lazy(() => import("@/pages/PostHog").then((m) => ({ default: m.PostHog })));
const MonitoringHub = lazy(() => import("@/pages/MonitoringHub").then((m) => ({ default: m.MonitoringHub })));

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
const PerfDashboard = lazy(() => import("@/pages/PerfDashboard"));

const PageLoading = () => (
  <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60000, gcTime: 300000, retry: 1 } },
  queryCache: new QueryCache({
    onError: (err) => {
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
                <ErrorBoundary>
                <Routes>
                  <Route element={<Shell />}>
                    <Route index element={<Dashboard />} />
                    <Route path="analytics" element={<Suspense fallback={<PageLoading />}><Analytics /></Suspense>} />
                    <Route path="waitlist" element={<Suspense fallback={<PageLoading />}><Waitlist /></Suspense>} />
                    <Route path="users" element={<Suspense fallback={<PageLoading />}><Users /></Suspense>} />
                    <Route path="banned-users" element={<Suspense fallback={<PageLoading />}><BannedUsers /></Suspense>} />
                    <Route path="trash" element={<Suspense fallback={<PageLoading />}><Trash /></Suspense>} />
                    <Route path="workspaces" element={<Suspense fallback={<PageLoading />}><Workspaces /></Suspense>} />
                    <Route path="teams" element={<Suspense fallback={<PageLoading />}><Teams /></Suspense>} />
                    <Route path="subscriptions" element={<Suspense fallback={<PageLoading />}><Subscriptions /></Suspense>} />
                    <Route path="payments" element={<Suspense fallback={<PageLoading />}><Payments /></Suspense>} />
                    <Route path="ai-usage" element={<Suspense fallback={<PageLoading />}><AiUsage /></Suspense>} />
                    <Route path="models" element={<Suspense fallback={<PageLoading />}><Models /></Suspense>} />
                    <Route path="launch-control" element={<Suspense fallback={<PageLoading />}><LaunchControl /></Suspense>} />
                    <Route path="landing-page" element={<Suspense fallback={<PageLoading />}><LandingPage /></Suspense>} />
                    <Route path="cta-buttons" element={<Suspense fallback={<PageLoading />}><CTAManager /></Suspense>} />
                    <Route path="announcement-bar" element={<Suspense fallback={<PageLoading />}><AnnouncementBarPage /></Suspense>} />
                    <Route path="waitlist-analytics" element={<Suspense fallback={<PageLoading />}><WaitlistAnalyticsPage /></Suspense>} />
                    <Route path="waitlist-settings" element={<Suspense fallback={<PageLoading />}><WaitlistSettingsPage /></Suspense>} />
                    <Route path="demo-requests" element={<Suspense fallback={<PageLoading />}><DemoRequests /></Suspense>} />
                    <Route path="seo-settings" element={<Suspense fallback={<PageLoading />}><SEOSettingsPage /></Suspense>} />
                    <Route path="social-links" element={<Suspense fallback={<PageLoading />}><SocialLinksPage /></Suspense>} />
                    <Route path="pages" element={<Suspense fallback={<PageLoading />}><ContentPages /></Suspense>} />
                    <Route path="files" element={<Suspense fallback={<PageLoading />}><ContentFiles /></Suspense>} />
                    <Route path="templates" element={<Suspense fallback={<PageLoading />}><ContentTemplates /></Suspense>} />
                    <Route path="feature-flags" element={<Suspense fallback={<PageLoading />}><FeatureFlags /></Suspense>} />
                    <Route path="email-dashboard" element={<Suspense fallback={<PageLoading />}><EmailDashboard /></Suspense>} />
                    <Route path="email-templates" element={<Suspense fallback={<PageLoading />}><EmailTemplates /></Suspense>} />
                    <Route path="email-templates/:id/edit" element={<Suspense fallback={<PageLoading />}><EmailTemplateEditor /></Suspense>} />
                    <Route path="email-campaigns" element={<Suspense fallback={<PageLoading />}><EmailCampaigns /></Suspense>} />
                    <Route path="transactional-emails" element={<Suspense fallback={<PageLoading />}><TransactionalEmails /></Suspense>} />
                    <Route path="audience-manager" element={<Suspense fallback={<PageLoading />}><AudienceManager /></Suspense>} />
                    <Route path="subscribers" element={<Suspense fallback={<PageLoading />}><Subscribers /></Suspense>} />
                    <Route path="segments" element={<Suspense fallback={<PageLoading />}><Segments /></Suspense>} />
                    <Route path="scheduled-emails" element={<Suspense fallback={<PageLoading />}><ScheduledEmails /></Suspense>} />
                    <Route path="email-analytics" element={<Suspense fallback={<PageLoading />}><EmailAnalytics /></Suspense>} />
                    <Route path="brand-settings" element={<Suspense fallback={<PageLoading />}><BrandSettings /></Suspense>} />
                    <Route path="email-history" element={<Suspense fallback={<PageLoading />}><EmailHistory /></Suspense>} />
                    <Route path="referrals" element={<Suspense fallback={<PageLoading />}><Referrals /></Suspense>} />
                    <Route path="notifications" element={<Suspense fallback={<PageLoading />}><NotificationCenter /></Suspense>} />
                    <Route path="notifications/:id" element={<Suspense fallback={<PageLoading />}><NotificationDetail /></Suspense>} />
                    <Route path="feedback" element={<Suspense fallback={<PageLoading />}><Feedback /></Suspense>} />
                    <Route path="support" element={<Suspense fallback={<PageLoading />}><Support /></Suspense>} />
                    <Route path="audit-logs" element={<Suspense fallback={<PageLoading />}><AuditLogs /></Suspense>} />
                    <Route path="roadmap" element={<Suspense fallback={<PageLoading />}><Roadmap /></Suspense>} />
                    <Route path="changelog" element={<Suspense fallback={<PageLoading />}><ChangelogEntries /></Suspense>} />
                    <Route path="blog" element={<Suspense fallback={<PageLoading />}><BlogPosts /></Suspense>} />
                    <Route path="legal" element={<Suspense fallback={<PageLoading />}><LegalPages /></Suspense>} />
                    <Route path="broadcasts" element={<Suspense fallback={<PageLoading />}><Broadcasts /></Suspense>} />
                    <Route path="integrations" element={<Suspense fallback={<PageLoading />}><Integrations /></Suspense>} />
                    <Route path="api-keys" element={<Suspense fallback={<PageLoading />}><ApiKeys /></Suspense>} />
                    <Route path="system-status" element={<Suspense fallback={<PageLoading />}><SystemStatus /></Suspense>} />
                    <Route path="system-health" element={<Suspense fallback={<PageLoading />}><SystemHealth /></Suspense>} />
                    <Route path="settings" element={<Suspense fallback={<PageLoading />}><Settings /></Suspense>} />
                    <Route path="admin-accounts" element={<Suspense fallback={<PageLoading />}><AdminAccounts /></Suspense>} />
                    <Route path="webhooks" element={<Suspense fallback={<PageLoading />}><Webhooks /></Suspense>} />
                    <Route path="sentry" element={<Suspense fallback={<PageLoading />}><Sentry /></Suspense>} />
                    <Route path="posthog" element={<Suspense fallback={<PageLoading />}><PostHog /></Suspense>} />
                    <Route path="monitoring" element={<Suspense fallback={<PageLoading />}><MonitoringHub /></Suspense>} />
                    <Route path="monitoring/overview" element={<Suspense fallback={<PageLoading />}><MonitoringOverview /></Suspense>} />
                    <Route path="monitoring/errors" element={<Suspense fallback={<PageLoading />}><MonitoringErrors /></Suspense>} />
                    <Route path="monitoring/performance" element={<Suspense fallback={<PageLoading />}><MonitoringPerformance /></Suspense>} />
                    <Route path="monitoring/sessions" element={<Suspense fallback={<PageLoading />}><MonitoringSessions /></Suspense>} />
                    <Route path="monitoring/infrastructure" element={<Suspense fallback={<PageLoading />}><MonitoringInfrastructure /></Suspense>} />
                    <Route path="monitoring/email-health" element={<Suspense fallback={<PageLoading />}><MonitoringEmailHealth /></Suspense>} />
                    <Route path="monitoring/deployments" element={<Suspense fallback={<PageLoading />}><MonitoringDeployments /></Suspense>} />
                    <Route path="monitoring/logs" element={<Suspense fallback={<PageLoading />}><MonitoringLogs /></Suspense>} />
                    <Route path="monitoring/integrations" element={<Suspense fallback={<PageLoading />}><MonitoringIntegrations /></Suspense>} />
                    <Route path="perf" element={<Suspense fallback={<PageLoading />}><PerfDashboard /></Suspense>} />
                  </Route>
                  <Route path="/403" element={<Forbidden />} />
                  <Route path="*" element={<Forbidden />} />
                </Routes>
                </ErrorBoundary>
              </DialogProvider>
              <Toaster
                position="bottom-right"
                containerClassName="noska-toaster"
                toastOptions={{
                  duration: 4500,
                  style: {
                    background: "transparent",
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                  },
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
