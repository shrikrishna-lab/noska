import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAdminRoutes } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { Loader2, Lock, ArrowLeft, LayoutDashboard, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteGuard() {
  const location = useLocation();
  const navigate = useNavigate();
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
      <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-gradient-to-b from-background via-background/95 to-background flex items-center justify-center p-6">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 w-[400px] h-[400px] rounded-full bg-orange-600/10 blur-[110px]" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg rounded-3xl border border-border/80 bg-card/75 p-8 text-center shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-card/60"
        >
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            {/* Orbital animated rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute h-24 w-24 rounded-full border border-dashed border-amber-500/30"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute h-18 w-18 rounded-full border border-dotted border-amber-500/40"
            />
            <div className="absolute h-20 w-20 rounded-full bg-amber-500/15 blur-xl" />

            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/20 to-amber-500/5 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
            >
              <Lock className="h-8 w-8 text-amber-500" />
            </motion.div>
          </div>

          <div className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold text-amber-500">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            ROUTE DEACTIVATED // {route.path}
          </div>

          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Module Temporarily Offline
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The platform super administrator has deactivated the route{" "}
            <span className="font-mono font-medium text-foreground">{route.path}</span>. If you require this feature for ongoing operations, contact your platform administrator.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <Outlet />;
}