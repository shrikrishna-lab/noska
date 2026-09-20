export function allowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password &&
      !url.port && !url.hash && (
        url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname === "web.push.apple.com" ||
        url.hostname.endsWith(".notify.windows.com")
      );
  } catch {
    return false;
  }
}

export async function authorizedWorker(request: Request, key: string): Promise<boolean> {
  if (!key) return false;
  const provided = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(key)),
  ]);
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
