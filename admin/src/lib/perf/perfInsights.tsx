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

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

export interface PerfSnapshot {
  renders: RenderEvent[];
  rpcs: RpcMetric[];
  slowImages: SlowImage[];
  componentRanking: { id: string; totalMs: number; count: number; avgMs: number }[];
  largestChunks: { name: string; size: number }[];
  webVitals: WebVitalMetric[];
  fps: number;
  jsHeapSize: number;
  jsHeapUsed: number;
  longestTask: number;
  totalBlockingTime: number;
  ts: number;
}

const renderLog = new Map<string, RenderEvent>();
const rpcLog = new Map<string, RpcMetric>();
const imageLog: SlowImage[] = [];
const listeners = new Set<PerfListener>();
let originalRpc: ((method: string, ...args: unknown[]) => unknown) | null = null;

const SLOW_THRESHOLD_MS = 16;
const IMAGE_SLOW_THRESHOLD = 500;

function snapshot() {
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
  } as Omit<PerfSnapshot, 'webVitals' | 'fps' | 'jsHeapSize' | 'jsHeapUsed' | 'longestTask' | 'totalBlockingTime'>;
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
      if (elapsed > SLOW_THRESHOLD_MS * 5) {
        console.warn(`[PerfInsights] Slow RPC: ${method} (${elapsed.toFixed(0)}ms)`);
      }
    }
    return response;
  } catch (err) {
    throw err;
  }
};

export function usePerfSnapshot(intervalMs = 30000) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    notifyListeners();
    intervalRef.current = setInterval(() => notifyListeners(), intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return snapshotWithMetrics;
}

export function onPerfUpdate(cb: PerfListener): () => void {
  listeners.add(cb);
  cb(snapshotWithMetrics());
  return () => listeners.delete(cb);
}

function notifyListeners() {
  const data = snapshotWithMetrics();
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
  if (actualDuration < SLOW_THRESHOLD_MS) return;
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
          trackRender(displayName, phase as "mount" | "update", actualDuration, baseDuration, startTime, commitTime);
        }}
      >
        <WrappedComponent {...props} />
      </Profiler>
    );
  };
  Profiled.displayName = `Profiled(${displayName})`;
  return Profiled;
}

// ── Web Vitals ──
let webVitals: WebVitalMetric[] = [];
try {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const name = entry.name || entry.entryType;
      let value = 0;
      let rating: WebVitalMetric["rating"] = "good";
      if (entry instanceof (performance.getEntriesByType('largest-contentful-paint')[0]?.constructor ?? Object)) {
        const lcp = entry as unknown as { renderTime?: number; loadTime?: number; startTime?: number };
        value = lcp.renderTime || lcp.loadTime || lcp.startTime || 0;
        rating = value < 2500 ? "good" : value < 4000 ? "needs-improvement" : "poor";
        webVitals = webVitals.filter((v) => v.name !== "LCP");
        webVitals.push({ name: "LCP", value, rating });
      } else if (entry.entryType === 'first-input') {
        const fi = entry as unknown as { processingStart: number; startTime: number };
        value = fi.processingStart - fi.startTime;
        rating = value < 100 ? "good" : value < 300 ? "needs-improvement" : "poor";
        webVitals = webVitals.filter((v) => v.name !== "FID");
        webVitals.push({ name: "FID", value, rating });
      } else if (entry.entryType === 'element') {
        const el = entry as unknown as { renderTime?: number };
        value = el.renderTime || 0;
      }
    }
  });
  observer.observe({ type: "largest-contentful-paint", buffered: true });
  observer.observe({ type: "first-input", buffered: true });
  observer.observe({ type: "element", buffered: true });
} catch {}

// ── FPS tracking ──
let lastFrameTime = performance.now();
let frameCount = 0;
let currentFps = 60;
function tickFps() {
  frameCount++;
  const now = performance.now();
  if (now - lastFrameTime >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFrameTime));
    frameCount = 0;
    lastFrameTime = now;
  }
  requestAnimationFrame(tickFps);
}
requestAnimationFrame(tickFps);

// ── Long Tasks ──
let lastLongTaskDuration = 0;
let totalBlockingTime = 0;
try {
  const ltObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const duration = entry.duration;
      lastLongTaskDuration = Math.max(lastLongTaskDuration, duration);
      totalBlockingTime += Math.max(duration - 50, 0);
    }
  });
  ltObserver.observe({ type: "longtask", buffered: true });
} catch {}

// ── Layout Shifts (CLS) ──
let cumulativeLayoutShift = 0;
try {
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        cumulativeLayoutShift += (entry as any).value || 0;
      }
    }
  });
  clsObserver.observe({ type: "layout-shift", buffered: true });
} catch {}

function getMemoryInfo(): { heapSize: number; heapUsed: number } {
  const perf = (performance as any);
  if (perf.memory) {
    return { heapSize: perf.memory.jsHeapSizeLimit, heapUsed: perf.memory.usedJSHeapSize };
  }
  return { heapSize: 0, heapUsed: 0 };
}

function getWebVitals(): WebVitalMetric[] {
  const clsRating = cumulativeLayoutShift < 0.1 ? "good" : cumulativeLayoutShift < 0.25 ? "needs-improvement" : "poor";
  const clsIndex = webVitals.findIndex((v) => v.name === "CLS");
  if (clsIndex >= 0) webVitals[clsIndex] = { name: "CLS", value: cumulativeLayoutShift, rating: clsRating };
  else webVitals.push({ name: "CLS", value: cumulativeLayoutShift, rating: clsRating });

  const tbtRating = totalBlockingTime < 200 ? "good" : totalBlockingTime < 600 ? "needs-improvement" : "poor";
  const tbtIndex = webVitals.findIndex((v) => v.name === "TBT");
  if (tbtIndex >= 0) webVitals[tbtIndex] = { name: "TBT", value: totalBlockingTime, rating: tbtRating };
  else webVitals.push({ name: "TBT", value: totalBlockingTime, rating: tbtRating });

  return webVitals;
}

function snapshotWithMetrics(): PerfSnapshot {
  const base = snapshot();
  const mem = getMemoryInfo();
  return {
    ...base,
    webVitals: getWebVitals(),
    fps: currentFps,
    jsHeapSize: mem.heapSize,
    jsHeapUsed: mem.heapUsed,
    longestTask: lastLongTaskDuration,
    totalBlockingTime,
  };
}

export function getSnapshot(): PerfSnapshot {
  return snapshotWithMetrics();
}
