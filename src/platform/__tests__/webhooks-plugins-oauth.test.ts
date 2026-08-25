/* Platform V5 — webhook signing, replay protection, plugin manifests,
 * OAuth primitives and event contracts. */
import { describe, it, expect } from "vitest";
import {
  canonicalWebhookPayload, signWebhook, verifyWebhookSignature,
  generateWebhookSecret, webhookRetryDelayMs,
  validatePluginManifest, pluginPermissionGranted,
  redirectUriAllowed, scopeSubset, pkceChallengeS256,
} from "../../../supabase/functions/_shared/core/pure.ts";

describe("webhook signing", () => {
  const base = {
    eventId: "e1",
    eventType: "task.completed",
    timestamp: "2026-08-24T00:00:00.000Z",
    workspaceId: "ws1",
    actor: "user-1",
    entity: "task",
    entityId: "t9",
    data: { text: "Ship it" },
  };

  it("payload carries the full documented envelope", () => {
    const body = canonicalWebhookPayload(base);
    const parsed = JSON.parse(body);
    expect(parsed).toMatchObject({
      event_id: "e1", event_type: "task.completed", timestamp: base.timestamp,
      workspace_id: "ws1", actor: "user-1", entity: "task", entity_id: "t9", data: { text: "Ship it" },
    });
    // deterministic serialization (stable key order)
    expect(body).toBe(canonicalWebhookPayload(base));
  });

  it("signs and verifies round-trip", async () => {
    const secret = generateWebhookSecret();
    const ts = Date.now().toString();
    const body = canonicalWebhookPayload(base);
    const sig = await signWebhook(secret, ts, body);
    expect(sig.startsWith("sha256=")).toBe(true);
    const v = await verifyWebhookSignature(secret, ts, body, sig);
    expect(v.ok).toBe(true);
  });

  it("rejects tampered bodies and wrong secrets", async () => {
    const secret = generateWebhookSecret();
    const ts = Date.now().toString();
    const body = canonicalWebhookPayload(base);
    const sig = await signWebhook(secret, ts, body);

    const tampered = await verifyWebhookSignature(secret, ts, `${body}x`, sig);
    expect(tampered.ok).toBe(false);
    expect(tampered.reason).toBe("signature_mismatch");

    const wrongSecret = await verifyWebhookSignature(generateWebhookSecret(), ts, body, sig);
    expect(wrongSecret.ok).toBe(false);
  });

  it("rejects stale timestamps (replay protection)", async () => {
    const secret = generateWebhookSecret();
    const oldTs = (Date.now() - 10 * 60_000).toString();
    const body = canonicalWebhookPayload(base);
    const sig = await signWebhook(secret, oldTs, body);
    const v = await verifyWebhookSignature(secret, oldTs, body, sig);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("timestamp_out_of_tolerance");
  });

  it("retry backoff escalates and caps", () => {
    expect(webhookRetryDelayMs(1)).toBe(60_000);
    expect(webhookRetryDelayMs(2)).toBe(300_000);
    expect(webhookRetryDelayMs(3)).toBe(1_800_000);
    expect(webhookRetryDelayMs(4)).toBe(7_200_000);
    expect(webhookRetryDelayMs(5)).toBe(21_600_000);
    expect(webhookRetryDelayMs(99)).toBe(21_600_000); // capped
  });
});

describe("plugin manifests", () => {
  const valid = {
    id: "github",
    name: "GitHub",
    version: "1.0.0",
    permissions: ["github.repositories.read", "github.issues.read"],
    capabilities: ["issues", "repositories"],
  };

  it("accepts a valid manifest", () => {
    const res = validatePluginManifest(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.manifest.permissions).toHaveLength(2);
      expect(res.manifest.publisher).toBe("community"); // defaulted
    }
  });

  it("rejects invalid ids, versions and permissions", () => {
    for (const bad of [
      { ...valid, id: "GitHub!" },
      { ...valid, version: "one" },
      { ...valid, permissions: [] },
      { ...valid, permissions: ["not-namespaced"] },
      { ...valid, capabilities: [] },
    ]) {
      const res = validatePluginManifest(bad);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
    }
  });

  it("permission gate requires explicit grant; wildcards honored", () => {
    expect(pluginPermissionGranted(["github.issues.read"], "github.issues.read")).toBe(true);
    expect(pluginPermissionGranted(["github.issues.read"], "github.issues.write")).toBe(false);
    expect(pluginPermissionGranted([], "github.issues.read")).toBe(false);
    expect(pluginPermissionGranted(["github.*"], "github.issues.read")).toBe(true);
    expect(pluginPermissionGranted(["gitlab.*"], "github.issues.read")).toBe(false);
  });
});

describe("oauth primitives", () => {
  it("redirect allowlist is exact-match only (no open redirects)", () => {
    const allowed = ["https://app.example.com/callback"];
    expect(redirectUriAllowed(allowed, "https://app.example.com/callback")).toBe(true);
    // subdomain / path / scheme tricks all fail
    expect(redirectUriAllowed(allowed, "https://evil.example.com/callback")).toBe(false);
    expect(redirectUriAllowed(allowed, "https://app.example.com/callback/extra")).toBe(false);
    expect(redirectUriAllowed(allowed, "http://app.example.com/callback")).toBe(false);
  });

  it("scope grants are subset-checked with aliases normalized", () => {
    expect(scopeSubset(["pages:read"], ["pages:read", "tasks:write"])).toBe(true);
    expect(scopeSubset(["learning:read"], ["reviews:read"])).toBe(true);
    expect(scopeSubset(["agents:run"], ["agents:read"])).toBe(false);
  });

  it("PKCE S256 produces url-safe deterministic challenges", async () => {
    const c1 = await pkceChallengeS256("verifier-verifier-verifier");
    const c2 = await pkceChallengeS256("verifier-verifier-verifier");
    const c3 = await pkceChallengeS256("different-verifier");
    expect(c1).toBe(c2);
    expect(c1).not.toBe(c3);
    expect(c1).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding
    // RFC 7636 test vector
    const rfc = await pkceChallengeS256("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
    expect(rfc).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
