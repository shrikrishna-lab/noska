// Parse-only syntax check for Deno Edge Function sources.
// Uses Node's native TypeScript type-stripping (amaro) via node:module —
// it fully parses TS and throws on syntax errors without resolving imports.
import { stripTypeScriptTypes } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = process.argv.slice(2);
if (!roots.length) {
  console.error("usage: node scripts/check-edge-syntax.mjs <dir|file> [...]");
  process.exit(2);
}

const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) {
    for (const e of readdirSync(p)) {
      if (e === "node_modules" || e.startsWith(".")) continue;
      walk(join(p, e));
    }
  } else if (/\.(ts|tsx|mts|cts)$/.test(p)) files.push(p);
};
for (const r of roots) walk(r);

let bad = 0;
for (const f of files) {
  const source = readFileSync(f, "utf8");
  try {
    stripTypeScriptTypes(source, { mode: "strip" });
  } catch (err) {
    bad++;
    console.error(`✗ ${relative(process.cwd(), f)} — ${err?.constructor?.name}: ${String(err?.message ?? err).split("\n")[0]}`);
  }
}

console.log(`Checked ${files.length} file(s); ${bad} with syntax errors.`);
process.exit(bad ? 1 : 0);
