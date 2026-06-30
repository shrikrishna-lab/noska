import { PROPERTY_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS } from "../types/database";

export { PROPERTY_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS };

/**
 * @param {string} type
 * @returns {{ id: string, label: string, icon: string, category: string }|undefined}
 */
export function getPropertyTypeMeta(type) {
  return PROPERTY_TYPES[type];
}

export const CATEGORIES = [
  { id: 'basic',    label: 'Basic' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'auto',     label: 'Auto' },
  { id: 'ai',       label: 'AI' },
];

/**
 * Adds a new property to the database schema.
 * @param {import("../types/database").PropertyDefinition[]} properties
 * @param {string} name
 * @param {import("../types/database").PropertyType} [type]
 * @returns {import("../types/database").PropertyDefinition[]}
 */
export function addProperty(properties, name, type = 'text') {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `prop_${Date.now()}`;
  const prop = { id, name, type };
  if (type === 'select' || type === 'multi-select') prop.options = [];
  if (type === 'status') prop.options = [...DEFAULT_STATUS_OPTIONS];
  if (type === 'priority') prop.options = [...DEFAULT_PRIORITY_OPTIONS];
  return [...properties, prop];
}

/**
 * @param {import("../types/database").PropertyDefinition[]} properties
 * @param {string} propId
 * @param {Partial<import("../types/database").PropertyDefinition>} patch
 * @returns {import("../types/database").PropertyDefinition[]}
 */
export function patchProperty(properties, propId, patch) {
  return properties.map(p => p.id === propId ? { ...p, ...patch } : p);
}

/**
 * @param {import("../types/database").PropertyDefinition[]} properties
 * @param {string} propId
 * @returns {import("../types/database").PropertyDefinition[]}
 */
export function removeProperty(properties, propId) {
  if (propId === 'name') return properties;
  return properties.filter(p => p.id !== propId);
}
