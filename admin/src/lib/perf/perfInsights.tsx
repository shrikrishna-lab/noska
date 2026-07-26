import { useRef, useEffect, Profiler } from "react";

interface RenderEvent {
  id: string;
  phase: "mount" | "update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  lastReported: number;
}

interface RpcMetric {
  method: string;
  count: number;
  totalMs: number;
  maxMs: number;
}

interface SlowImage {
  src: string;
  loadMs: number;
}

type PerfListener = (data: PerfSnapshot) => void;

export interface PerfSnapshot {
  renders: RenderEvent[];
  rpcs: RpcMetric[];
  slowImages: SlowImage[];
  componentRanking: { id: string; totalMs: number; count: number; avgMs: number }[];
  largestChunks: { name: string; size: number }[];
  ts: number;
}

const renderLog = new Map<string, RenderEvent>();
const rpcLog = new Map<string, RpcMetric>();
const imageLog: SlowImage[] = [];
const listeners = new Set<PerfListener>();
let originalRpc: ((method: string, ...args: unknown[]) => unknown) | null = null;

const SLOW_THRESHOLD_MS = 16;
const IMAGE_SLOW_THRESHOLD = 500;

function snapshot(): PerfSnapshot {
  const renders = Array.from(renderLog.values()).filter(
    (r) => Date.now() - r.lastReported < 60000
  );

  const componentRanking = Array.from(renderLog.values())
    .filter((r) => Date.now() - r.lastReported < 60000)
    .reduce((acc, r) => {
      const existing = acc.find((a) => a.id === r.id);
      if (existing) {
        existing.totalMs += r.actualDuration;
        existing.count += 1;
        existing.avgMs = existing.totalMs / existing.count;
      } else {
        acc.push({ id: r.id, totalMs: r.actualDuration, count: 1, avgMs: r.actualDuration });
      }
      return acc;
    }, [] as { id: string; totalMs: number; count: number; avgMs: number }[])
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, 20);

  return {
    renders,
    rpcs: Array.from(rpcLog.values()).sort((a, b) => b.totalMs - a.totalMs),
    slowImages: [...imageLog].sort((a, b) => b.loadMs - a.loadMs).slice(0, 20),
    componentRanking,
    largestChunks: listLargeChunks(),
    ts: Date.now(),
  };
}

function listLargeChunks(): { name: string; size: number }[] {
  if (typeof document === "undefined") return [];
  const scripts = document.querySelectorAll("script[src]");
  const chunks: { name: string; size: number }[] = [];
  scripts.forEach((s) => {
    const src = s.getAttribute("src") || "";
    if (src.includes("/assets/")) {
      const name = src.split("/").pop() || src;
      const size = s.textContent?.length || 0;
      chunks.push({ name, size });
    }
  });
  return chunks.sort((a, b) => b.size - a.size).slice(0, 10);
}

const origFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const start = performance.now();
  try {
    const response = await origFetch(input, init);
    const elapsed = performance.now() - start;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("supabase") || url.includes("rest/v1") || url.includes("rpc")) {
      const method = url.split("/").pop() || url;
      const existing = rpcLog.get(method);
      if (existing) {
        existing.count += 1;
        existing.totalMs += elapsed;
        existing.maxMs = Math.max(existing.maxMs, elapsed);
      } else {
        rpcLog.set(method, { method, count: 1, totalMs: elapsed, maxMs: elapsed });
      }
      if (elapsed > SLOW_THRESHOLD * 5) {
        console.warn(`[PerfInsights] Slow RPC: ${method} (${elapsed.toFixed(0)}ms)`);
      }
    }
    return response;
  } catch (err) {
    throw err;
  }
};

export function usePerfSnapshot(intervalMs = 30000): () => PerfSnapshot {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    notifyListeners();
    intervalRef.current = setInterval(() => notifyListeners(), intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return snapshot;
}

export function onPerfUpdate(cb: PerfListener): () => void {
  listeners.add(cb);
  cb(snapshot());
  return () => listeners.delete(cb);
}

function notifyListeners() {
  const data = snapshot();
  listeners.forEach((cb) => cb(data));
}

export function trackRender(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) {
  if (actualDuration < SLOW_THRESHOLD) return;
  const key = `${id}::${phase}`;
  renderLog.set(key, { id, phase, actualDuration, baseDuration, startTime, commitTime, lastReported: Date.now() });
  if (renderLog.size > 200) {
    const oldest = Array.from(renderLog.entries()).sort((a, b) => a[1].lastReported - b[1].lastReported)[0];
    if (oldest) renderLog.delete(oldest[0]);
  }
}

export function reportImageLoad(src: string, loadMs: number) {
  if (loadMs > IMAGE_SLOW_THRESHOLD) {
    imageLog.push({ src, loadMs });
    if (imageLog.length > 100) imageLog.shift();
  }
}

export function withProfiler<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  name?: string
): React.FC<P> {
  const displayName = name || WrappedComponent.displayName || WrappedComponent.name || "Unknown";
  const Profiled: React.FC<P> = (props: P) => {
    return (
      <Profiler
        id={displayName}
        onRender={(_id, phase, actualDuration, baseDuration, startTime, commitTime) => {
          trackRender(displayName, phase, actualDuration, baseDuration, startTime, commitTime);
        }}
      >
        <WrappedComponent {...props} />
      </Profiler>
    );
  };
  Profiled.displayName = `Profiled(${displayName})`;
  return Profiled;
}

export function getSnapshot(): PerfSnapshot {
  return snapshot();
}
