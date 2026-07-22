import { useNavigate } from "react-router-dom";
import { useLaunchSettings } from "../../hooks/useLaunchSettings";
import { useEffect } from "react";

const PAGE_KEY_MAP: Record<string, string> = {
  pricing: "show_pricing",
  blog: "show_blog",
  docs: "show_docs",
  changelog: "show_changelog",
};

export default function PageGate({ page, children }: { page: string; children: React.ReactNode }) {
  const { settings, loading } = useLaunchSettings();
  const navigate = useNavigate();
  const key = PAGE_KEY_MAP[page] as keyof typeof settings;

  useEffect(() => {
    if (loading || !key) return;
    if (!settings[key]) {
      navigate("/", { replace: true });
    }
  }, [loading, key, settings, navigate]);

  if (loading || (key && !settings[key])) return null;

  return <>{children}</>;
}
