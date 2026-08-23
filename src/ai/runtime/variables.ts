/**
 * Noska Intelligence — Safe Variable Interpolation
 *
 * Resolves `{{path.to.value}}` references against a flat variable bag
 * produced by previous automation/agent steps. No eval, no code execution:
 * only property traversal into plain objects, with strict depth and size
 * limits. Unknown variables resolve to empty strings (never throw).
 */

const MAX_PATH_DEPTH = 4;
const MAX_VALUE_LENGTH = 8000;
const VAR_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export type AutomationVars = Record<string, unknown>;

/** Flatten helper used when building the var bag from step outputs. */
export function buildVars(prefix: string, value: unknown, target: AutomationVars = {}, depth = 0): AutomationVars {
  if (depth > MAX_PATH_DEPTH || value == null) {
    target[prefix] = value;
    return target;
  }
  if (Array.isArray(value)) {
    // Arrays are exposed as JSON + length; individual items via {{arr.0.x}}
    target[`${prefix}.length`] = String(value.length);
    target[prefix] = JSON.stringify(value).slice(0, MAX_VALUE_LENGTH);
    return target;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k.includes(".") || k.length > 64) continue;
      buildVars(`${prefix}.${k}`, v, target, depth + 1);
    }
    return target;
  }
  target[prefix] = typeof value === "string" ? value.slice(0, MAX_VALUE_LENGTH) : String(value);
  return target;
}

function lookup(vars: AutomationVars, path: string): string {
  // Fast path: pre-flattened key
  if (Object.prototype.hasOwnProperty.call(vars, path)) {
    const v = vars[path];
    return v == null ? "" : String(v);
  }
  // Slow path: walk plain objects
  const parts = path.split(".").slice(0, MAX_PATH_DEPTH);
  let current: unknown = vars;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return "";
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return "";
  if (typeof current === "object") return JSON.stringify(current).slice(0, MAX_VALUE_LENGTH);
  return String(current);
}

/**
 * Replace every {{variable}} in the input with resolved values.
 * Unresolvable variables become empty strings — automations never embed
 * raw template syntax in user-visible content.
 */
export function resolveTemplate(input: string, vars: AutomationVars): string {
  if (!input || !input.includes("{{")) return input || "";
  return input.replace(VAR_PATTERN, (_match, path: string) => lookup(vars, path));
}

/** Resolve templates across every string value of an params object. */
export function resolveParams(params: Record<string, unknown>, vars: AutomationVars): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") out[key] = resolveTemplate(value, vars);
    else out[key] = value;
  }
  return out;
}
