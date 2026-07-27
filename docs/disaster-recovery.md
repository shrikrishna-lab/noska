# Disaster Recovery

## Backup Strategy

### Database (Supabase)
- **Automatic backups**: Supabase Pro plan includes daily backups with 7-day retention
- **Manual backup**: Run via Supabase dashboard or CLI:
  ```bash
  supabase db dump --file backup-$(date +%Y%m%d).sql
  ```
- **Point-in-time recovery**: Available on Supabase Pro plan (enable in project settings)

### Environment Variables
- All env vars are documented in `.env.example`
- Store securely in:
  - Vercel project settings (production)
  - GitHub Actions secrets (CI/CD)
  - Local `.env.local` (development — never commit)

### Edge Functions
- All edge functions are version-controlled in `supabase/functions/`
- Deploy via `supabase functions deploy <name>`

## Restore Process

### Database Restore
```bash
# 1. Download latest backup from Supabase dashboard
# 2. Restore to target database
psql "$SUPABASE_DATABASE_URL" < backup-20260101.sql
```

### Full Platform Recovery
1. Deploy the last known good commit via Vercel rollback
2. Restore database from backup
3. Verify all services are operational via `System Health` in admin panel
4. Check Sentry for any new errors
5. Verify PostHog analytics are capturing events

## Database Migration Safety

### Migration Workflow
1. Create new migration file in `supabase/migrations/` with timestamp prefix
2. Apply migrations ONLY via `supabase db push` or the Supabase MCP tool
3. Never modify a migration that has already been applied

### Rollback Strategy
- Supabase migrations are applied sequentially
- To roll back: create a new migration that reverses the changes
- Never delete an applied migration file from git

## Deployment Rollback

### Vercel Rollback
1. Go to Vercel dashboard > Deployments
2. Find the last known good deployment
3. Click "..." > "Promote to Production"
4. Verify the rollback via monitoring dashboard

### Quick Rollback
```bash
# List recent deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-url>
```

## Monitoring Alerts

### Sentry Alerts
- Error rate spikes > 5% in 5 minutes
- New error types not seen in the last 7 days
- Any error in production affecting > 0.1% of users

### PostHog Alerts
- Drop in daily active users > 20%
- Drop in signup conversion > 10%
- Anomalous event volume

### System Health Checks
- Supabase project status
- Vercel deployment status
- Edge function response times
- Database connection pool usage

## Incident Response

### Severity Levels
- **SEV1**: Platform down for all users — immediate response
- **SEV2**: Feature broken for subset of users — respond within 1 hour
- **SEV3**: Minor issue, no user impact — respond within 24 hours

### Runbook
1. Check System Health dashboard
2. Check Sentry for error spikes
3. Check Supabase project status page
4. Check Vercel deployment status
5. Review recent deployments for problematic changes
6. Rollback if issue is deployment-related
7. Restore database from backup if data corruption
8. Notify users if SEV1 incident

## Recovery Testing

Recovery procedures should be tested quarterly:
1. Database restore from backup to staging environment
2. Vercel rollback to previous deployment
3. Edge function redeployment from git
4. Full environment setup from `.env.example`
