# Authentication

Noska has two distinct authentication systems:

1. **Main App** — Clerk (for end users)
2. **Admin Panel** — Custom (for internal staff)

## Main App (Clerk)

### Auth Providers

- **Google SSO** — OAuth via Clerk
- **Microsoft SSO** — OAuth via Clerk (Azure AD)
- **Email + Password** — Clerk-managed credentials
- **Magic Links** — via Clerk (future)

### Auth Flow

```
User visits site (unauthenticated)
  │
  ├─→ Marketing pages (public, no auth needed)
  │
  ├─→ /login → Clerk UI renders sign-in form
  │         │
  │         ├─→ Google OAuth → redirect to Google → callback at /sso-callback
  │         ├─→ Microsoft OAuth → redirect to Microsoft → callback at /sso-callback
  │         └─→ Email/password → Clerk validates credentials
  │
  └─→ Clerk sets session cookie → app reads useAuth() / useUser()
        │
        ├─→ Existing user with completed profile → workspace
        └─→ New user or incomplete profile → /onboarding wizard

Clerk Webhooks (clerk-webhook edge function):
  user.created  → upsert user_profiles (onboarding_complete: false)
  user.updated  → upsert user_profiles
  user.deleted  → delete user_profiles
```

### Implementation Details

**`src/main.tsx`:**
```tsx
<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/login">
  <Routes>
    <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback signInForceRedirectUrl="/login" />} />
    <Route path="/login" element={<App />} />
    <Route path="/onboarding" element={<App />} />
    <Route path="/:workspaceSlug" element={<App />} />
    <Route path="/:workspaceSlug/:pageId" element={<App />} />
  </Routes>
</ClerkProvider>
```

**`src/App.tsx` usage:**
```tsx
const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
const { user: clerkUser } = useUser();
const clerk = useClerk();
```

### User Profile Sync

The `clerk-webhook` edge function receives Clerk webhooks and syncs `user_profiles`:

- **Trigger:** Clerk Dashboard → Webhooks → add endpoint to `https://[project].supabase.co/functions/v1/clerk-webhook`
- **Events subscribed:** `user.created`, `user.updated`, `user.deleted`, `waitlistEntry.created`, `waitlistEntry.updated`
- **Verification:** Svix-based webhook signature verification using `CLERK_WEBHOOK_SECRET`
- **Behavior:** Upserts `user_profiles` on create/update, deletes on user deletion
- **Additional sync:** `sync-clerk-users` Trigger.dev job runs daily at 5 AM as a full backup sync

## Admin Panel (Custom Auth)

### Auth System

The admin panel at `/control` uses a completely separate authentication system:

- **User store:** `admin_users` table (not Clerk)
- **Password hashing:** bcrypt via Postgres `pgcrypto` (`crypt`/`gen_salt`)
- **Sessions:** `admin_sessions` table with SHA-512 hashed tokens
- **Auth transport:** Session token stored in `sessionStorage`, sent via RPC calls

### Admin Auth Flow

```
First visit → check_admin_exists() RPC
  │
  ├─ No admins → SetupFirstAdmin form
  │              ├─ email, name, password
  │              └─ setup_first_admin() RPC creates super_admin
  │
  └─ Admin exists → Login form
                     ├─ admin_login(email, password) RPC
                     │    ├─ verify_admin_password() checks bcrypt hash
                     │    │    └─ rate limited: 5 attempts / 15 min
                     │    ├─ creates admin_sessions row (SHA-512 hashed token)
                     │    └─ returns { token, user } JSON
                     │
                     └─ Token stored in sessionStorage
                          └─ validate_admin_session() RPC on every page load

Admin actions:
  Every CRUD RPC calls require_admin_role(p_token, min_role):
    1. Hash token with SHA-512
    2. Look up in admin_sessions (must exist, not expired, not lifted)
    3. Check admin_users.role against minimum rank

Logout:
  admin_logout(token) → sets sessions.lifted_at = now()
```

### Database Schema

**`admin_users`** table:
```sql
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',  -- super_admin, admin, support, developer, marketing
  password_hash text,                   -- bcrypt hash via pgcrypto
  avatar_url text,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**`admin_sessions`** table:
```sql
CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id),
  token text NOT NULL,                  -- SHA-512 hash of raw token
  expires_at timestamptz DEFAULT now() + interval '24 hours',
  lifted_at timestamptz,               -- set on logout / password change
  created_at timestamptz DEFAULT now()
);
```

**`admin_login_attempts`** table:
```sql
CREATE TABLE admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  attempted_at timestamptz DEFAULT now()
);
```

### Key RPCs

| RPC | Purpose | Auth Required |
|-----|---------|---------------|
| `check_admin_exists()` | Returns true if any admin exists | None (anon) |
| `setup_first_admin(email, name, password)` | Creates initial super_admin | None (fails if admin exists) |
| `admin_login(email, password)` | Authenticate and create session | None (rate-limited) |
| `admin_logout(token)` | Invalidate session | Session |
| `validate_admin_session(token)` | Validate token, return user info | Session |
| `require_admin_role(token, min_role)` | Check session + minimum role | Session (used internally) |
| `set_admin_password(email, password, token?)` | Change password (invalidates all sessions) | super_admin or initial setup |

### RBAC

Defined in `admin/src/lib/rbac.ts`:

```typescript
export const ROLE_RANK: Record<AdminRole, number> = {
  super_admin: 5,
  admin: 4,
  developer: 3,
  support: 2,
  marketing: 1
};

export function hasRole(user: AdminUser | null, minimum: AdminRole): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}
```

#### Permission Checks

| Permission | Minimum Role |
|-----------|-------------|
| `canManageAdmins()` | `super_admin` (5) |
| `canImpersonate()` | `super_admin` (5) |
| `canManageBilling()` | `admin` (4) |
| `canManageFeatureFlags()` | `admin` (4) |
| `canViewAuditLogs()` | `developer` (3) |
| `admin_select` (query any table) | `support` (2) |

## Security Features

### Rate Limiting

- **Admin login:** 5 attempts per email per 15-minute window
- Rate limiter uses a dedicated `admin_login_attempts` table — credential errors do NOT roll back the attempt recording (fixed critical bug in `20250715000001_enterprise_hardening.sql`)
- Password verification uses constant-time dummy hash to prevent timing attacks on non-existent users

### Session Security

- Raw tokens are 32-byte random hex strings (`gen_random_bytes(32)`)
- Stored as SHA-512 hashes in `admin_sessions`
- Tokens expire after 24 hours by default
- Password changes invalidate ALL active sessions for that admin
- `cleanup_expired_sessions()` removes sessions older than 7 days

### Password Policy

- Minimum 8 characters
- Must contain at least one letter and one digit
- Hashed with bcrypt (`gen_salt('bf')`) via Postgres `pgcrypto`

### Audit Logging

- All admin CRUD operations logged to `admin_audit_log` table
- Login/logout events recorded
- Password changes, admin creation/deletion, user bans all logged
- Minimum 30-day retention enforced by `cleanup_admin_audit_log()`

### Environment Variables

| Variable | Used In | Required |
|----------|---------|----------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Main SPA (Vite) | Yes |
| `CLERK_SECRET_KEY` | Edge Functions, Trigger.dev | Yes (for sync) |
| `CLERK_WEBHOOK_SECRET` | `clerk-webhook` edge function | Yes |
| `VITE_SUPABASE_URL` | Both SPAs | Yes |
| `VITE_SUPABASE_ANON_KEY` | Both SPAs | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions, Trigger.dev | Yes |
| `VITE_ADMIN_DEMO` | Admin SPA | Optional (dev only) |
