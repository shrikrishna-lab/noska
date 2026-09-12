// noska:// deep-link parsing and validation.
//
// Accepted forms (everything else is rejected):
//   noska://workspace/<id>
//   noska://workspace/<id>/page/<pageId>
//   noska://workspace/<id>/task/<taskId>
//   noska://workspace/<id>/project/<projectId>
//   noska://page/<id>
//   noska://task/<id>
//   noska://project/<id>
//   noska://agent/<id>
//   noska://automation/<id>
//   noska://auth/callback|cancel   (handled by browserAuth, not this parser)
//
// Deep links are untrusted input (email, browser, other apps). IDs must match
// a strict charset, query params are filtered to a safe subset, and unknown
// entities never reach the router.

export type DeepLinkEntity =
  | "workspace"
  | "page"
  | "agent"
  | "automation"
  | "task"
  | "project";

export type DeepLinkChildEntity = "page" | "task" | "project";

export interface ParsedDeepLink {
  entity: DeepLinkEntity;
  id: string;
  /** Optional child entity inside a workspace link, e.g. …/page/<id>. */
  child?: { entity: DeepLinkChildEntity; id: string };
  params: Record<string, string>;
}

const ALLOWED_ENTITIES: ReadonlySet<string> = new Set([
  "workspace",
  "page",
  "agent",
  "automation",
  "task",
  "project",
]);

const ALLOWED_CHILD_ENTITIES: ReadonlySet<string> = new Set(["page", "task", "project"]);

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

  let segments: string[];
  try {
    segments = url.pathname
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean)
      .map((s) => decodeURIComponent(s));
  } catch {
    return null;
  }
  if (segments.length === 0 || segments.length > 3) return null;

  const [id, childEntityRaw, childId] = segments;
  if (!ID_PATTERN.test(id)) return null;

  let child: ParsedDeepLink["child"] | undefined;
  if (segments.length > 1) {
    // Only workspace links may carry a child entity: …/page|x|y/<id>.
    if (entity !== "workspace" || segments.length !== 3) return null;
    const childEntity = childEntityRaw.toLowerCase();
    if (!ALLOWED_CHILD_ENTITIES.has(childEntity)) return null;
    if (!ID_PATTERN.test(childId)) return null;
    child = { entity: childEntity as DeepLinkChildEntity, id: childId };
  }

  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (PARAM_PATTERN.test(key) && PARAM_PATTERN.test(value)) {
      params[key] = value;
    }
  });

  return {
    entity: entity as DeepLinkEntity,
    id,
    child,
    params,
  };
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
