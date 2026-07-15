import { describe, it, expect } from "vitest";
import { savePage, savePages, saveAIChat, saveAIChats, upsertUserProfile, saveAgent, setOnboardingComplete } from "../supabaseService";

// Property 6: no null-owner writes in app.
// requireOwner throws before any Supabase call, so these reject without network.
// Spec: .kiro/specs/auth-rls-security-migration (Requirements 1.3, 6.2)
describe("owner-required write guards (Property 6)", () => {
  // Deliberately-invalid owner values, cast through `any` at each call site
  // below (not on the array itself) — this test exists specifically to
  // prove requireOwner() rejects falsy/wrong-typed owners at runtime, so
  // the values must NOT match the real `userId: string` signature.
  const badOwners = [undefined, null, "", 0, false];

  it.each(badOwners)("savePage rejects owner=%s", async (owner) => {
    await expect(savePage({ id: "p1", title: "x" } as any, owner as any)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it.each(badOwners)("savePages rejects owner=%s", async (owner) => {
    await expect(savePages([{ id: "p1" }] as any, owner as any)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it.each(badOwners)("saveAIChat rejects owner=%s", async (owner) => {
    await expect(saveAIChat({ id: "c1" } as any, owner as any)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it.each(badOwners)("saveAIChats rejects owner=%s", async (owner) => {
    await expect(saveAIChats([{ id: "c1" }] as any, owner as any)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it("upsertUserProfile rejects missing userId", async () => {
    // Deliberately missing the required `userId` field — this is what's
    // under test (requireOwner should reject it), so the object is cast
    // rather than completed with a fake id.
    await expect(upsertUserProfile({ userName: "x" } as any)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it("saveAgent rejects missing ownerId", async () => {
    // Same rationale as upsertUserProfile above — missing `ownerId` is
    // exactly the condition this test verifies gets rejected.
    await expect(saveAgent({ id: "a1", name: "x" } as any)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it("setOnboardingComplete rejects missing userId", async () => {
    await expect(setOnboardingComplete(null, "notes", "WS")).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it("savePages returns [] for empty input with a valid owner (no throw)", async () => {
    await expect(savePages([], "user-123")).resolves.toEqual([]);
  });
});
