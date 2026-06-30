// Maps keyboard shortcuts to command IDs
const _shortcutMap = new Map();
const _listeners = new Set();

export function bindShortcut(shortcut, commandId) {
  if (!shortcut) return;
  _shortcutMap.set(normalize(shortcut), commandId);
}

export function getCommandForShortcut(shortcut) {
  return _shortcutMap.get(normalize(shortcut));
}

export function getAllShortcuts() {
  return Array.from(_shortcutMap.entries()).map(([key, cmd]) => ({
    shortcut: denormalize(key),
    commandId: cmd
  }));
}

export function onShortcutMatch(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function notify(commandId, e) {
  _listeners.forEach((fn) => fn(commandId, e));
}

// Normalize: "Ctrl+K" → "mod+k"
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/ctrl\+/g, "mod+")
    .replace(/cmd\+/g, "mod+")
    .replace(/command\+/g, "mod+")
    .replace(/\s+/g, "")
    .replace(/—/g, "-")
    .replace(/–/g, "-");
}

function denormalize(s) {
  return s.replace(/mod\+/g, "Ctrl+");
}

export function handleKeyEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push("mod");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  const key = e.key === " " ? "space" : e.key.toLowerCase();
  if (!["control", "meta", "alt", "shift"].includes(key)) parts.push(key);
  const shortcut = parts.join("+");
  const cmd = _shortcutMap.get(shortcut);
  if (cmd) {
    notify(cmd, e);
    return cmd;
  }
  return null;
}

// ── Default bindings ────────────────────────────────────────────
export function initDefaultShortcuts() {
  const bindings = [
    ["Ctrl+K", "command-palette"],
    ["Ctrl+F", "find"],
    ["Ctrl+D", "duplicate"],
    ["Ctrl+L", "copy-link"],
    ["Ctrl+Shift+P", "move-to"],
    ["Ctrl+Z", "undo"],
    ["Ctrl+Shift+Z", "redo"],
    ["Ctrl+Shift+L", "full-width"],
    ["Ctrl+/", "slash-command"],
    ["Escape", "close-menu"],
    ["Tab", "indent"],
    ["Shift+Tab", "outdent"],
    ["Enter", "new-block"],
    ["ArrowUp", "arrow-up"],
    ["ArrowDown", "arrow-down"],
  ];
  bindings.forEach(([s, c]) => bindShortcut(s, c));
}
