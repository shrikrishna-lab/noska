import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ADMIN_URL = import.meta.env.DEV
  ? "http://127.0.0.1:5174/control"
  : "/control";

export default function ControlCenter() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      setLoaded(true);
    }
  }, []);

  if (import.meta.env.DEV) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Control Center</h1>
        <p className="text-muted-foreground">
          The admin panel runs as a separate application during development.
        </p>
        <a
          href={ADMIN_URL}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Open Admin Panel at {ADMIN_URL}
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Control Center</h1>
      <p className="text-muted-foreground">
        Redirecting to admin panel...
      </p>
    </div>
  );
}
