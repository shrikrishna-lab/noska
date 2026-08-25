/**
 * Noska Agent OS — Server Contract (re-export shim).
 *
 * The canonical implementation lives in
 *   supabase/functions/_shared/ai/serverContract.ts
 * so the Edge Function bundle (which only ships supabase/**) and the
 * browser/Trigger.dev runtimes share one source of truth. Everything is
 * re-exported verbatim — types included.
 */
export * from "../../../supabase/functions/_shared/ai/serverContract.ts";