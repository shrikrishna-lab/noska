// Gate for the /login route.
// - Native shells (desktop/mobile) with a paired/handoff session: straight
//   through to the app.
// - Desktop without one: the browser-first auth screen (providers open the
//   system browser; the app is handed back via noska://auth/callback).
// - Mobile without one: the mobile-styled variant of the same flow.
// - Web: cached Clerk session skips the form; otherwise render the login UI.
import type { ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { Navigate } from "react-router-dom";
import { isDesktop } from "../lib/desktop/platform";
import { isMobile } from "../platform";
import { getDesktopIdentity } from "../lib/desktop/pairing";
import App from "../App.jsx";
import DesktopAuthScreen from "./auth/DesktopAuthScreen";
import MobileAuthScreen from "../platform/mobile/MobileAuthScreen";
import { RouteFallbackSpinner } from "./MarketingShell";

export default function LoginRoute({ children }: { children?: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (isDesktop()) {
    if (getDesktopIdentity()) return children ?? <App />;
    return isMobile() ? <MobileAuthScreen /> : <DesktopAuthScreen />;
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
