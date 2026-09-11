import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js";

// Public read endpoint for in-app info cards (announcement banners). The
// table itself is RLS-protected (active cards in their display window only);
// this function mirrors that filter with the service-role client and adds
// platform resolution so one endpoint serves web, desktop, or both.

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  // baggage/traceparent/sentry-trace are auto-injected by PostHog/Sentry
  // browser SDKs into every fetch — rejecting them breaks preflight in prod.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, baggage, traceparent, sentry-trace",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform"); // web | desktop | unset = all
  if (platform && platform !== "web" && platform !== "desktop") {
    return new Response(JSON.stringify({ error: "platform must be 'web' or 'desktop'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let query = supabase
    .from("info_cards")
    .select("id, title, body, icon, accent, platform, dismissible, action_url, action_label, starts_at, ends_at, updated_at")
    .eq("is_active", true)
    .lte("starts_at", new Date().toISOString())
    .or("ends_at.is.null,ends_at.gt." + new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(10);

  if (platform) {
    query = query.in("platform", [platform, "both"]);
  }

  const { data, error } = await query.select();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ cards: data ?? [] }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // Cards change rarely; a short shared cache keeps every client from
      // hitting the function on each app open. Dismissal state is local, so
      // even a cached list renders correctly per device.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
});
