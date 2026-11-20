import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff, Loader2, Mail, CheckCircle } from "lucide-react";

export function Login() {
  const { signIn, setupFirstAdmin, error, needsSetup, checkingSetup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
  const RESET_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-password-reset`;

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

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSubmitting(true);
    try {
      const res = await fetch(RESET_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setResetError(data.error || "Failed to send reset email");
        setResetSubmitting(false);
        return;
      }
      setResetSuccess(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to send reset email");
      setResetSubmitting(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSetup = needsSetup;

  if (resetMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <Card className="w-full max-w-sm shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <Mail className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email and we will send a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetSuccess && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 shadow-sm dark:border-green-800 dark:from-green-950 dark:via-green-950 dark:to-green-950 dark:text-green-400">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-500 dark:text-green-400" />
                <span>
                  Reset link sent to <strong>{resetEmail}</strong>. Check your inbox.
                </span>
              </div>
            )}
            {!resetSuccess && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                {resetError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-gradient-to-br from-purple-50 via-purple-50 to-red-50 p-3 text-sm text-red-700 shadow-sm dark:border-red-800 dark:from-purple-950 dark:via-purple-950 dark:to-red-950 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="admin@noska.me"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={resetSubmitting}>
                  {resetSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {resetSubmitting ? "Sending..." : "Send Reset Link"}
                </Button>

                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Back to sign in
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <img src={`${import.meta.env.BASE_URL}logo-128.webp`} alt="Noska" width={48} height={48} decoding="async" className="mx-auto mb-2 h-12 w-12 rounded-xl" />
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
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground underline flex items-center justify-center gap-1"
              >
                <Mail className="h-3 w-3" /> Forgot password?
              </button>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Only authorized administrators can access this panel.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

