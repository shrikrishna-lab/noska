// ═══════════════════════════════════════════════════════════════
// Editor History — Undo/Redo abstraction
// Initially backed by native browser undo, but abstracted
// for future custom implementation.
// ═══════════════════════════════════════════════════════════════

export class EditorHistory {
  constructor(element) {
    this.el = element;
    this.enabled = true;
  }
  
  focus() {
    this.el?.focus();
  }
  
  undo() {
    try {
      this.focus();
      document.execCommand('undo', false, null);
      return true;
    } catch (e) {
      console.warn('undo failed:', e);
      return false;
    }
  }
  
  redo() {
    try {
      this.focus();
      document.execCommand('redo', false, null);
      return true;
    } catch (e) {
      console.warn('redo failed:', e);
      return false;
    }
  }
  
  snapshot() {
    // Future: implement custom state snapshots for granular undo
    // This would capture the current rich text state and allow
    // precise restoration without browser undo limitations
  }
  
  canUndo() {
    return this.enabled;
  }
  
  canRedo() {
    return this.enabled;
  }
  
  clear() {
    // Future: clear custom undo stack
  }
}

// Simple undo manager for a single editor instance
// Tracks rich text changes for programmatic undo/redo

export class SimpleUndoManager {
  constructor(getState, setState, maxSize = 100) {
    this.getState = getState;
    this.setState = setState;
    this.maxSize = maxSize;
    this.stack = [];
    this.index = -1;
  }
  
  push(state) {
    if (this.index < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.index + 1);
    }
    
    this.stack.push(state);
    
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.index++;
    }
  }
  
  undo() {
    if (this.index > 0) {
      this.index--;
      const state = this.stack[this.index];
      this.setState(state);
      return true;
    }
    return false;
  }
  
  redo() {
    if (this.index < this.stack.length - 1) {
      this.index++;
      const state = this.stack[this.index];
      this.setState(state);
      return true;
    }
    return false;
  }
  
  clear() {
    this.stack = [];
    this.index = -1;
  }
  
  size() {
    return this.stack.length;
  }
  
  currentIndex() {
    return this.index;
  }
}