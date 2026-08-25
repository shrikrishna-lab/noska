/* MCP OAuth discovery + dynamic registration tests (§5, RFC 7591/8252) */
import { describe, it, expect } from "vitest";
import { validateDynamicRegistration } from "../../../supabase/functions/_shared/core/pure.ts";

describe("dynamic client registration (RFC 7591)", () => {
  it("accepts a valid https registration with defaults", () => {
    const res = validateDynamicRegistration({
      client_name: "Claude",
      redirect_uris: ["https://claude.ai/oauth/callback"],
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.meta.scopes).toEqual(["pages:read", "search:read"]); // least-privilege default
      expect(res.meta.grant_types).toContain("authorization_code");
    }
  });

  it("accepts RFC 8252 loopback redirects", () => {
    for (const uri of ["http://127.0.0.1:8765/callback", "http://localhost:3000/"]) {
      const res = validateDynamicRegistration({ client_name: "X", redirect_uris: [uri] });
      expect(res.ok).toBe(true);
    }
  });

  it("accepts custom-scheme redirects", () => {
    const res = validateDynamicRegistration({
      client_name: "Desktop app",
      redirect_uris: ["com.example.noska://oauth"],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects plain-http non-loopback and missing fields", () => {
    const bad = validateDynamicRegistration({
      client_name: "",
      redirect_uris: ["http://evil.example.com/callback"],
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes("redirect_uri"))).toBe(true);
      expect(bad.errors.some((e) => e.includes("client_name"))).toBe(true);
    }
  });

  it("rejects unsupported grant types", () => {
    const res = validateDynamicRegistration({
      client_name: "X",
      redirect_uris: ["https://a.b/cb"],
      grant_types: ["password"],
    });
    expect(res.ok).toBe(false);
  });

  it("explicit scopes pass through", () => {
    const res = validateDynamicRegistration({
      client_name: "X",
      redirect_uris: ["https://a.b/cb"],
      scope: "pages:read tasks:write",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.meta.scopes).toEqual(["pages:read", "tasks:write"]);
  });
});
