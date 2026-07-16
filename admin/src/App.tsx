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
import { Notifications } from "@/pages/Notifications";
import { Feedback } from "@/pages/Feedback";
import { Support } from "@/pages/Support";
import { AuditLogs } from "@/pages/AuditLogs";
import { Roadmap } from "@/pages/Roadmap";
import { ChangelogEntries } from "@/pages/ChangelogEntries";
import { BlogPosts } from "@/pages/BlogPosts";
import { LegalPages } from "@/pages/LegalPages";
import { Broadcasts } from "@/pages/Broadcasts";
import { Integrations } from "@/pages/Integrations";
import { ApiKeys } from "@/pages/ApiKeys";
import { SystemStatus } from "@/pages/SystemStatus";
import { Settings } from "@/pages/Settings";
import { AdminAccounts } from "@/pages/AdminAccounts";
import { Webhooks } from "@/pages/Webhooks";
import { Forbidden } from "@/pages/Forbidden";
import { Login } from "@/pages/Login";
import { Loader2 } from "lucide-react";

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
                  <Route path="notifications" element={<Notifications />} />
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
                <Route path="settings" element={<Settings />} />
                <Route path="admin-accounts" element={<AdminAccounts />} />
                <Route path="webhooks" element={<Webhooks />} />
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
