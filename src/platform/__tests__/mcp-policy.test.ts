/* MCP policy engine tests (§9/§10/§29/§34/§44/§45) */
import { describe, it, expect } from "vitest";
import {
  authorizeTool, authorizeWorkspaceAction, keyHasScope, toolIsRead,
  roleCanWrite, roleCanAdmin, PolicyError, PolicyErrors,
  type PolicyKey, type PolicyTool,
} from "../../../supabase/functions/_shared/mcp/policy.ts";

const tool = (over: Partial<PolicyTool> = {}): PolicyTool => ({
  name: "create-pages", scope: "pages:write", risk: "YELLOW", ...over,
});
const key = (over: Partial<PolicyKey> = {}): PolicyKey => ({
  id: "k1", user_id: "u1", scopes: ["pages:read", "pages:write", "tasks:read"], ...over,
});

describe("scope gate", () => {
  it("allows tools inside the credential's scopes", () => {
    expect(() => authorizeTool(key(), tool())).not.toThrow();
  });
  it("denies tools outside scopes with INSUFFICIENT_SCOPE", () => {
    try {
      authorizeTool(key(), tool({ name: "run-agent", scope: "agents:run" }));
      throw new Error("should throw");
    } catch (e) {
      expect(e).toBeInstanceOf(PolicyError);
      expect((e as PolicyError).code).toBe("INSUFFICIENT_SCOPE");
      expect((e as PolicyError).extra).toMatchObject({ required_scope: "agents:run" });
    }
  });
  it("treats learning:* as reviews:*", () => {
    expect(keyHasScope(["learning:read"], "reviews:read")).toBe(true);
    expect(() => authorizeTool(key({ scopes: ["learning:read"] }), tool({ scope: "reviews:read", name: "list-reviews" }))).not.toThrow();
  });
});

describe("tool allowlist (§44 — per-client restrictions)", () => {
  it("empty allowlist permits everything scope-permitted", () => {
    expect(() => authorizeTool(key({ allowed_tools: [] }), tool())).not.toThrow();
  });
  it("named allowlist denies unlisted tools with TOOL_NOT_ALLOWED", () => {
    try {
      authorizeTool(key({ allowed_tools: ["search", "fetch"] }), tool());
      throw new Error("should throw");
    } catch (e) {
      expect((e as PolicyError).code).toBe("TOOL_NOT_ALLOWED");
      expect((e as PolicyError).extra).toMatchObject({ tool: "create-pages" });
    }
  });
  it("listed tools pass even alongside other scopes", () => {
    expect(() => authorizeTool(key({ allowed_tools: ["create-pages"] }), tool())).not.toThrow();
  });
});

describe("read-only mode (§10)", () => {
  it("blocks mutating tools", () => {
    try {
      authorizeTool(key({ read_only: true }), tool());
      throw new Error("should throw");
    } catch (e) {
      expect((e as PolicyError).code).toBe("READ_ONLY_CREDENTIAL");
    }
  });
  it("permits read-flavored tools", () => {
    expect(() => authorizeTool(key({ read_only: true }), tool({ name: "fetch", scope: "pages:read" }))).not.toThrow();
    expect(() => authorizeTool(key({ read_only: true, scopes: ["pages:read", "search:read"] }), tool({ name: "search", scope: "search:read" }))).not.toThrow();
  });
  it("read-only cannot run agents even with scope", () => {
    try {
      authorizeTool(key({ read_only: true, scopes: ["agents:run"] }), tool({ name: "run-agent", scope: "agents:run", executes: true }));
      throw new Error("should throw");
    } catch (e) {
      expect((e as PolicyError).code).toBe("READ_ONLY_CREDENTIAL");
    }
  });
  it("toolIsRead detects read scopes", () => {
    expect(toolIsRead("pages:read")).toBe(true);
    expect(toolIsRead("pages:write")).toBe(false);
    expect(toolIsRead("webhooks:manage")).toBe(false);
  });
});

describe("workspace roles (§29)", () => {
  it("viewer cannot write, can read", () => {
    expect(roleCanWrite("viewer")).toBe(false);
    expect(() => authorizeWorkspaceAction({ workspaceId: "w", role: "viewer" }, "read")).not.toThrow();
    expect(() => authorizeWorkspaceAction({ workspaceId: "w", role: "viewer" }, "write")).toThrow(PolicyError);
  });
  it("member can write but not administer", () => {
    expect(roleCanWrite("member")).toBe(true);
    expect(roleCanAdmin("member")).toBe(false);
    expect(() => authorizeWorkspaceAction({ workspaceId: "w", role: "member" }, "admin")).toThrow(PolicyError);
  });
  it("owner/admin can administer", () => {
    expect(() => authorizeWorkspaceAction({ workspaceId: "w", role: "owner" }, "admin")).not.toThrow();
    expect(() => authorizeWorkspaceAction({ workspaceId: "w", role: "admin" }, "admin")).not.toThrow();
  });
  it("non-members are denied outright", () => {
    try {
      authorizeWorkspaceAction({ workspaceId: "w", role: "none" }, "read");
      throw new Error("should throw");
    } catch (e) {
      expect((e as PolicyError).code).toBe("WORKSPACE_ACCESS_DENIED");
    }
  });
});

describe("structured error contract (§34)", () => {
  it("exposes stable codes and HTTP statuses", () => {
    expect(PolicyErrors.tokenRevoked().code).toBe("TOKEN_REVOKED");
    expect(PolicyErrors.tokenExpired().code).toBe("TOKEN_EXPIRED");
    expect(PolicyErrors.workspaceNotFound().status).toBe(404);
    expect(PolicyErrors.rateLimited(30).code).toBe("RATE_LIMITED");
    expect(PolicyErrors.rateLimited(30).extra).toMatchObject({ retry_after_seconds: 30 });
    expect(PolicyErrors.executionBudget(20).extra).toMatchObject({ limit_per_hour: 20 });
  });
});
