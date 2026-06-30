const MAX_HISTORY = 50;

let _undoStack = [];
let _redoStack = [];
let _listeners = new Set();
let _batchDepth = 0;
let _pendingEntry = null;

export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function notify() {
  _listeners.forEach((fn) => fn({
    canUndo: _undoStack.length > 0,
    canRedo: _redoStack.length > 0,
    undoCount: _undoStack.length,
    redoCount: _redoStack.length
  }));
}

export function pushSnapshot(snapshot) {
  const entry = { snapshot, timestamp: Date.now() };
  if (_batchDepth > 0) {
    _pendingEntry = entry;
    return;
  }
  _undoStack.push(entry);
  if (_undoStack.length > MAX_HISTORY) _undoStack.shift();
  _redoStack = [];
  notify();
}

export function beginBatch() {
  _batchDepth++;
}

export function endBatch() {
  _batchDepth = Math.max(0, _batchDepth - 1);
  if (_batchDepth === 0 && _pendingEntry) {
    pushSnapshot(_pendingEntry.snapshot);
    _pendingEntry = null;
  }
}

export function undo(getCurrent) {
  if (_undoStack.length === 0) return null;
  const current = getCurrent?.();
  if (current) _redoStack.push({ snapshot: current, timestamp: Date.now() });
  const entry = _undoStack.pop();
  notify();
  return entry.snapshot;
}

export function redo(getCurrent) {
  if (_redoStack.length === 0) return null;
  const current = getCurrent?.();
  if (current) _undoStack.push({ snapshot: current, timestamp: Date.now() });
  const entry = _redoStack.pop();
  notify();
  return entry.snapshot;
}

export function clear() {
  _undoStack = [];
  _redoStack = [];
  notify();
}

export function getState() {
  return {
    canUndo: _undoStack.length > 0,
    canRedo: _redoStack.length > 0,
    undoCount: _undoStack.length,
    redoCount: _redoStack.length
  };
}
