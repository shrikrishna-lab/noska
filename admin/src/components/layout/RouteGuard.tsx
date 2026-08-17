import { Outlet, useLocation } from "react-router-dom";
import { useAdminRoutes } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { Loader2, Lock } from "lucide-react";

export function RouteGuard() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: routes, isLoading } = useAdminRoutes("admin");

  // Super admins can always access any route.
  if (hasRole(user, "super_admin")) return <Outlet />;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const path = location.pathname.replace(/^\/control/, "") || "/";
  const route = (routes ?? []).find((r) => {
    if (r.path === "/") return path === "/" || path === "";
    return path === r.path || path.startsWith(r.path.endsWith("/") ? r.path : `${r.path}/`);
  });

  if (route && !route.enabled) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
          <Lock className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold">Route disabled</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The super admin has disabled this page ({route.path}). Contact your platform administrator if you need access.
        </p>
      </div>
    );
  }

  return <Outlet />;
}