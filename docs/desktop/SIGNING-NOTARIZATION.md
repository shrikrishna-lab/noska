# Noska Desktop — Code Signing & Notarization

Unsigned builds still run, but trigger OS warnings and (on macOS Gatekeeper)
may be blocked for users who didn't build locally. Production releases should
be signed on every platform. **Never commit certificates or keys** — everything
below uses GitHub Actions secrets.

## Windows

- Obtain an OV or EV code-signing certificate (Sectigo, DigiCert, SSL.com…).
  EV certificates live on hardware tokens/HSMs; OV `.pfx` files can sign in CI.
- For an OV cert, add these secrets and extend the `tauri-action` env:
  ```
  WINDOWS_CERTIFICATE: base64 of the .pfx
  WINDOWS_CERTIFICATE_PASSWORD: pfx password
  ```
  Then add a signing step after the build (or use Tauri's native signing by
  setting `bundle > windows > certificateThumbprint` + `digestAlgorithm`
  and running on a runner whose cert store holds the certificate).
- EV/token-based certs cannot be used directly on GitHub runners; sign via a
  remote-signing service (e.g. Azure Trusted Signing, SSL.com eSigner) and set
  the corresponding tool's credentials as secrets.

## macOS (signing + notarization)

1. Apple Developer Program membership.
2. Create a **Developer ID Application** certificate; export it as `.p12`.
3. Secrets expected by the workflow (already wired):
   | Secret | Value |
   |---|---|
   | `APPLE_CERTIFICATE` | base64 of the `.p12` |
   | `APPLE_CERTIFICATE_PASSWORD` | `.p12` password |
   | `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Noska (TEAMID)` |
   | `APPLE_ID` | Apple ID email for notarization |
   | `APPLE_PASSWORD` | app-specific password (appleid.apple.com) |
   | `APPLE_TEAM_ID` | Team ID |
4. With those set, tauri-action signs the Universal binary and submits it for
   notarization automatically (`codesign` → `notarytool` → staple).

## Local release builds

`npm run tauri:build` produces unsigned artifacts — fine for testing installers
and update flows. To sign locally, export the same environment variables the
CI uses before invoking the command.

## Checklist

- [ ] Certificates stored only as GitHub secrets / local keychains
- [ ] `.p12`/`.key` never present in repo history (`.tauri/` is gitignored)
- [ ] First signed release verified on a clean machine (Gatekeeper + SmartScreen)
