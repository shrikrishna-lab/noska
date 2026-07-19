import { ClerkProvider, AuthenticateWithRedirectCallback } from "@clerk/react";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { initPosthog } from "./lib/posthog";
import { initSentry, Sentry } from "./lib/sentry";
import App from "./App.jsx";
import MarketingLayout from "./pages/marketing/MarketingLayout";
import MarketingHome from "./pages/marketing/Home";
import MarketingPricing from "./pages/marketing/Pricing";
import MarketingEnterprise from "./pages/marketing/Enterprise";
import MarketingProduct from "./pages/marketing/Product";
import MarketingSolutions from "./pages/marketing/Solutions";
import MarketingResources from "./pages/marketing/Resources";
import MarketingChangelog from "./pages/marketing/Changelog";
import MarketingBlog from "./pages/marketing/Blog";
import BlogPost from "./pages/marketing/BlogPost";
import Legal from "./pages/marketing/Legal";
import Docs from "./pages/marketing/Docs";
import Referrals from "./pages/marketing/Referrals";
import Launch from "./pages/marketing/launch/Launch";
import ControlCenter from "./ControlCenter";
import { InvitePage } from "./pages/invite/InvitePage";
import "./index.css";

initPosthog();
initSentry();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
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
        <Routes>
          {/* Public marketing site — never runs the auth/session bootstrap.
              Each page shares the Navbar/Footer via MarketingLayout. */}
          <Route path="/" element={<MarketingLayout><MarketingHome /></MarketingLayout>} />
          <Route path="/pricing" element={<MarketingLayout><MarketingPricing /></MarketingLayout>} />
          <Route path="/enterprise" element={<MarketingLayout><MarketingEnterprise /></MarketingLayout>} />
          <Route path="/product" element={<MarketingLayout><MarketingProduct /></MarketingLayout>} />
          <Route path="/solutions" element={<MarketingLayout><MarketingSolutions /></MarketingLayout>} />
          <Route path="/resources" element={<MarketingLayout><MarketingResources /></MarketingLayout>} />
          <Route path="/changelog" element={<MarketingLayout><MarketingChangelog /></MarketingLayout>} />
          <Route path="/blog" element={<MarketingLayout><MarketingBlog /></MarketingLayout>} />
          <Route path="/blog/:slug" element={<MarketingLayout><BlogPost /></MarketingLayout>} />
          <Route path="/privacy" element={<MarketingLayout><Legal /></MarketingLayout>} />
          <Route path="/terms" element={<MarketingLayout><Legal /></MarketingLayout>} />
          <Route path="/policy" element={<MarketingLayout><Legal /></MarketingLayout>} />
          <Route path="/docs" element={<MarketingLayout><Docs /></MarketingLayout>} />
          <Route path="/referrals" element={<MarketingLayout><Referrals /></MarketingLayout>} />
          {/* Standalone pre-launch waitlist page — ships its own navbar,
              footer, and smooth-scroll setup, so it deliberately skips
              MarketingLayout (which would double up both). */}
          <Route path="/launch" element={<Launch />} />
          <Route path="/invite/:code" element={<InvitePage />} />
          {/* SSO callback handler — Clerk processes the OAuth redirect here,
              then redirects to /login where App reads the auth state. */}
          <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/login" />} />
          {/* Admin portal — full-page redirect to the separate admin SPA */}
          <Route path="/control" element={<ControlCenter />} />
          {/* Everything else (login, onboarding, and the workspace itself) is
              handled by App, which reads the current route to decide what to
              show and keeps the URL in sync as auth/onboarding state resolves. */}
          <Route path="/login" element={<App />} />
          <Route path="/onboarding" element={<App />} />
          <Route path="/:workspaceSlug" element={<App />} />
          <Route path="/:workspaceSlug/:pageId" element={<App />} />
        </Routes>
        </Sentry.ErrorBoundary>
      </ClerkProvider>
      </PostHogProvider>
    </BrowserRouter>
  </React.StrictMode>
);