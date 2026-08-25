/* The server contract is duplicated by necessity: the Edge bundle only ships
 * supabase/**, the web app only ships src/**. This test makes drift loud. */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const appCopy = readFileSync(join(here, "../../../ai/runtime/serverContract.ts"), "utf8");
const edgeCopy = readFileSync(join(here, "../../../supabase/functions/_shared/ai/serverContract.ts"), "utf8");

describe("server contract duplication guard", () => {
  it("src and edge copies are byte-identical", () => {
    expect(appCopy).toBe(edgeCopy);
  });
});