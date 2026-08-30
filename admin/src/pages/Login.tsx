import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

export function Login() {
  const { signIn, setupFirstAdmin, error, needsSetup, checkingSetup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    await signIn(email, password);
    setSubmitting(false);
  };

  const handleSetup = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) return;
    setSubmitting(true);
    await setupFirstAdmin(email, password, name);
    setSubmitting(false);
  };

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSetup = needsSetup;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Noska" className="mx-auto mb-2 h-12 w-12 rounded-xl" />
          <CardTitle className="text-2xl">{isSetup ? "Setup Admin" : "Admin Login"}</CardTitle>
          <CardDescription>
            {isSetup
              ? "Create the first administrator account"
              : "Sign in to the Noska control panel"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSetup ? handleSetup : handleSignIn} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-gradient-to-br from-purple-50 via-purple-50 to-red-50 p-3 text-sm text-red-700 shadow-sm dark:border-red-800 dark:from-purple-950 dark:via-purple-950 dark:to-red-950 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {isSetup && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/30 dark:text-amber-200">
                No admin accounts found. Set up your first administrator to get started.
              </div>
            )}

            {isSetup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@noska.me"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!isSetup}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? (isSetup ? "Creating..." : "Signing in...") : isSetup ? "Create Admin Account" : "Sign in"}
            </Button>
          </form>

          {!isSetup && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Only authorized administrators can access this panel.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
