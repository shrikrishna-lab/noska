import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js"
import { Webhook } from "npm:svix"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const supabase = createClient(supabaseUrl, supabaseKey)

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

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: clerkId,
          user_name: name,
          email: email ?? null,
          avatar_url: avatarUrl ?? null,
          onboarding_complete: false,
          use_case: null,
          workspace_name: "My Workspace",
          preferences: {},
        }, { onConflict: "user_id" })

      if (error) {
        console.error("Error upserting user profile:", error)
        return new Response(JSON.stringify({ error: "Failed to upsert user" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
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

    default:
      console.log(`Unhandled webhook event type: ${eventType}`)
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})
