import { useEffect } from "react";

const ADMIN_URL = import.meta.env.DEV
  ? "http://127.0.0.1:5174/control"
  : "/control";

export default function ControlCenter() {
  useEffect(() => {
    window.location.href = ADMIN_URL;
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Control Center</h1>
      <p className="text-muted-foreground">Redirecting to admin panel...</p>
    </div>
  );
}
