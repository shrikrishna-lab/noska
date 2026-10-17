#!/usr/bin/env node
/**
 * Dev server over HTTPS with a trusted certificate.
 *
 * Browsers only expose getUserMedia in a secure context, and only
 * `localhost` / `127.0.0.1` are exempt over plain HTTP. A mapped dev host
 * such as `app.noska.me` therefore needs a real certificate, otherwise
 * voice input is dead on arrival.
 *
 * Certificates come from mkcert, whose local CA is trusted by the OS and
 * browsers, so no certificate warning appears and the origin counts as
 * secure. Vite picks them up through VITE_HTTPS_KEY / VITE_HTTPS_CERT.
 *
 *   node scripts/dev-https.mjs                 # ensure certs, then serve
 *   node scripts/dev-https.mjs --certs-only    # just (re)generate certs
 *   node scripts/dev-https.mjs --port 443
 *   node scripts/dev-https.mjs --install-ca    # first-time CA install (admin)
 *   node scripts/dev-https.mjs --host app.noska.me --extra-host localhost
 *
 * Port 443 is the default on purpose: Clerk production keys only accept
 * noska.me origins, and the origin has to match production exactly or
 * sign-in fails. A port such as 5176 enables the microphone but is
 * rejected by Clerk, and binding 443 needs an elevated shell on Windows.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const PORT = option("port", "443");
const HOST = option("host", "app.noska.me");
const EXTRA_HOSTS = ["localhost", "127.0.0.1", ...argv.filter((_, i) => argv[i - 1] === "--extra-host")];
const HOSTS = [...new Set([HOST, ...EXTRA_HOSTS])];
const CERTS_DIR = path.resolve(process.cwd(), ".certs");
const KEY_FILE = path.join(CERTS_DIR, `${HOST}-key.pem`);
const CERT_FILE = path.join(CERTS_DIR, `${HOST}.pem`);
const CA_FILE = path.join(CERTS_DIR, "rootCA.pem");

function isStale() {
  if (!existsSync(KEY_FILE) || !existsSync(CERT_FILE)) return true;
  const age = Date.now() - statSync(CERT_FILE).mtimeMs;
  return age > 30 * 24 * 60 * 60 * 1000;
}

function findMkcert() {
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", ["mkcert"], { encoding: "utf8" });
  if (probe.status !== 0) return null;
  const first = (probe.stdout || "").split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return first ?? null;
}

/** mkcert is a plain executable, so it is spawned without a shell. */
function runMkcert(mkcert, args, options = {}) {
  return spawnSync(mkcert, args, { encoding: "utf8", ...options });
}

function installCa(mkcert) {
  console.log("Installing the mkcert root CA into the system trust store…");
  const res = runMkcert(mkcert, ["-install"], { stdio: "inherit" });
  if (res.status !== 0) {
    console.error("\n  CA install failed. Re-run from an elevated (Administrator) terminal.\n");
    process.exit(res.status ?? 1);
  }
}

function caIsInstalled(mkcert) {
  const res = runMkcert(mkcert, ["-CAROOT"]);
  if (res.status !== 0) return false;
  const caroot = (res.stdout || "").trim().split(/\r?\n/).pop()?.trim();
  return Boolean(caroot && existsSync(path.join(caroot, "rootCA.pem")));
}

function generateCerts(mkcert) {
  mkdirSync(CERTS_DIR, { recursive: true });
  console.log(`Generating certificate for ${HOSTS.join(", ")}…`);
  const res = runMkcert(mkcert, ["-key-file", KEY_FILE, "-cert-file", CERT_FILE, ...HOSTS], { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
  const caroot = runMkcert(mkcert, ["-CAROOT"]);
  const root = (caroot.stdout || "").trim().split(/\r?\n/).pop()?.trim();
  if (root && existsSync(path.join(root, "rootCA.pem"))) {
    writeFileSync(CA_FILE, readFileSync(path.join(root, "rootCA.pem")));
  }
}

function ensureMkcert() {
  const found = findMkcert();
  if (found) return found;
  console.error(
    [
      "",
      "  mkcert is required to generate a trusted dev certificate.",
      "",
      "  Install it (winget):",
      "    winget install FiloSottile.mkcert",
      "",
      "  Then create and trust the local CA once (needs an elevated prompt):",
      '    node scripts/dev-https.mjs --install-ca',
      "",
      "  After that, `npm run dev:https` works on every run.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const mkcert = ensureMkcert();

if (flag("install-ca")) installCa(mkcert);
if (!caIsInstalled(mkcert)) {
  console.error(
    [
      "",
      "  The mkcert CA is not trusted yet, so the browser would still block the microphone.",
      "  Install it once with an elevated prompt:",
      '    node scripts/dev-https.mjs --install-ca',
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (flag("certs-only") || isStale()) generateCerts(mkcert);
else console.log("Reusing the existing certificate in .certs/");

if (flag("certs-only")) {
  const fingerprint = createHash("sha256").update(readFileSync(CERT_FILE)).digest("hex").slice(0, 16);
  console.log(`\n  key:  ${KEY_FILE}\n  cert: ${CERT_FILE}\n  sha256: ${fingerprint}\n`);
  process.exit(0);
}

const url = `https://${HOST}:${PORT}/`;
console.log(`\n  Serving ${url}\n  Microphone, camera and clipboard are available on this origin.\n`);
if (Number(PORT) < 1024) {
  console.log("  Port 443 needs an elevated shell on Windows. Start this from an Administrator terminal.\n");
}

const viteBin = path.resolve(process.cwd(), "node_modules", "vite", "bin", "vite.js");
if (!existsSync(viteBin)) {
  console.error("\n  Vite is not installed. Run `npm install` first.\n");
  process.exit(1);
}

const child = spawn(process.execPath, [viteBin, "--host", HOST, "--port", PORT, "--strictPort"], {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_HTTPS_KEY: KEY_FILE,
    VITE_HTTPS_CERT: CERT_FILE,
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
