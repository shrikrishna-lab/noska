import { describe, it, expect } from "vitest";
import { parseDeepLink, consumePendingDeepLink, setPendingDeepLink } from "../deepLink";

describe("parseDeepLink", () => {
  it("parses all supported entities", () => {
    for (const entity of ["workspace", "page", "agent", "automation"]) {
      const parsed = parseDeepLink(`noska://${entity}/abc-123`);
      expect(parsed).not.toBeNull();
      expect(parsed!.entity).toBe(entity);
      expect(parsed!.id).toBe("abc-123");
    }
  });

  it("rejects non-noska protocols", () => {
    expect(parseDeepLink("https://page/abc")).toBeNull();
    expect(parseDeepLink("file:///etc/passwd")).toBeNull();
    expect(parseDeepLink("javascript:alert(1)")).toBeNull();
  });

  it("rejects unknown entities", () => {
    expect(parseDeepLink("noska://admin/abc")).toBeNull();
    expect(parseDeepLink("noska://settings/x")).toBeNull();
  });

  it("rejects malformed or oversized ids", () => {
    expect(parseDeepLink("noska://page/")).toBeNull();
    expect(parseDeepLink("noska://page/bad id with spaces!")).toBeNull();
    expect(parseDeepLink(`noska://page/${"a".repeat(129)}`)).toBeNull();
    // WHATWG URL normalization flattens dot segments before parsing, so
    // traversal attempts degrade to a plain id — assert no "../" survives.
    const traversed = parseDeepLink("noska://page/../secret");
    expect(traversed).toEqual({ entity: "page", id: "secret", params: {} });
  });

  it("keeps only safe query params", () => {
    const parsed = parseDeepLink("noska://page/p1?src=email&tab=notes&evil=<script>");
    expect(parsed).not.toBeNull();
    expect(parsed!.params.src).toBe("email");
    expect(parsed!.params.tab).toBe("notes");
    expect(parsed!.params.evil).toBeUndefined();
  });

  it("accepts garbage input without throwing", () => {
    expect(parseDeepLink("")).toBeNull();
    expect(parseDeepLink("not a url")).toBeNull();
    // Runtime hardening against callers ignoring types.
    expect(parseDeepLink(null as unknown as string)).toBeNull();
  });
});

describe("pending deep link parking", () => {
  it("consumes exactly once", () => {
    setPendingDeepLink({ entity: "page", id: "p1", params: {} });
    expect(consumePendingDeepLink()).toEqual({ entity: "page", id: "p1", params: {} });
    expect(consumePendingDeepLink()).toBeNull();
  });
});
