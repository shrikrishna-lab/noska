// Gate for the /login route.
// - Desktop: delegates to <App /> which owns the full auth/onboarding flow.
// - Web: if the visitor already has a valid Clerk session (cookies/cache),
//   skip the login form entirely and go straight to the workspace. While the
//   session is resolving, hold on a spinner instead of flashing the form.
import type { ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Navigate, useLocation } from "react-router-dom";
import { isDesktop } from "../lib/desktop/platform";
import App from "../App.jsx";
import { RouteFallbackSpinner } from "./MarketingShell";

export default function LoginRoute({ children }: { children?: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (isDesktop()) {
    return <App />;
  }
  if (!isLoaded) {
    return <RouteFallbackSpinner />;
  }
  if (isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }
  // Signed out: render the real login experience (<App /> auth flow).
  return children ?? <App />;
}
