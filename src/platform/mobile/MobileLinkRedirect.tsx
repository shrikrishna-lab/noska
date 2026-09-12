// Web fallback for noska:// deep links. iOS Universal Links / Android App
// Links point at noska.me/link/... — when the app is installed the OS opens
// it natively and this page never renders. When it is NOT installed, this
// component routes signed-in users straight into the product (never the
// marketing site) and offers signed-out visitors an install/open prompt.

import { useEffect } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { isMobile } from "../index";
import { getDesktopIdentity } from "../../lib/desktop/pairing";

export default function MobileLinkRedirect() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();

  const pageId = params.pageId || params.taskId || params.projectId || null;
  const nativeIdentity = typeof window !== "undefined" ? getDesktopIdentity() : null;
  const hasNativeSession = isMobile() && !!nativeIdentity;

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn || hasNativeSession) return;
    // Signed out on the web: remember the target, then let the user sign in.
    const target = pageId ? `/_/${pageId}` : "/dashboard";
    try {
      sessionStorage.setItem("noska_dev_deep_link", target);
    } catch {}
    navigate("/login", { replace: true });
  }, [isLoaded, isSignedIn, hasNativeSession, pageId, navigate, location.pathname]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!isSignedIn && !hasNativeSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <img src="/logo.png" alt="Noska" className="h-12" />
        <h1 className="text-xl font-bold text-gray-900">Open in Noska</h1>
        <p className="max-w-sm text-sm text-gray-500">
          This link opens in the Noska app. Sign in on the web, or install the
          mobile app to open it on your phone.
        </p>
      </div>
    );
  }

  // Authenticated: into the product. The `/_` slug is a placeholder — the
  // app re-syncs the URL to the real workspace name once loaded.
  return <Navigate to={pageId ? `/_/${pageId}` : "/dashboard"} replace />;
}
