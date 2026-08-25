import { ClerkProvider } from "@clerk/react";
import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { initPosthog } from "./lib/posthog";
import { initSentry, Sentry } from "./lib/sentry";
import DesktopBridge from "./lib/desktop/DesktopBridge";
import { isDesktop } from "./lib/desktop/platform";
import MarketingShell from "./components/MarketingShell";
import LoginRoute from "./components/LoginRoute";
import { PairClaimWatcher } from "./pages/DesktopConnect";
import DesktopShell from "./components/desktop/DesktopShell";
import UpdatePrompt from "./components/desktop/UpdatePrompt";
import App from "./App.jsx";
import MarketingLayout from "./pages/marketing/MarketingLayout";
import ControlCenter from "./ControlCenter";
import "./index.css";

const MarketingHome = lazy(() => import("./pages/marketing/Home"));
const MarketingPricing = lazy(() => import("./pages/marketing/Pricing"));
const MarketingEnterprise = lazy(() => import("./pages/marketing/Enterprise"));
const MarketingProduct = lazy(() => import("./pages/marketing/Product"));
const MarketingSolutions = lazy(() => import("./pages/marketing/Solutions"));
const MarketingResources = lazy(() => import("./pages/marketing/Resources"));
const MarketingChangelog = lazy(() => import("./pages/marketing/Changelog"));
const MarketingPatches = lazy(() => import("./pages/marketing/Patches"));
const MarketingBlog = lazy(() => import("./pages/marketing/Blog"));
const BlogPost = lazy(() => import("./pages/marketing/BlogPost"));
const Legal = lazy(() => import("./pages/marketing/Legal"));
const Docs = lazy(() => import("./pages/marketing/Docs"));
const McpDocs = lazy(() => import("./pages/marketing/McpDocs"));
const Referrals = lazy(() => import("./pages/marketing/Referrals"));
const Roadmap = lazy(() => import("./pages/marketing/Roadmap"));
const NewUpdated = lazy(() => import("./pages/marketing/NewUpdated"));
const Launch = lazy(() => import("./pages/marketing/launch/Launch"));
const Download = lazy(() => import("./pages/marketing/Download"));
const PluginsLanding = lazy(() => import("./pages/marketing/PluginsLanding"));
const McpLanding = lazy(() => import("./pages/marketing/McpLanding"));
const ApiKeysLanding = lazy(() => import("./pages/marketing/ApiKeysLanding"));
const AuthCallbackScreen = lazy(() => import("./components/auth/AuthCallbackScreen").then(m => ({ default: m.AuthCallbackScreen })));
const InvitePage = lazy(() => import("./pages/invite/InvitePage").then(m => ({ default: m.InvitePage })));
const DesktopConnectPage = lazy(() => import("./pages/DesktopConnect"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
  </div>
);

// Desktop: kill the branded preloader instantly â€” the app should feel like a
// native program, not a website loading. Web keeps the fade-out.
if (isDesktop()) {
  document.getElementById("preloader")?.remove();
}

const preloader = document.getElementById("preloader");
if (preloader) {
  preloader.classList.add("hidden");
  setTimeout(() => preloader.remove(), 500);
}

const deferInit = typeof requestIdleCallback !== "undefined" ? requestIdleCallback : (fn: () => void, opts?: { timeout: number }) => setTimeout(fn, opts?.timeout ?? 200);
deferInit(() => { initPosthog(); initSentry(); }, { timeout: 500 });

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesktopShell>
    <BrowserRouter>
      <PostHogProvider client={posthog}>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/login">
        <Sentry.ErrorBoundary fallback={({ error }) => (
          <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-8">
            <div className="max-w-md text-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h1>
              <p className="text-[var(--text-secondary)] mb-4">An unexpected error occurred. Our team has been notified.</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-white hover:opacity-90"
              >
                Reload page
              </button>
            </div>
          </div>
        )}>
        {!isDesktop() && <SpeedInsights />}
        {!isDesktop() && <Analytics />}
        <DesktopBridge />
        <PairClaimWatcher />
        <UpdatePrompt />
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<MarketingShell><MarketingHome /></MarketingShell>} />
          <Route path="/pricing" element={<MarketingShell><MarketingPricing /></MarketingShell>} />
          <Route path="/enterprise" element={<MarketingShell><MarketingEnterprise /></MarketingShell>} />
          <Route path="/product" element={<MarketingShell><MarketingProduct /></MarketingShell>} />
          <Route path="/solutions" element={<MarketingShell><MarketingSolutions /></MarketingShell>} />
          <Route path="/resources" element={<MarketingShell><MarketingResources /></MarketingShell>} />
          <Route path="/changelog" element={<MarketingShell><MarketingChangelog /></MarketingShell>} />
          <Route path="/patches" element={<MarketingShell><MarketingPatches /></MarketingShell>} />
          <Route path="/blog" element={<MarketingShell><MarketingBlog /></MarketingShell>} />
          <Route path="/blog/:slug" element={<MarketingShell><BlogPost /></MarketingShell>} />
          <Route path="/privacy" element={<MarketingShell><Legal /></MarketingShell>} />
          <Route path="/terms" element={<MarketingShell><Legal /></MarketingShell>} />
          <Route path="/policy" element={<MarketingShell><Legal /></MarketingShell>} />
          <Route path="/refund" element={<MarketingShell><Legal /></MarketingShell>} />
          <Route path="/docs" element={<MarketingShell><Docs /></MarketingShell>} />
          <Route path="/docs/mcp" element={<MarketingShell><McpDocs /></MarketingShell>} />
          <Route path="/referrals" element={<MarketingShell><Referrals /></MarketingShell>} />
          <Route path="/roadmap" element={<MarketingShell><Roadmap /></MarketingShell>} />
          <Route path="/new-updated" element={<MarketingShell><NewUpdated /></MarketingShell>} />
          <Route path="/launch" element={<Launch />} />
          <Route path="/download" element={<MarketingShell><Download /></MarketingShell>} />
          <Route path="/plugins" element={<MarketingShell><PluginsLanding /></MarketingShell>} />
          <Route path="/mcp" element={<MarketingShell><McpLanding /></MarketingShell>} />
          <Route path="/api-keys" element={<MarketingShell><ApiKeysLanding /></MarketingShell>} />
          <Route path="/invite/:code" element={<InvitePage />} />
          <Route path="/sso-callback" element={<AuthCallbackScreen />} />
          <Route path="/connect-desktop" element={<Suspense fallback={<RouteFallback />}><DesktopConnectPage /></Suspense>} />
          <Route path="/control" element={<ControlCenter />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/dashboard" element={<App />} />
          <Route path="/onboarding" element={<App />} />
          <Route path="/waitlist" element={<App />} />
          <Route path="/banned" element={<App />} />
          <Route path="/:workspaceSlug" element={<App />} />
          <Route path="/:workspaceSlug/:pageId" element={<App />} />
        </Routes>
        </Suspense>
        </Sentry.ErrorBoundary>
      </ClerkProvider>
      </PostHogProvider>
    </BrowserRouter>
    </DesktopShell>
  </React.StrictMode>
);
