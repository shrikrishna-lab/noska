import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <ShieldAlert className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">403</h1>
      <h2 className="text-xl font-semibold">Access Denied</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        You don't have permission to access this area. Please contact your administrator if you believe this is a mistake.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </div>
  );
}
