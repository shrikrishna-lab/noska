# Local two-user test harness (dev only).
#
# Boots the Vite dev server against the LOCAL Supabase stack with TEST_MODE on
# and an explicit user identity, so the browser session is authenticated with a
# real JWT and RLS is genuinely evaluated. This is what makes the share /
# request-access / fork flows testable with two different people.
#
#   pwsh scripts/dev-local-user.ps1 -User alice@local.test -Port 5181
#   pwsh scripts/dev-local-user.ps1 -User bob@local.test   -Port 5182
#
# Requires the local stack (supabase start) and .env.local to hold the local
# keys. Never points at production: envGuard refuses TEST_MODE when
# VITE_SUPABASE_URL is the production project.
param(
  [Parameter(Mandatory = $true)][string]$User,
  [int]$Port = 5181,
  [string]$Password = "local-test-pass-123"
)

$ErrorActionPreference = "Stop"

$anon = [regex]::Match((Get-Content .env.local -ErrorAction SilentlyContinue | Out-String), 'VITE_SUPABASE_ANON_KEY\s*=\s*"?([^"\r\n]+)"?').Groups[1].Value
if (-not $anon) {
  $anon = [regex]::Match((Get-Content .env.local | Out-String), 'SUPABASE_ANON_KEY\s*=\s*"?([^"\r\n]+)"?').Groups[1].Value
}
if (-not $anon) {
  throw "No local anon key found in .env.local (expected VITE_SUPABASE_ANON_KEY)."
}

$env:VITE_SUPABASE_URL = "http://127.0.0.1:54321"
$env:VITE_SUPABASE_ANON_KEY = $anon
$env:VITE_TEST_MODE = "true"
$env:VITE_TEST_USER_EMAIL = $User
$env:VITE_TEST_USER_PASSWORD = $Password

Write-Host "Starting dev server for $User on http://127.0.0.1:$Port (local Supabase)" -ForegroundColor Cyan
& npx vite --host 127.0.0.1 --port $Port --strictPort