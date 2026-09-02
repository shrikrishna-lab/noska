# Noska Desktop — Releases & Auto-Update

## How a release ships

1. Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json`
   (`version` field). They should always match for desktop releases.
2. Tag and push:
   ```bash
   git tag desktop-v1.0.1
   git push origin desktop-v1.0.1
   ```
3. GitHub Actions (`.github/workflows/release-desktop.yml`) builds on native
   runners in parallel:
   | Runner | Artifacts |
   |---|---|
   | `windows-latest` | `.exe` (NSIS), `.msi`, signed `.zip` updater artifact |
   | `macos-latest` | Universal `.dmg` + `.app` (Apple Silicon + Intel) |
   | `ubuntu-22.04` | `.AppImage`, `.deb`, `.rpm` |
4. The job uploads everything to a **draft** GitHub release named
   `Noska Desktop v<version>` and generates the updater manifest
   (`latest.json`) with signatures.
5. The `publish-public` job mirrors the signed artifacts + `latest.json` to
   the **public distribution repo** (`shrikrishna-lab/noska-desktop-releases`)
   and rewrites the manifest's download URLs to point there. Running apps
   check updates via:
   ```
   https://github.com/shrikrishna-lab/noska-desktop-releases/releases/latest/download/latest.json
   ```

## Update flow in the app

`src/lib/desktop/updater.ts` exposes `checkForUpdate()` which returns update
metadata (version + notes) or null; call `update.install()` to download,
install and relaunch (Windows uses a passive installer). Dev builds return
null immediately so local development never touches production update
infrastructure.

## Required repository secrets

| Secret | Purpose |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `.tauri/noska.key` (gitignored). Signs updater artifacts. Already set for `shrikrishna-lab/noska`. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password of the signing key. Local copy: `.tauri/password.txt` (gitignored). Already set. |
| Apple vars (optional until macOS signing is set up) | See SIGNING-NOTARIZATION.md |

Note: the key was deliberately generated WITH a password — on Windows an
empty-password key makes the CLI hang waiting for interactive input, because
Windows cannot hold empty-string environment variables.

## Key management rules

- The private signing key lives only in GitHub secrets (and locally in
  `.tauri/`, which is gitignored).
- Losing it does not break installing, but **updates can no longer be signed**
  for existing installs until you ship one final unsigned-key migration build
  with a new pubkey baked into `tauri.conf.json`.
- Rotate by: generating a new pair (`npx tauri signer generate`), updating the
  `pubkey` in `tauri.conf.json`, releasing once with that build.

## Versioning notes

- `latest.json` version comes from `tauri.conf.json → version`; the updater
  compares semver against the installed app, so never publish an equal/lower
  version.
- Windows users on NSIS installs update via the passive embedded installer;
  MSI users reinstall manually (documented behavior of Tauri's MSI path).

## Manual smoke test before publishing

On each platform: fresh install → login → workspace load → editor → tray →
deep link (`noska://page/x`) → notification → update check against the draft
release (temporarily publish privately or point endpoints at the draft URL).
