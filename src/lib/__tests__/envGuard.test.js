import { describe, it, expect, vi, afterEach } from "vitest";

// Property 7: test-mode guard.
// envGuard evaluates env at module load, so each case stubs env then
// re-imports the module fresh.
// Spec: .kiro/specs/auth-rls-security-migration (Requirements 1.4, 6.3)
const PROD_URL = "https://yxgtmzksnyarlivgxujf.supabase.co";
const STAGING_URL = "https://staging-example.supabase.co";

async function loadGuard({ url, testMode }) {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", url);
  vi.stubEnv("VITE_TEST_MODE", testMode);
  return import("../envGuard.js");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("envGuard (Property 7)", () => {
  it("throws when test mode is combined with the production URL", async () => {
    await expect(loadGuard({ url: PROD_URL, testMode: "true" })).rejects.toThrow(
      /must never target the production Supabase project/
    );
  });

  it("yields TEST_MODE=true against a non-production URL with test mode on", async () => {
    const mod = await loadGuard({ url: STAGING_URL, testMode: "true" });
    expect(mod.TEST_MODE).toBe(true);
    expect(mod.IS_PROD_PROJECT).toBe(false);
  });

  it("forces TEST_MODE=false against production when test mode is off", async () => {
    const mod = await loadGuard({ url: PROD_URL, testMode: "false" });
    expect(mod.TEST_MODE).toBe(false);
    expect(mod.IS_PROD_PROJECT).toBe(true);
  });

  it("yields TEST_MODE=false against a non-production URL with test mode off", async () => {
    const mod = await loadGuard({ url: STAGING_URL, testMode: "false" });
    expect(mod.TEST_MODE).toBe(false);
    expect(mod.IS_PROD_PROJECT).toBe(false);
  });
});
