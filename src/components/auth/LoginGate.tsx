import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLaunchSettings } from "../../hooks/useLaunchSettings";
import RingLoader from "./RingLoader";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useLaunchSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    // "waitlist" login mode keeps the sign-in screen reachable — the
    // WaitlistGate (mounted in App) handles approval/blocking after auth.
    if (settings.login_mode === "launch") {
      navigate("/launch", { replace: true });
    } else if (settings.login_mode === "custom" && settings.custom_login_url) {
      window.location.href = settings.custom_login_url;
    }
  }, [loading, settings.login_mode, settings.custom_login_url, navigate]);

  if (loading) return <RingLoader />;
  if (settings.login_mode === "launch") return null;
  if (settings.login_mode === "custom") return null;

  return <>{children}</>;
}
