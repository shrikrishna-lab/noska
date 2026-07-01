import { describe, it, expect } from "vitest";
import { savePage, savePages, saveAIChat, saveAIChats, upsertUserProfile, saveAgent, setOnboardingComplete } from "../supabaseService";

// Property 6: no null-owner writes in app.
// requireOwner throws before any Supabase call, so these reject without network.
// Spec: .kiro/specs/auth-rls-security-migration (Requirements 1.3, 6.2)
describe("owner-required write guards (Property 6)", () => {
  const badOwners = [undefined, null, "", 0, false];

  it.each(badOwners)("savePage rejects owner=%s", async (owner) => {
    await expect(savePage({ id: "p1", title: "x" }, owner)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it.each(badOwners)("savePages rejects owner=%s", async (owner) => {
    await expect(savePages([{ id: "p1" }], owner)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it.each(badOwners)("saveAIChat rejects owner=%s", async (owner) => {
    await expect(saveAIChat({ id: "c1" }, owner)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it.each(badOwners)("saveAIChats rejects owner=%s", async (owner) => {
    await expect(saveAIChats([{ id: "c1" }], owner)).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it("upsertUserProfile rejects missing userId", async () => {
    await expect(upsertUserProfile({ userName: "x" })).rejects.toThrow(
      /without an authenticated user/
    );
  });

  it("saveAgent rejects missing ownerId", async () => {
    await expect(saveAgent({ id: "a1", name: "x" })).rejects.toThrow(
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
