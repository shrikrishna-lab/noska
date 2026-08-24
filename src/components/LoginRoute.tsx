// Gate for the /login route.
// - Desktop with a paired session: straight through to the app.
// - Desktop without one: the pairing screen (browser-based sign-in) — the
//   Clerk login form can't run on the custom app origin.
// - Web: cached Clerk session skips the form; otherwise render the login UI.
import type { ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Navigate } from "react-router-dom";
import { isDesktop } from "../lib/desktop/platform";
import { getDesktopIdentity } from "../lib/desktop/pairing";
import App from "../App.jsx";
import PairingScreen from "./auth/PairingScreen";
import { RouteFallbackSpinner } from "./MarketingShell";

export default function LoginRoute({ children }: { children?: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isDesktop()) {
    if (getDesktopIdentity()) return children ?? <App />;
    return <PairingScreen />;
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
