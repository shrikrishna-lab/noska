import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"
import { Webhook } from "npm:svix"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") ?? ""
const CLERK_API = "https://api.clerk.com/v1"

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    })
  }

  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: "Missing svix headers" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const rawBody = await req.text()
  const secret = Deno.env.get("CLERK_WEBHOOK_SECRET")

  if (!secret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: Record<string, unknown>
  try {
    const wh = new Webhook(secret)
    body = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const eventType = body.type as string
  const data = body.data as Record<string, unknown> | undefined

  if (!data) {
    return new Response(JSON.stringify({ error: "No data in webhook" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  switch (eventType) {
    case "user.created":
    case "user.updated": {
      const clerkId = data.id as string
      const emailAddresses = data.email_addresses as Array<Record<string, unknown>> | undefined
      const email = emailAddresses?.[0]?.email_address as string | undefined
      const firstName = (data.first_name as string) ?? ""
      const lastName = (data.last_name as string) ?? ""
      const name = `${firstName} ${lastName}`.trim() || (data.username as string) || "Workspace User"
      const avatarUrl = data.image_url as string | undefined
      const externalAccounts = data.external_accounts as Array<Record<string, unknown>> | undefined

      // Extract OAuth provider IDs for duplicate protection
      let githubId: string | null = null
      let googleId: string | null = null
      let microsoftId: string | null = null
      if (externalAccounts) {
        for (const acct of externalAccounts) {
          const provider = acct.provider as string | undefined
          const providerUserId = acct.provider_user_id as string | undefined
          if (provider === "github" && providerUserId) githubId = providerUserId
          else if (provider === "google" && providerUserId) googleId = providerUserId
          else if (provider === "microsoft" && providerUserId) microsoftId = providerUserId
        }
      }

      // On user.created, check if email is approved
      if (eventType === "user.created" && email) {
        // Duplicate protection: check if any OAuth ID already exists
        if (githubId || googleId || microsoftId) {
          const dupQuery = supabase.from("waitlist_entries").select("id, email")
          const dupFilters: string[] = []
          if (githubId) dupFilters.push(`github_id.eq.${githubId}`)
          if (googleId) dupFilters.push(`google_id.eq.${googleId}`)
          if (microsoftId) dupFilters.push(`microsoft_id.eq.${microsoftId}`)
          // We'll check each independently since Supabase OR is clunky here
          for (const providerField of ["github_id", "google_id", "microsoft_id"]) {
            const val = providerField === "github_id" ? githubId : providerField === "google_id" ? googleId : microsoftId
            if (!val) continue
            const { data: dup } = await supabase
              .from("waitlist_entries")
              .select("id, email")
              .eq(providerField, val)
              .neq("email", email.toLowerCase())
              .maybeSingle()
            if (dup && CLERK_SECRET_KEY) {
              console.warn(`Duplicate ${providerField} detected for ${email}, blocking creation`)
              try {
                await fetch(`${CLERK_API}/users/${clerkId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
                })
              } catch (e) {
                console.error("Failed to delete duplicate Clerk user:", e)
              }
              return new Response(JSON.stringify({ error: `Account with this ${providerField.replace('_id','')} already exists. User deleted.` }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
              })
            }
          }
        }

        const { data: approved } = await supabase
          .from("approved_emails")
          .select("id")
          .eq("email", email.toLowerCase())
          .maybeSingle()

        if (!approved && CLERK_SECRET_KEY) {
          console.warn(`Blocking unapproved user: ${email}`)
          try {
            await fetch(`${CLERK_API}/users/${clerkId}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
            })
          } catch (e) {
            console.error("Failed to delete unapproved Clerk user:", e)
          }
          return new Response(JSON.stringify({ error: "Email not approved. User deleted." }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          })
        }
      }

      // user.created: seed a fresh profile (onboarding pending).
      // user.updated: ONLY sync identity fields. Resetting
      // onboarding_complete here re-onboarded existing users on every
      // profile tweak (avatar/name change) — after login they were sent
      // back to the create page instead of their workspace.
      const profilePayload =
        eventType === "user.created"
          ? {
              user_id: clerkId,
              user_name: name,
              email: email ?? null,
              avatar_url: avatarUrl ?? null,
              onboarding_complete: false,
              use_case: null,
              workspace_name: "My Workspace",
              preferences: {},
            }
          : {
              user_id: clerkId,
              user_name: name,
              email: email ?? null,
              avatar_url: avatarUrl ?? null,
            }

      const { error } = await supabase
        .from("user_profiles")
        .upsert(profilePayload, { onConflict: "user_id" })

      if (error) {
        console.error("Error upserting user profile:", error)
        return new Response(JSON.stringify({ error: "Failed to upsert user" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Mark invite as accepted in waitlist_entries
      if (email) {
        const updateData: Record<string, unknown> = {
          status: "accepted",
          accepted: true,
          first_login_at: new Date().toISOString(),
        }
        if (githubId) updateData.github_id = githubId
        if (googleId) updateData.google_id = googleId
        if (microsoftId) updateData.microsoft_id = microsoftId
        await supabase
          .from("waitlist_entries")
          .update(updateData)
          .eq("email", email.toLowerCase())
          .is("accepted", false)

        // Update approved_emails too
        await supabase
          .from("approved_emails")
          .update({ status: "accepted" })
          .eq("email", email.toLowerCase())
      }

      // Link the notification identity so Clerk users resolve a notification
      // user id (Settings + Inbox). Best-effort: never blocks signup when no
      // GoTrue user shares this email yet.
      if (email && /^user_[A-Za-z0-9]+$/.test(clerkId)) {
        try {
          const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
          const match = users.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase())
          if (match) {
            await supabase.rpc("notification_register_identity", { p_clerk_sub: clerkId, p_user_id: match.id })
          }
        } catch (e) {
          console.error("Failed to link notification identity:", e)
        }
      }
      break
    }

    case "user.deleted": {
      const clerkId = data.id as string
      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", clerkId)

      if (error) {
        console.error("Error deleting user profile:", error)
        return new Response(JSON.stringify({ error: "Failed to delete user" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }
      break
    }

    case "waitlistEntry.created": {
      const entryEmail = data.email as string | undefined
      if (entryEmail) {
        const { error } = await supabase
          .from("waitlist_entries")
          .upsert({
            name: entryEmail.split("@")[0],
            email: entryEmail,
            provider: "clerk",
            status: "waiting",
            joined_at: new Date().toISOString(),
            referral_count: 0,
            invite_sent: false,
            accepted: false,
          }, { onConflict: "email" })

        if (error) {
          console.error("Error upserting waitlist entry:", error)
        }
      }
      break
    }

    case "waitlistEntry.updated": {
      const updatedEmail = data.email as string | undefined
      const updatedStatus = data.status as string | undefined
      if (updatedEmail && updatedStatus) {
        const { error } = await supabase
          .from("waitlist_entries")
          .update({ status: updatedStatus })
          .eq("email", updatedEmail)

        if (error) {
          console.error("Error updating waitlist entry:", error)
        }
      }
      break
    }

    default:
      console.log(`Unhandled webhook event type: ${eventType}`)
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
