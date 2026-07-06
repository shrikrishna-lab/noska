import { PROPERTY_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS } from "../types/database";
import type { PropertyDefinition, PropertyType } from "../types/database";

export { PROPERTY_TYPES, DEFAULT_STATUS_OPTIONS, DEFAULT_PRIORITY_OPTIONS };

export function getPropertyTypeMeta(type: PropertyType) {
  return PROPERTY_TYPES[type];
}

export const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'basic',    label: 'Basic' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'auto',     label: 'Auto' },
  { id: 'ai',       label: 'AI' },
];

/**
 * Adds a new property to the database schema.
 */
export function addProperty(properties: PropertyDefinition[], name: string, type: PropertyType = 'text'): PropertyDefinition[] {
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `prop_${Date.now()}`;
  const prop: PropertyDefinition = { id, name, type };
  if (type === 'select' || type === 'multi-select') prop.options = [];
  if (type === 'status') prop.options = [...DEFAULT_STATUS_OPTIONS];
  if (type === 'priority') prop.options = [...DEFAULT_PRIORITY_OPTIONS];
  return [...properties, prop];
}

export function patchProperty(properties: PropertyDefinition[], propId: string, patch: Partial<PropertyDefinition>): PropertyDefinition[] {
  return properties.map(p => p.id === propId ? { ...p, ...patch } : p);
}

export function removeProperty(properties: PropertyDefinition[], propId: string): PropertyDefinition[] {
  if (propId === 'name') return properties;
  return properties.filter(p => p.id !== propId);
}
