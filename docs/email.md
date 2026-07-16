# Email System

## Overview

Noska uses **Resend** for all email delivery. Emails are sent via:
- **Supabase Edge Function** (`send-email`) — direct API calls from the admin panel
- **Trigger.dev jobs** (`email-queue`, `retry-emails`) — background processing for async sends
- **React Email** components — type-safe templates in `emails/`

## Infrastructure

```
Admin Panel → supabase.functions.invoke("send-email")
                  │
                  ▼
           send-email Edge Function
                  │
                  ├─→ Resend API (POST https://api.resend.com/emails)
                  │
                  ▼
           email_campaigns table (status update)
                  │
                  ▼
           Resend Webhook → resend-webhook Edge Function → email_events table
                  │
                  ▼
           Trigger.dev (email-queue / retry-emails)
```

## send-email Edge Function

**Location:** `supabase/functions/send-email/index.ts`

**Auth:** Requires `admin_token` in the request body. Validated via `validate_admin_session()` RPC.

**Endpoint:** `POST /functions/v1/send-email`

### Actions

#### `send_single`
Sends a single transactional email.

```json
{
  "admin_token": "...",
  "action": "send_single",
  "to": "user@example.com",
  "subject": "Welcome!",
  "html": "<p>Hello</p>",
  "text": "Hello"  // optional
}
```

#### `send_campaign`
Sends a bulk campaign to a list of recipients. Updates `email_campaigns.sent` and `.status` on completion. Supports `{{name}}` and `{{email}}` template variables.

```json
{
  "admin_token": "...",
  "action": "send_campaign",
  "campaign_id": "uuid",
  "campaign_name": "March Newsletter",
  "recipients": [{ "email": "...", "name": "..." }],
  "subject": "March Update",
  "html": "<p>Hi {{name}}...</p>"
}
```

#### `send_broadcast`
Sends a notification broadcast. Supports `target_type: "all"` (all users with emails) or `"selected"` (specific list).

```json
{
  "admin_token": "...",
  "action": "send_broadcast",
  "broadcast_id": "uuid",
  "title": "System Update",
  "message": "We'll be down for maintenance...",
  "type": "info",
  "target_type": "all",
  "target_users": null
}
```

#### `send_invite`
Sends a waitlist approval/invite email. Updates `waitlist_entries` with `invite_sent: true` and `status: "invited"`.

```json
{
  "admin_token": "...",
  "action": "send_invite",
  "waitlist_id": "uuid",
  "name": "Jane",
  "email": "jane@example.com"
}
```

### Auth Token Migration

Auth tokens are currently passed in the request **body** (`admin_token` field). The admin panel client sends the token this way:

```typescript
// admin/src/lib/email.ts
supabase.functions.invoke("send-email", {
  body: { ...options, admin_token: token }
});
```

The edge function extracts `admin_token` from the parsed body. You should not need to send it in the `Authorization` header for this function.

## Resend API Key Resolution

The `send-email` function resolves credentials in order:
1. Environment variables: `RESEND_API_KEY` and `FROM_EMAIL`
2. `platform_settings` table: `resend_api_key` and `from_email` key-value rows
3. Fallback: `"onboarding@resend.dev"` (Resend's default testing sender)

This allows admins to configure email settings via the admin panel UI without redeploying.

## Email Templates

**Location:** `emails/`

All templates use **React Email** (`@react-email/components`) with Tailwind CSS styling, which produces inline-styled HTML.

| Template | Props | Purpose |
|----------|-------|---------|
| `Welcome.tsx` | `name`, `workspaceName?` | New user welcome |
| `Announcement.tsx` | `title`, `message`, `ctaLabel?`, `ctaUrl?`, `recipientName?` | Product announcements |
| `Newsletter.tsx` | `title`, `previewText`, `sections[]`, `unsubscribeLink` | Email campaigns with multiple sections |
| `Invitation.tsx` | `inviterName`, `workspaceName`, `inviteLink` | Page/workspace collaboration invites |
| `VerifyEmail.tsx` | `name`, `verificationLink` | Email verification |
| `PasswordChanged.tsx` | `name` | Password change confirmation |
| `WaitlistApproved.tsx` | `name`, `inviteCode` | Waitlist admission with invite code |
| `WaitlistRejected.tsx` | `name` | Waitlist rejection notice |

### Adding New Templates

1. Create a new `.tsx` file in `emails/` using the React Email component library:

```tsx
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Tailwind } from "@react-email/components";

interface MyTemplateProps {
  name: string;
  link: string;
}

export default function MyTemplate({ name, link }: MyTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Preview text here</Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[480px] p-6">
            <Section className="rounded-xl bg-white p-8 shadow-sm">
              <Text className="text-2xl font-bold text-gray-900">Hello {name}</Text>
              <Section className="mt-6 text-center">
                <Button href={link} className="rounded-lg bg-indigo-600 px-6 py-3 text-white no-underline">
                  Action
                </Button>
              </Section>
              <Hr className="my-6 border-gray-200" />
              <Text className="text-xs text-gray-400">Footer</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

2. To preview templates locally, use the React Email CLI or import them into a preview route.
3. Wire the template into the `send-email` edge function by generating the HTML string (using `render` from `@react-email/components`) and passing it as the `html` field.
4. Add the corresponding call in `admin/src/lib/email.ts` if needed.

## Async Email Queue (Trigger.dev)

### `email-queue` Job
- **Cron:** every minute (`* * * * *`)
- **Purpose:** Processes `email_queue` table rows with `status: "pending"`
- **Batch size:** 100 rows per run
- **Flow:** Reads pending items → sends via Resend → marks as `"sent"` or `"failed"`
- **Retries:** Increments `retry_count` on failure

### `retry-emails` Job
- **Cron:** every 30 minutes (`*/30 * * * *`)
- **Purpose:** Retries failed emails from `email_events` table
- **Criteria:** `event: "failed"`, `retried: false`, older than 1 minute
- **Limit:** 50 per run

## Database Tables

### `email_campaigns`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Campaign name |
| `subject` | text | Email subject line |
| `html_content` | text | Rendered HTML body |
| `recipients` | jsonb | Array of {email, name} |
| `status` | text | `draft` → `scheduled` → `sending` → `sent` → `cancelled` → `failed` |
| `sent` | int | Count of successfully sent |
| `failed` | int | Count of failed sends |
| `scheduled_at` | timestamptz | When to start sending |
| `sent_at` | timestamptz | When sending completed |
| `created_at` | timestamptz | Row creation timestamp |

### `email_events`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `event` | text | `sent`, `delivered`, `opened`, `clicked`, `bounced`, `complained`, `failed`, `resent` |
| `recipient` | text | Email address |
| `subject` | text | Email subject |
| `message_id` | text | Resend message ID |
| `raw_payload` | jsonb | Full webhook payload |
| `retried` | boolean | Whether a retry has been attempted |
| `created_at` | timestamptz | Row creation timestamp |

### `email_queue`
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `recipient` | text | Email address |
| `subject` | text | Email subject |
| `html_content` | text | Rendered HTML |
| `status` | text | `pending`, `sent`, `failed` |
| `retry_count` | int | Number of retry attempts |
| `created_at` | timestamptz | Row creation timestamp |
| `sent_at` | timestamptz | When sent successfully |

## Campaign Status Lifecycle

```
draft ──→ scheduled ──→ sending ──→ sent
                  │                    │
                  │              (partial)
                  ▼                    ▼
              cancelled              failed
```

- **draft** — being composed, not ready
- **scheduled** — queued for delivery at `scheduled_at`
- **sending** — actively being sent (set by `send-email` or `email-queue`)
- **sent** — all recipients processed (may have partial failures in `failed` count)
- **cancelled** — manually cancelled before/during send
- **failed** — all attempts failed

## Rate Limiting Considerations

- **Resend rate limits:** Resend has account-based rate limits. For large campaigns, the sequential per-recipient loop in `send-email` naturally throttles delivery.
- **`email-queue` batch size:** Limited to 100 per minute via the cron job, providing a ceiling of ~6,000 emails/hour through the queue.
- **`retry-emails` limit:** 50 retries per 30-minute window.
- **Admin login rate limit:** 5 attempts per 15 minutes (applies to admin panel, not email).
