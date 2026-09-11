// Runtime-aware shell for marketing routes.
// - Desktop: always hands over to <App /> (loading -> auth -> workspace/login);
//   the installed app never shows the public marketing site.
// - Web: the marketing site (including "/") is browsable signed in or out —
//   a signed-in visitor typing the bare domain sees the landing page instead
//   of being bounced to their workspace. The navbar's "Open app" CTA is the
//   way back in. While Clerk is still resolving we hold on a spinner so the
//   page never renders in a half-authenticated state.
import type { ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { useLocation, Navigate } from "react-router-dom";
import { isDesktop } from "../lib/desktop/platform";
import App from "../App.jsx";
import MarketingLayout from "../pages/marketing/MarketingLayout";

export function RouteFallbackSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
    </div>
  );
}

export default function MarketingShell({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (isDesktop()) {
    return <App />;
  }
  if (!isLoaded) {
    return <RouteFallbackSpinner />;
  }
  if (isSignedIn && location.pathname === "/") {
    return <Navigate to="/dashboard" replace />;
  }
  return <MarketingLayout>{children}</MarketingLayout>;
}
