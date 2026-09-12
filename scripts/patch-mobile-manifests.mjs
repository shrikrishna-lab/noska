#!/usr/bin/env node
/**
 * Registers the `noska://` deep-link scheme in the generated native mobile
 * projects (src-tauri/gen/android, src-tauri/gen/apple).
 *
 * Run AFTER `tauri android init` / `tauri ios init` (and re-run safely any
 * time — every step is idempotent). CI runs this before building:
 *
 *   node scripts/patch-mobile-manifests.mjs
 *
 * - Android: adds a VIEW/BROWSABLE intent-filter for the `noska` scheme to
 *   MainActivity in AndroidManifest.xml (required by tauri-plugin-deep-link).
 * - iOS: adds CFBundleURLTypes with the `noska` scheme to Info.plist
 *   (via PlistBuddy — macOS/CI only; skipped gracefully elsewhere).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function patchAndroid() {
  const manifestPath = join(root, "src-tauri", "gen", "android", "app", "src", "main", "AndroidManifest.xml");
  if (!existsSync(manifestPath)) {
    console.log("[mobile] AndroidManifest.xml not found — run `npm run tauri android init` first. Skipping.");
    return false;
  }
  let xml = readFileSync(manifestPath, "utf8");

  if (xml.includes(`android:scheme="noska"`)) {
    console.log("[mobile] Android intent-filter for noska:// already present.");
    return true;
  }

  const intentFilter = `            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="noska" />
            </intent-filter>
`;

  // Tauri's template declares exactly one <activity> (MainActivity) with a
  // MAIN/LAUNCHER intent-filter. Insert ours right after that filter, inside
  // the <activity> element.
  const launcherAnchor = "</intent-filter>";
  const activityClose = "</activity>";
  const launcherIdx = xml.indexOf(launcherAnchor);
  const activityIdx = xml.indexOf(activityClose);

  if (launcherIdx === -1 || activityIdx === -1 || launcherIdx > activityIdx) {
    console.error("[mobile] Could not locate MainActivity intent-filter in AndroidManifest.xml — patch manually.");
    process.exitCode = 1;
    return false;
  }

  const insertAt = launcherIdx + launcherAnchor.length;
  xml = xml.slice(0, insertAt) + "\n" + intentFilter + xml.slice(insertAt);
  writeFileSync(manifestPath, xml, "utf8");
  console.log("[mobile] Added noska:// intent-filter to AndroidManifest.xml.");
  return true;
}

function patchIos() {
  // Find the generated Info.plist: src-tauri/gen/apple/<product>_iOS/Info.plist
  const genDir = join(root, "src-tauri", "gen", "apple");
  if (!existsSync(genDir)) {
    console.log("[mobile] src-tauri/gen/apple not found — run `npm run tauri ios init` first. Skipping.");
    return false;
  }

  const iosDir = readdirSync(genDir).find((d) => d.endsWith("_iOS"));
  if (!iosDir) {
    console.log("[mobile] No *_iOS project directory in gen/apple. Skipping.");
    return false;
  }
  const plistPath = join(genDir, iosDir, "Info.plist");
  if (!existsSync(plistPath)) {
    console.log(`[mobile] ${plistPath} missing. Skipping.`);
    return false;
  }

  const pb = "/usr/libexec/PlistBuddy";
  const run = (cmd) =>
    spawnSync(pb, ["-c", cmd, plistPath], { encoding: "utf8" });

  // Idempotency: check whether the scheme is already registered.
  const probe = run("Print :CFBundleURLTypes:0:CFBundleURLSchemes:0");
  if (probe.status === 0 && probe.stdout.trim() === "noska") {
    console.log("[mobile] iOS CFBundleURLTypes for noska:// already present.");
    return true;
  }

  const steps = [
    ["Add :CFBundleURLTypes array", true],
    ["Add :CFBundleURLTypes:0 dict", true],
    ["Add :CFBundleURLTypes:0:CFBundleURLName string dev.noska.app", true],
    ["Add :CFBundleURLTypes:0:CFBundleURLSchemes array", true],
    ["Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string noska", true],
  ];
  for (const [cmd] of steps) {
    const r = run(cmd);
    if (r.status !== 0 && !/Already Exists/i.test(r.stderr ?? "")) {
      console.warn(`[mobile] PlistBuddy: ${cmd} -> ${r.stderr?.trim()}`);
    }
  }
  console.log("[mobile] Added noska:// scheme to iOS Info.plist.");
  return true;
}

const results = [patchAndroid(), patchIos()];
if (results.every((r) => r !== false)) {
  console.log("[mobile] Manifest patching complete.");
} else {
  console.log("[mobile] Some projects were not present yet — re-run after `tauri init`.");
}
