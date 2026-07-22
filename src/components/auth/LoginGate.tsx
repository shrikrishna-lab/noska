import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLaunchSettings } from "../../hooks/useLaunchSettings";
import RingLoader from "./RingLoader";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useLaunchSettings();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (settings.login_mode === "launch") {
      navigate("/launch", { replace: true });
    } else if (settings.login_mode === "waitlist") {
      navigate("/waitlist", { replace: true });
    } else if (settings.login_mode === "custom" && settings.custom_login_url) {
      window.location.href = settings.custom_login_url;
    }
  }, [loading, settings.login_mode, settings.custom_login_url, navigate]);

  if (loading) return <RingLoader />;
  if (settings.login_mode !== "login") return null;

  return <>{children}</>;
}
