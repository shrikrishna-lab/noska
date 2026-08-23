// noska:// deep-link parsing and validation.
//
// Accepted forms (everything else is rejected):
//   noska://workspace/<id>
//   noska://page/<id>
//   noska://agent/<id>
//   noska://automation/<id>
//
// Deep links are untrusted input (email, browser, other apps). IDs must match
// a strict charset, query params are filtered to a safe subset, and unknown
// entities never reach the router.

export type DeepLinkEntity =
  | "workspace"
  | "page"
  | "agent"
  | "automation";

export interface ParsedDeepLink {
  entity: DeepLinkEntity;
  id: string;
  params: Record<string, string>;
}

const ALLOWED_ENTITIES: ReadonlySet<string> = new Set([
  "workspace",
  "page",
  "agent",
  "automation",
]);

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const PARAM_PATTERN = /^[\w .@:%-]{1,256}$/;

export const DEEP_LINK_EVENT = "noska:deep-link";
export const TRAY_ACTION_EVENT = "noska:tray-action";

export function parseDeepLink(raw: string): ParsedDeepLink | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "noska:") return null;

  const entity = url.hostname.toLowerCase();
  if (!ALLOWED_ENTITIES.has(entity)) return null;

  let id: string;
  try {
    id = decodeURIComponent(url.pathname.replace(/^\/+/, "").replace(/\/+$/, ""));
  } catch {
    return null;
  }
  if (!ID_PATTERN.test(id)) return null;

  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (PARAM_PATTERN.test(key) && PARAM_PATTERN.test(value)) {
      params[key] = value;
    }
  });

  return { entity: entity as DeepLinkEntity, id, params };
}

let pendingDeepLink: ParsedDeepLink | null = null;

export function setPendingDeepLink(link: ParsedDeepLink): void {
  pendingDeepLink = link;
}

/** Consumes the most recent non-routable deep link (e.g. page/agent ids that need a Supabase lookup). Read once by the app shell. */
export function consumePendingDeepLink(): ParsedDeepLink | null {
  const link = pendingDeepLink;
  pendingDeepLink = null;
  return link;
}
