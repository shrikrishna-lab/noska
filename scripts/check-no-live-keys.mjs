// Scans tracked files for committed Stripe (or other) live secrets.
// Fails CI on live keys (sk_live_, rk_live_, whsec_...); warns on test keys
// outside .env.example/docs so they never leak by habit.
// Usage: node scripts/check-no-live-keys.mjs
import { execSync } from "node:child_process";

const LIVE = [
  /(?<![A-Za-z0-9_])sk_live_[A-Za-z0-9]{10,}/,
  /(?<![A-Za-z0-9_])rk_live_[A-Za-z0-9]{10,}/,
  /(?<![A-Za-z0-9_])whsec_[A-Za-z0-9]{10,}/,
  /(?<![A-Za-z0-9_])rzp_live_[A-Za-z0-9]+/,
];
// Matches that are obviously placeholders, never real secrets.
const PLACEHOLDER = /(\.\.\.|xxxx|XXXX|YOUR_|EXAMPLE|<\w|YOURKEY|CHANGEME|REPLACE)/i;
const TEST = [/sk_test_[A-Za-z0-9]+/, /rk_test_[A-Za-z0-9]+/];

let files = [];
try {
  files = execSync("git ls-files", { encoding: "utf8" }).split("\n").map((s) => s.trim()).filter(Boolean);
} catch {
  console.error("check-no-live-keys: not a git repo, skipping");
  process.exit(0);
}

const skipDirs = ["node_modules/", "dist/", "dist-desktop/", "dist-mobile/", ".git/"];
const skipFiles = new Set(["package-lock.json"]);
const { readFileSync } = await import("node:fs");

let failed = false;
for (const f of files) {
  if (skipDirs.some((d) => f.startsWith(d)) || skipFiles.has(f)) continue;
  let text;
  try {
    text = readFileSync(f, "utf8");
  } catch {
    continue; // binary/unreadable
  }
  for (const re of LIVE) {
    const m = text.match(re);
    if (m && !PLACEHOLDER.test(m[0])) {
      console.error(`LIVE SECRET in tracked file: ${f} (${re})`);
      failed = true;
    }
  }
  if (f !== ".env.example" && !f.endsWith(".md")) {
    for (const re of TEST) {
      if (re.test(text)) console.warn(`warning: test key in tracked file: ${f} (${re})`);
    }
  }
}
if (failed) {
  console.error("\nRefusing: live secrets must never be committed. Use secret vaults / env vars.");
  process.exit(1);
}
console.log(`check-no-live-keys: ok (${files.length} files scanned)`);
