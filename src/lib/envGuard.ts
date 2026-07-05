// Environment guard — makes it structurally impossible for VITE_TEST_MODE to
// bypass authentication against the production Supabase project.
//
// The guarantee is bound to the production project URL, not a boolean flag:
// if test mode is combined with the production URL, the app throws at startup
// instead of booting into an auth-bypassed state.
//
// Spec: .kiro/specs/auth-rls-security-migration (Requirements 1.4, 6.3)

// Confirmed production project ref: yxgtmzksnyarlivgxujf
export const PROD_SUPABASE_URL = "https://yxgtmzksnyarlivgxujf.supabase.co";

const url = import.meta.env.VITE_SUPABASE_URL;
const testModeRequested = import.meta.env.VITE_TEST_MODE === "true";

// True when the app is pointed at the production project.
export const IS_PROD_PROJECT = url === PROD_SUPABASE_URL;

if (testModeRequested && IS_PROD_PROJECT) {
  throw new Error(
    "[envGuard] VITE_TEST_MODE must never target the production Supabase project " +
    `(${PROD_SUPABASE_URL}). Refusing to boot with auth bypassed against production.`
  );
}

// Test mode is honored ONLY against a non-production project. Against production
// it is forced off, so no code path can bypass auth in prod.
export const TEST_MODE = testModeRequested && !IS_PROD_PROJECT;
