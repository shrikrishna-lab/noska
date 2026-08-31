import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Keyboard, RotateCcw, Search, AlertTriangle, Check, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
export interface ShortcutDef {
  id: string;
  label: string;
  description: string;
  category: string;
  defaultShortcut: string;
}

export interface ShortcutMap {
  [shortcutId: string]: string;
}

// ── Default Shortcuts ──────────────────────────────────────────
const STORAGE_KEY = 'noska-shortcuts';

export const SHORTCUT_DEFINITIONS: ShortcutDef[] = [
  // Navigation
  { id: 'command-palette', label: 'Command Palette', description: 'Open search & command palette', category: 'Navigation', defaultShortcut: 'Ctrl+K' },
  { id: 'new-page', label: 'New Page', description: 'Create a new blank page', category: 'Navigation', defaultShortcut: 'Ctrl+N' },
  { id: 'find', label: 'Find in Page', description: 'Search within the current document', category: 'Navigation', defaultShortcut: 'Ctrl+F' },
  { id: 'toggle-sidebar', label: 'Toggle Sidebar', description: 'Collapse or expand the navigation sidebar', category: 'Navigation', defaultShortcut: 'Ctrl+\\' },
  { id: 'full-width', label: 'Full Width', description: 'Toggle full-width editor mode', category: 'Navigation', defaultShortcut: 'Ctrl+Shift+L' },
  { id: 'go-back', label: 'Go Back', description: 'Navigate to previous page', category: 'Navigation', defaultShortcut: 'Alt+ArrowLeft' },
  { id: 'go-forward', label: 'Go Forward', description: 'Navigate to next page', category: 'Navigation', defaultShortcut: 'Alt+ArrowRight' },

  // Editing
  { id: 'undo', label: 'Undo', description: 'Revert last edit', category: 'Editing', defaultShortcut: 'Ctrl+Z' },
  { id: 'redo', label: 'Redo', description: 'Reapply reverted edit', category: 'Editing', defaultShortcut: 'Ctrl+Shift+Z' },
  { id: 'duplicate', label: 'Duplicate', description: 'Duplicate selected block or page', category: 'Editing', defaultShortcut: 'Ctrl+D' },
  { id: 'select-all', label: 'Select All', description: 'Select all blocks', category: 'Editing', defaultShortcut: 'Ctrl+A' },
  { id: 'bold', label: 'Bold', description: 'Make text bold', category: 'Editing', defaultShortcut: 'Ctrl+B' },
  { id: 'italic', label: 'Italic', description: 'Make text italic', category: 'Editing', defaultShortcut: 'Ctrl+I' },
  { id: 'underline', label: 'Underline', description: 'Underline text', category: 'Editing', defaultShortcut: 'Ctrl+U' },
  { id: 'strikethrough', label: 'Strikethrough', description: 'Strikethrough text', category: 'Editing', defaultShortcut: 'Ctrl+Shift+S' },
  { id: 'inline-code', label: 'Inline Code', description: 'Toggle inline code formatting', category: 'Editing', defaultShortcut: 'Ctrl+`' },
  { id: 'slash-command', label: 'Slash Command', description: 'Open block type menu', category: 'Editing', defaultShortcut: '/' },
  { id: 'indent', label: 'Indent', description: 'Indent selected block', category: 'Editing', defaultShortcut: 'Tab' },
  { id: 'outdent', label: 'Outdent', description: 'Outdent selected block', category: 'Editing', defaultShortcut: 'Shift+Tab' },

  // Actions
  { id: 'copy-link', label: 'Copy Link', description: 'Copy page link to clipboard', category: 'Actions', defaultShortcut: 'Ctrl+L' },
  { id: 'move-to', label: 'Move To', description: 'Move page to another location', category: 'Actions', defaultShortcut: 'Ctrl+Shift+P' },
  { id: 'export', label: 'Export', description: 'Export page content', category: 'Actions', defaultShortcut: 'Ctrl+Shift+E' },
  { id: 'web-clipper', label: 'Web Clipper', description: 'Capture content from web', category: 'Actions', defaultShortcut: 'Ctrl+Shift+C' },
  { id: 'voice', label: 'Voice Dictation', description: 'Start speech-to-text recording', category: 'Actions', defaultShortcut: 'Ctrl+Shift+V' },
  { id: 'help', label: 'Help', description: 'Open keyboard shortcuts help', category: 'Actions', defaultShortcut: '?' },

  // View
  { id: 'reading-mode', label: 'Reading Mode', description: 'Toggle distraction-free reading', category: 'View', defaultShortcut: 'Ctrl+Shift+R' },
  { id: 'close-panel', label: 'Close Panel', description: 'Close open panel or modal', category: 'View', defaultShortcut: 'Escape' },
];

// ── Shortcut Manager ───────────────────────────────────────────
function loadCustomShortcuts(): ShortcutMap {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCustomShortcuts(map: ShortcutMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

let _customShortcuts: ShortcutMap = loadCustomShortcuts();
const _listeners = new Set<(id: string, e: KeyboardEvent) => void>();
const _changeListeners = new Set<() => void>();

export function getShortcutForId(id: string): string {
  const def = SHORTCUT_DEFINITIONS.find(d => d.id === id);
  if (!def) return '';
  return _customShortcuts[id] || def.defaultShortcut;
}

export function getAllShortcuts(): Array<ShortcutDef & { current: string; isCustom: boolean }> {
  return SHORTCUT_DEFINITIONS.map(def => ({
    ...def,
    current: _customShortcuts[def.id] || def.defaultShortcut,
    isCustom: !!_customShortcuts[def.id],
  }));
}

export function setShortcut(id: string, shortcut: string) {
  _customShortcuts[id] = shortcut;
  saveCustomShortcuts(_customShortcuts);
  _changeListeners.forEach(fn => fn());
}

export function resetShortcut(id: string) {
  delete _customShortcuts[id];
  saveCustomShortcuts(_customShortcuts);
  _changeListeners.forEach(fn => fn());
}

export function resetAllShortcuts() {
  _customShortcuts = {};
  saveCustomShortcuts(_customShortcuts);
  _changeListeners.forEach(fn => fn());
}

export function findConflicts(changedId: string, shortcut: string): string[] {
  const normalized = normalizeKey(shortcut);
  return SHORTCUT_DEFINITIONS
    .filter(d => d.id !== changedId)
    .filter(d => {
      const s = _customShortcuts[d.id] || d.defaultShortcut;
      return normalizeKey(s) === normalized;
    })
    .map(d => d.label);
}

export function onShortcutsChange(fn: () => void) {
  _changeListeners.add(fn);
  return () => { _changeListeners.delete(fn); };
}

export function onShortcutMatch(fn: (id: string, e: KeyboardEvent) => void) {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}

export function handleShortcutEvent(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
  if (!['control', 'meta', 'alt', 'shift'].includes(key)) parts.push(key);
  const pressed = parts.join('+');

  for (const def of SHORTCUT_DEFINITIONS) {
    const current = _customShortcuts[def.id] || def.defaultShortcut;
    if (normalizeKey(current) === pressed) {
      _listeners.forEach(fn => fn(def.id, e));
      return def.id;
    }
  }
  return null;
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/ctrl\+/g, 'mod+').replace(/cmd\+/g, 'mod+').replace(/\s+/g, '');
}

// ── React Hook ─────────────────────────────────────────────────
export function useShortcuts(handlers: Record<string, (e: KeyboardEvent) => void>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const unsub = onShortcutMatch((id, e) => {
      const handler = handlersRef.current[id];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    });
    return unsub;
  }, []);
}
