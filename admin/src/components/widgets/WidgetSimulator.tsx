import { useState } from "react";
import { Wifi, CheckCircle2, TriangleAlert, Bell, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WidgetCatalogRow } from "@/lib/widgets";

/**
 * Widget simulator — mocked previews of the shared widget frame so admins
 * can see a widget in every size, theme and state. All data is synthetic;
 * nothing reads production user data and no event is ever sent to users.
 */

type PreviewState = "populated" | "loading" | "empty" | "error";
type Theme = "light" | "dark";

const MOCK_ROWS = [
  { title: "Finish Q3 roadmap", meta: "Product Roadmap · overdue" },
  { title: "Review onboarding copy", meta: "Growth Site · due today" },
  { title: "Ship widget engine", meta: "Platform · due tomorrow" },
  { title: "Sync with design", meta: "Design System · Friday" },
];

function Frame({
  name,
  size,
  theme,
  children,
}: {
  name: string;
  size: "small" | "medium" | "wide";
  theme: Theme;
  children: React.ReactNode;
}) {
  const width = size === "small" ? 220 : size === "medium" ? 320 : 560;
  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        theme === "dark" ? "border-zinc-700 bg-zinc-900 text-zinc-100" : "border-zinc-200 bg-white text-zinc-900"
      }`}
      style={{ width: "100%", maxWidth: width }}
    >
      <div className="flex items-center gap-2 px-4 pb-1 pt-3.5">
        <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${theme === "dark" ? "bg-zinc-800" : "bg-zinc-100"}`}>
          <Sparkles size={13} className="text-blue-500" />
        </span>
        <h4 className="flex-1 truncate text-[12.5px] font-bold">{name}</h4>
      </div>
      <div className="px-4 pb-3.5 text-[11.5px]">{children}</div>
    </div>
  );
}

function SkeletonRows({ theme }: { theme: Theme }) {
  const bar = theme === "dark" ? "bg-zinc-800" : "bg-zinc-100";
  return (
    <div className="space-y-2.5" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-9 animate-pulse rounded-xl ${bar}`} style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  );
}

function Body({ state, theme }: { state: PreviewState; theme: Theme }) {
  const muted = theme === "dark" ? "text-zinc-400" : "text-zinc-500";
  if (state === "loading") return <SkeletonRows theme={theme} />;
  if (state === "empty") {
    return (
      <div className="flex flex-col items-center gap-1 py-5 text-center">
        <CheckCircle2 size={18} className="text-emerald-500" />
        <p className="font-semibold">No tasks today</p>
        <p className={`max-w-[220px] text-[11px] ${muted}`}>You're all caught up. New tasks appear here automatically.</p>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-1 py-5 text-center">
        <TriangleAlert size={18} className="text-amber-500" />
        <p className="font-semibold">Couldn't load this widget</p>
        <p className={`text-[11px] ${muted}`}>Something went wrong. Your data is safe.</p>
        <span className={`mt-1 rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${theme === "dark" ? "border-zinc-700" : "border-zinc-200"}`}>
          Retry
        </span>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="mb-2 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-lg font-bold leading-5">7</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Open</p></div>
        <div><p className="text-lg font-bold leading-5 text-rose-500">2</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Overdue</p></div>
        <div><p className="text-lg font-bold leading-5 text-emerald-500">4</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Done today</p></div>
      </div>
      {MOCK_ROWS.map((row) => (
        <div key={row.title} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-current opacity-40">
            <Check size={10} className="opacity-0" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{row.title}</span>
            <span className={`block truncate text-[10px] ${muted}`}>{row.meta}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

const SIZES: Array<"small" | "medium" | "wide"> = ["small", "medium", "wide"];
const STATES: PreviewState[] = ["populated", "loading", "empty", "error"];

export function WidgetSimulator({ widget }: { widget: WidgetCatalogRow }) {
  const [state, setState] = useState<PreviewState>("populated");
  const [theme, setTheme] = useState<Theme>("light");
  const [testRunning, setTestRunning] = useState(false);

  const runTest = async () => {
    setTestRunning(true);
    // Simulated client states, purely local. Marked as test everywhere it
    // is visible; nothing leaves this page.
    await new Promise((r) => setTimeout(r, 900));
    setTestRunning(false);
    setState("populated");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select value={state} onValueChange={(v) => setState(v as PreviewState)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => void runTest()} disabled={testRunning}>
          {testRunning ? <Wifi className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
          Run test state
        </Button>
        <Badge variant="warning">TEST — never sent to users</Badge>
      </div>

      <div className="flex flex-wrap gap-6 rounded-xl border bg-muted/20 p-6">
        {(widget.allowed_sizes ?? ["small", "medium"]).slice(0, 3).map((s) => (
          <div key={s} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s}</p>
            <Frame name={widget.name} size={s === "wide" ? "wide" : s === "medium" ? "medium" : "small"} theme={theme}>
              <Body state={state} theme={theme} />
            </Frame>
          </div>
        ))}
      </div>
    </div>
  );
}
