import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveModelExecutionPlan,
  recordSLOExecution,
  getSLOMetrics,
  resetSLOMetrics,
} from "../offline-model-engine";
import { setVoiceSettings } from "../voice-settings";

describe("Offline / Local Model Engine & Reliability SLO Tracker", () => {
  beforeEach(() => {
    resetSLOMetrics();
  });

  describe("ModelTier Resolution", () => {
    it("pins on-device local engine when modelTier is always_local", () => {
      setVoiceSettings({ modelTier: "always_local" });
      const plan = resolveModelExecutionPlan();
      expect(plan.useCloud).toBe(false);
      expect(plan.tierReason).toBe("always_local_pinned");
    });

    it("uses cloud enhanced execution when online in auto mode", () => {
      setVoiceSettings({ modelTier: "auto" });
      const plan = resolveModelExecutionPlan();
      expect(plan.useCloud).toBe(true);
      expect(plan.tierReason).toBe("auto_online");
    });
  });

  describe("Reliability SLO Tracker", () => {
    it("tracks successful executions and calculates success rate", () => {
      recordSLOExecution({ latencyMs: 50, success: true, wasOfflineFallback: false });
      recordSLOExecution({ latencyMs: 70, success: true, wasOfflineFallback: false });
      recordSLOExecution({ latencyMs: 120, success: true, wasOfflineFallback: true });

      const metrics = getSLOMetrics();
      expect(metrics.totalCalls).toBe(3);
      expect(metrics.successfulCalls).toBe(3);
      expect(metrics.offlineFallbacks).toBe(1);
      expect(metrics.successRate).toBe(100.0);
    });

    it("calculates accurate success rate on timeout/failures", () => {
      recordSLOExecution({ latencyMs: 50, success: true, wasOfflineFallback: false });
      recordSLOExecution({ latencyMs: 3000, success: false, wasOfflineFallback: true, timedOut: true });

      const metrics = getSLOMetrics();
      expect(metrics.totalCalls).toBe(2);
      expect(metrics.successfulCalls).toBe(1);
      expect(metrics.timeouts).toBe(1);
      expect(metrics.successRate).toBe(50.0);
    });
  });
});
