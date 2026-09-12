import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, Home, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: false, copied: false };

  componentDidMount() {
    // Re-arm the one-shot self-heal only after the app has been healthy for
    // a while — clearing it on boot would loop: reload → boot → clear →
    // chunk fails again → reload … (the flicker).
    setTimeout(() => {
      try { sessionStorage.removeItem("admin_chunk_reload_done"); } catch { /* ignore */ }
    }, 10_000);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught admin error boundary exception:", error, errorInfo);

    // Self-heal stale lazy-chunk failures: after a new deploy (or a file that
    // briefly didn't exist), the dev server / CDN can 404 an old dynamic
    // import. Reload once — the flag prevents an infinite loop if the error
    // is a real code failure.
    if (
      /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
        error?.message ?? "",
      ) &&
      !sessionStorage.getItem("admin_chunk_reload_done")
    ) {
      sessionStorage.setItem("admin_chunk_reload_done", "1");
      window.location.reload();
      return;
    }
  }

  handleCopyError = () => {
    if (!this.state.error) return;
    const details = `Admin Exception: ${this.state.error.message}\nStack:\n${this.state.error.stack || "N/A"}\nURL: ${window.location.href}\nTime: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="relative min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-gradient-to-b from-background via-background/95 to-background flex items-center justify-center p-6">
          {/* Ambient Glows */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full bg-rose-500/10 blur-[130px]" />
          <div className="pointer-events-none absolute -bottom-32 right-1/4 w-[450px] h-[450px] rounded-full bg-destructive/15 blur-[120px]" />

          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-border/80 bg-card/80 p-8 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-card/60 text-center">
            {/* Top Security Pulse Badge */}
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 font-mono text-xs font-semibold text-destructive">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              SYSTEM EXCEPTION // CODE 500
            </div>

            {/* Glowing Icon */}
            <div className="mt-6 flex justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-destructive/30 bg-destructive/10 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                <AlertTriangle className="h-10 w-10 text-destructive animate-pulse" />
              </div>
            </div>

            <h2 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
              Unexpected Runtime Error
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              The application encountered an unhandled state exception. Your workspace session is preserved.
            </p>

            {/* Error Message Snippet */}
            <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 text-left font-mono text-xs text-foreground/90 overflow-hidden">
              <div className="flex items-center justify-between text-muted-foreground border-b border-border/60 pb-2 mb-2">
                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                  <Terminal className="h-3.5 w-3.5 text-destructive" /> Exception Output
                </span>
                <button
                  type="button"
                  onClick={this.handleCopyError}
                  className="flex items-center gap-1 text-[11px] hover:text-foreground transition-colors"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Trace</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-destructive font-semibold break-all">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>

              {this.state.error?.stack && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {this.state.showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {this.state.showDetails ? "Hide full stack trace" : "View stack trace"}
                  </button>

                  {this.state.showDetails && (
                    <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-background/80 p-3 text-[10px] text-muted-foreground leading-tight whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Recovery Actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload Application
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = "/control";
                }}
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

