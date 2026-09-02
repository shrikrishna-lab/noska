// PKCE (RFC 7636, S256) helpers for the desktop browser-auth handoff.
//
// The desktop holds the code_verifier and never shares it; only the derived
// S256 challenge travels to the server when the transaction is created. The
// browser completion page attaches its identity to the transaction without
// ever seeing the verifier, so a leaked transaction id alone is worthless.

const VERIFIER_BYTES = 32; // → 43 base64url chars (RFC minimum)

export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** High-entropy random code_verifier (43 base64url chars). */
export function createCodeVerifier(): string {
  const bytes = new Uint8Array(VERIFIER_BYTES);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

/** URL-safe random value for CSRF state checks. */
export function createStateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

/** S256 challenge for a verifier: base64url(SHA-256(verifier)). */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64urlEncode(new Uint8Array(digest));
}
