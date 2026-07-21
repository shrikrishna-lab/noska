import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function MonitoringHub() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/monitoring/overview", { replace: true });
  }, [navigate]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
