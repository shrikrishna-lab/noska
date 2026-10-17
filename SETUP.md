# Noska — Google & Slack Connector Setup

Connects Gmail, Google Calendar, Google Drive, and Slack through the
`connector-gateway` Edge Function (per-user OAuth, tokens AES-GCM
encrypted at rest, auto-refresh on expiry). Code reads credentials
**from env vars only** — never commit real secrets (see `.env.example`).

Deployed gateway callback (authorize this exact URL everywhere below):

```text
https://<project-ref>.supabase.co/functions/v1/connector-gateway/callback
```

For this project (`yxgtmzksnyarlivgxujf`):

```text
https://yxgtmzksnyarlivgxujf.supabase.co/functions/v1/connector-gateway/callback
```

## 1. Google — one OAuth client for Gmail + Calendar + Drive + Sheets

**Where:** Google Cloud Console → project **"Noska"** → *Google Auth Platform → Clients*.
Reuse the existing **"Noska Auth"** Web-application client. **Do not create a new client.**

**Manual console steps (must be done by a project owner — cannot be automated):**

1. **Client secret:** open the "Noska Auth" client → *Add secret* → copy the
   secret **once** at creation (it is never viewable again).
2. **Redirect URIs** (*Authorized redirect URIs → Add URI*): add the gateway
   callback above. Keep the existing Clerk callback
   (`https://clerk.noska.me/v1/oauth_callback`) untouched.
3. **APIs** (*APIs & Services → Library*): enable **Gmail API**,
   **Google Calendar API**, **Google Drive API**, and **Google Sheets API**
   if not already enabled.
4. **Scopes** (*Auth Platform → Data access → Add scopes*), least privilege:
   - `https://www.googleapis.com/auth/gmail.readonly` (list/read mail)
   - `https://www.googleapis.com/auth/gmail.send` (send mail)
   - `https://www.googleapis.com/auth/calendar.events` (list/create events)
   - `https://www.googleapis.com/auth/drive.readonly` (list/read files)
   - `https://www.googleapis.com/auth/spreadsheets` (read/write/append cell
     data — the Drive scopes do **not** cover spreadsheet contents)

**Env wiring (Supabase Dashboard → Project Settings → Edge Functions → Secrets,
plus local `.env` from `.env.example`):** the same client ID + secret six times:

```text
CONNECTOR_GMAIL_CLIENT_ID=        # "Noska Auth" client ID
CONNECTOR_GMAIL_CLIENT_SECRET=    # newly generated secret
CONNECTOR_CALENDAR_CLIENT_ID=     # same client ID
CONNECTOR_CALENDAR_CLIENT_SECRET= # same secret
CONNECTOR_DRIVE_CLIENT_ID=        # same client ID
CONNECTOR_DRIVE_CLIENT_SECRET=    # same secret
CONNECTOR_SHEETS_CLIENT_ID=       # same client ID
CONNECTOR_SHEETS_CLIENT_SECRET=   # same secret
```

## 2. Slack — new app

**Where:** https://api.slack.com/apps → *Create New App → From scratch*,
name e.g. `Noska`, pick your workspace.

**Manual console steps:**

1. *OAuth & Permissions → Redirect URLs → Add New Redirect URL*: paste the
   gateway callback above, then *Save URLs*.
2. *OAuth & Permissions → Scopes → Bot Token Scopes → Add*: `channels:read`,
   `channels:history`, `chat:write`, `users:read`, `im:history`.
3. *Basic Information → App Credentials*: copy **Client ID** and
   **Client Secret** into env:

```text
CONNECTOR_SLACK_CLIENT_ID=
CONNECTOR_SLACK_CLIENT_SECRET=
```

4. No install-to-workspace step needed here — each Noska user authorizes
   individually through Settings → Connections.

## 3. Verify end to end

1. Apply migrations: `supabase db push`
   (or `supabase db query --linked -f supabase/migrations/<file>.sql`).
2. Redeploy the function so new secrets load:
   `supabase functions deploy connector-gateway`.
3. Sign in at `https://app.noska.me` → Settings → Connections →
   **Connect** on Gmail / Calendar / Drive / Sheets / Slack → approve in the
   provider → connection row appears as `connected`.
4. Exercise operations (all run through `tools/call`, tokens stay server-side):
   - Gmail: `listGmailMessages()` / `readGmailMessage(id)` / `sendGmailMessage({to, subject, body})`
   - Calendar: `fetchCalendarEvents()` / `createCalendarEvent({summary, start, end?})`
   - Drive: `fetchDriveFiles()` / `readDriveFile(fileId)`
   - Sheets: `listSpreadsheets()` / `readSheetRange({spreadsheetId, range})` /
     `writeSheetRange({spreadsheetId, range, values})` /
     `appendSheetRow({spreadsheetId, range, values})` (range e.g. `"Sheet1!A1:D20"`)
   - Slack: `postSlackMessage({channel, text})`
   (see `src/platform/widgets/providers/gatewayData.ts`)
5. Disconnect: Settings → Connections → Disconnect (revokes server-side;
   Slack/Google authorization can also be removed at the provider).

## 4. Referrals (invite codes + tier rewards)

No console setup — fully database-driven, no secrets:

- Each user gets a unique `NOSKA-XXXXXX` code on first open of Plans &
  Billing → Referrals (stored in `referral_codes`).
- A newcomer links a code in the same tab (or via `?ref=CODE`, which
  prefills the box) → `user_referrals` row (`pending`).
- On the newcomer's **first paid activation**, `billing-webhooks` flips the
  row to `completed` and the referrer unlocks the highest tier their total
  qualifies for (`referral_rewards`: 12 active tiers).
- `ai_credits` tiers (250 / 500) auto-fulfill as spendable top-up grants —
  the usage engine draws from the same pool, so credits appear instantly.
  `xp` tiers bump the code counters. All other tiers (`pro_days`,
  `theme`, `founder_badge`, …) are recorded as unlocked
  (`reward_id` + `reward_claimed`) and fulfilled manually.
- Live coupon for checkout testing: `NOSKA50` (50% off, validated
  server-side in `billing-checkout`).

## 5. Troubleshooting

- *"missing OAuth client credentials — set CONNECTOR_*…"*: the env pair for
  that connector is not set on the Edge Function → step 1/2 env wiring,
  then redeploy.
- *Google `redirect_uri_mismatch` (400)*: the gateway callback URL is not in
  the client's *Authorized redirect URIs* → step 1.2. Must match exactly.
- *Slack `redirect_uri did not match`*: same fix in the Slack app → step 2.1.
- *Connection shows `expired`*: refresh token was rejected (revoked upstream
  or changed scopes) → Disconnect and Connect again.
