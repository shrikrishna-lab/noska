"""Rewrite PreflightCard in Releases.tsx with the animated version."""
p = "admin/src/pages/Releases.tsx"
s = open(p, encoding="utf-8").read()

# carve out the existing PreflightCard + type block
start = s.find("const CHECK_STYLE: Record<string, { icon: typeof PassIcon; cls: string }> = {")
end = s.find("type PreflightReportLike =")
assert start != -1 and end != -1 and end > start
tail_marker = s.find("function RunRow(", end)
assert tail_marker != -1

new_card = '''const CHECK_STYLE: Record<string, { icon: typeof PassIcon; cls: string }> = {
  pass: { icon: PassIcon, cls: "text-emerald-500" },
  warn: { icon: WarnIcon, cls: "text-amber-500" },
  fail: { icon: FailIcon, cls: "text-red-500" },
  unknown: { icon: UnknownIcon, cls: "text-muted-foreground" },
};

// Character-by-character spring text (idle → cycling steps → results).
function AnimatedText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} style={{ display: "inline-flex", willChange: "transform" }}>
          {text.split("").map((char, i) => (
            <motion.span
              key={`${text}-${i}`}
              initial={{ y: 8, opacity: 0, scale: 0.6, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ y: -8, opacity: 0, scale: 0.6, filter: "blur(2px)" }}
              transition={{ type: "spring", stiffness: 240, damping: 16, delay: i * 0.012 }}
              style={{ display: "inline-block", whiteSpace: char === " " ? "pre" : undefined }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const PREFLIGHT_STEPS = [
  { label: "Validating version files", icon: FileCode2 },
  { label: "Inspecting Tauri config", icon: PreIcon },
  { label: "Checking dependencies & lockfiles", icon: PackageOpen },
  { label: "Verifying icon assets", icon: Sparkles },
  { label: "Probing updater manifest", icon: RefreshCw },
  { label: "Scanning mobile platform", icon: Zap },
  { label: "Pinging web deployment", icon: Globe },
  { label: "Reading GitHub state", icon: GitBranchIcon },
];

function PreflightCard({
  report, isLoading, isError, onRerun, rerunning,
}: {
  report?: PreflightReportLike;
  isLoading: boolean;
  isError: boolean;
  onRerun: () => void;
  rerunning: boolean;
}) {
  const running = isLoading || rerunning || (!report && !isError);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setStep((prev) => (prev + 1) % PREFLIGHT_STEPS.length), 1100);
    return () => clearInterval(interval);
  }, [running]);

  const summary = report?.summary;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <PreIcon className="h-4 w-4" />
          <AnimatedText text={running ? "Pre-flight running" : "Pre-flight checks"} />
        </CardTitle>
        <div className="flex items-center gap-2">
          {summary && !running && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="flex items-center gap-1.5 text-[10px] font-semibold"
            >
              {summary.fail > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700 dark:bg-red-900/30 dark:text-red-400">{summary.fail} failing</span>}
              {summary.warn > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{summary.warn} warnings</span>}
              {summary.fail === 0 && summary.warn === 0 && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">all clear</span>
              )}
              {summary.unknown > 0 && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{summary.unknown} unknown</span>}
            </motion.div>
          )}
          <Button variant="ghost" size="sm" onClick={onRerun} disabled={running}>
            <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait" initial={false}>
          {running || isError || !report ? (
            <motion.div
              key="running"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-border px-4 py-3.5"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0, rotate: -30, filter: "blur(3px)" }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0, rotate: 30, filter: "blur(3px)" }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    {React.createElement(PREFLIGHT_STEPS[step].icon, { className: "h-5 w-5 text-primary" })}
                  </motion.div>
                </AnimatePresence>
                <AnimatedText
                  text={isError ? "Pre-flight checks unavailable" : `${PREFLIGHT_STEPS[step].label}…`}
                  className="text-sm font-semibold text-foreground"
                />
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                {isError ? "error" : "live"}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-2"
            >
              {report.checks.map((c, i) => {
                const meta = CHECK_STYLE[c.status] ?? CHECK_STYLE.unknown;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -14, filter: "blur(2px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    transition={{ type: "spring", stiffness: 240, damping: 22, delay: i * 0.045 }}
                    className="flex items-start gap-2.5"
                  >
                    <meta.icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.cls}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug text-foreground">{c.label}</p>
                      <p className="text-[11px] leading-snug text-muted-foreground">{c.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

type PreflightReportLike = {
  branch: string;
  checks: PreflightCheck[];
  summary: { pass: number; warn: number; fail: number; unknown: number };
};

'''

s = s[:start] + new_card + s[tail_marker:]

# imports
s = s.replace('import { useState } from "react";', 'import React, { useState, useEffect } from "react";', 1)
s = s.replace('import { motion } from "framer-motion";', 'import { motion, AnimatePresence } from "framer-motion";', 1)
old_icons = "} from \"lucide-react\";"
new_icons = "  GitBranch as GitBranchIcon,\n} from \"lucide-react\";"
s = s.replace(old_icons, new_icons, 1)

open(p, "w", encoding="utf-8").write(s)
print("animated PreflightCard installed")
