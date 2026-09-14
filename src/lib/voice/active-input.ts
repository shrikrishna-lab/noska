/**
 * Active input tracking & smooth streaming word-by-word text insertion for global dictation.
 * Supports standard HTML inputs, textareas, and contenteditable block editors (RichTextEditor).
 *
 * Wispr Flow parity: re-resolves active field on every interim write (focus/field switch),
 * never writes to a stale reference, always inserts text visibly.
 */

let lastFocusedElement: HTMLElement | null = null;
let lastSelectionRange: Range | null = null;
let lastTouchedEditor: HTMLElement | null = null;
let lastInsertedText = "";
let lastInsertedTarget: HTMLElement | null = null;

interface StreamingSession {
  target: HTMLElement;
  isContentEditable: boolean;
  initialValue: string;
  startPos: number;
  endPos: number;
  initialPrefix: string;
  initialSuffix: string;
}

let activeStreamSession: StreamingSession | null = null;

/**
 * Feed every successful dictation insertion into the Rewind engine's rolling
 * buffer so hands-free self-correction ("wait, I meant…", "scratch that")
 * knows what to replace. Dynamic import keeps this module free of a static
 * cycle (rewind-engine imports getActiveTypingElement from here).
 */
function recordForRewind(target: HTMLElement, text: string, charStart: number, charEnd: number): void {
  void import("./rewind-engine")
    .then(({ recordUtterance }) => recordUtterance(target, text, charStart, charEnd))
    .catch(() => {});
}

if (typeof window !== "undefined") {
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as HTMLElement;
      if (isTypingElement(target)) {
        lastFocusedElement = target;
      }
      const el = findEditorBlockFor(target);
      if (el) lastTouchedEditor = el;
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      const el = findEditorBlockFor(event.target as HTMLElement);
      if (el) lastTouchedEditor = el;
    },
    true
  );

  document.addEventListener(
    "selectionchange",
    () => {
      const active = document.activeElement as HTMLElement;
      if (active && isTypingElement(active)) {
        lastFocusedElement = active;
      }
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        try {
          lastSelectionRange = sel.getRangeAt(0).cloneRange();
        } catch {}
      }
    },
    true
  );
}

export function isTypingElement(el: HTMLElement | null): boolean {
  if (!el) return false;
  // Exclude the voice pill / floating indicator buttons — they are NOT typing targets
  if (el.closest?.("[data-voice-pill]") || el.closest?.("[aria-label*='voice']") || el.closest?.("[aria-label*='Voice']")) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return false;
  if (tag === "input") {
    const type = (el as HTMLInputElement).type?.toLowerCase() || "text";
    const nonTextTypes = ["checkbox", "radio", "submit", "button", "range", "color", "file", "image", "hidden"];
    return !nonTextTypes.includes(type);
  }
  if (tag === "textarea") return true;
  if (el.isContentEditable) return true;
  if (el.getAttribute("contenteditable") === "true") return true;
  if (el.getAttribute("role") === "textbox") return true;
  return false;
}

function findEditorBlockFor(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  if (el.getAttribute("contenteditable") === "true" && el.classList.contains("rich-text-editor")) return el;
  const block = el.closest?.(".noska-block [contenteditable='true']") as HTMLElement | null;
  if (block) return block;
  const ce = el.closest?.("[contenteditable='true']") as HTMLElement | null;
  return ce || null;
}

function findTypingTarget(): HTMLElement | null {
  const current = document.activeElement as HTMLElement;
  if (current && isTypingElement(current)) return current;

  if (lastFocusedElement && document.body.contains(lastFocusedElement) && isTypingElement(lastFocusedElement)) {
    return lastFocusedElement;
  }

  if (lastTouchedEditor && document.body.contains(lastTouchedEditor) && isTypingElement(lastTouchedEditor)) {
    return lastTouchedEditor;
  }

  if (typeof document !== "undefined") {
    const editorArea = document.querySelector(".noska-blocks, [class*='editor']") as HTMLElement | null;
    if (editorArea) {
      const blocks = editorArea.querySelectorAll("[contenteditable='true']") as NodeListOf<HTMLElement>;
      if (blocks.length > 0) return blocks[blocks.length - 1];
    }
    const all = document.querySelectorAll("[contenteditable='true']:not([readonly])") as NodeListOf<HTMLElement>;
    if (all.length > 0) return all[all.length - 1];
  }

  return null;
}

export function getActiveTypingElement(): HTMLElement | null {
  return findTypingTarget();
}

export function hasFocusChanged(): boolean {
  if (!activeStreamSession) return false;
  const current = findTypingTarget();
  return !!current && current !== activeStreamSession.target;
}

export function resetVoiceTracking() {
  lastFocusedElement = null;
  lastSelectionRange = null;
  lastTouchedEditor = null;
  activeStreamSession = null;
  lastInsertedText = "";
  lastInsertedTarget = null;
}

export function getActiveStreamSession(): StreamingSession | null {
  return activeStreamSession;
}

function getContentEditableCursorOffset(el: HTMLElement): number {
  try {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !el.contains(sel.anchorNode)) {
      return (el.innerText || el.textContent || "").length;
    }
    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.selectNodeContents(el);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  } catch {
    return (el.innerText || el.textContent || "").length;
  }
}

export function startStreamingSession(targetOverride?: HTMLElement | null) {
  const target = targetOverride || findTypingTarget();
  if (!target) {
    activeStreamSession = null;
    console.debug("[Voice][active-input] startStreamingSession: no target found", {
      override: !!targetOverride,
      activeElement: document.activeElement?.tagName,
      lastFocused: lastFocusedElement?.tagName,
      lastTouched: lastTouchedEditor?.tagName,
    });
    return;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const fullVal = target.value;
    const initialPrefix = fullVal.substring(0, start);
    const initialSuffix = fullVal.substring(end);

    activeStreamSession = {
      target,
      isContentEditable: false,
      initialValue: fullVal,
      startPos: start,
      endPos: end,
      initialPrefix,
      initialSuffix,
    };
  } else if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    try { target.focus(); } catch {}
    const fullVal = target.innerText || target.textContent || "";
    const offset = getContentEditableCursorOffset(target);
    const initialPrefix = fullVal.substring(0, offset);
    const initialSuffix = fullVal.substring(offset);

    activeStreamSession = {
      target,
      isContentEditable: true,
      initialValue: fullVal,
      startPos: offset,
      endPos: offset,
      initialPrefix,
      initialSuffix,
    };
  } else {
    activeStreamSession = null;
  }
}

export function endStreamingSession() {
  activeStreamSession = null;
}

function insertIntoContentEditable(target: HTMLElement, text: string): boolean {
  // Clicking the floating voice control moves DOM focus away from the
  // editor. Restore the saved editor selection before inserting.
  const savedRange = lastSelectionRange && target.contains(lastSelectionRange.commonAncestorContainer)
    ? lastSelectionRange.cloneRange()
    : null;
  try { target.focus(); } catch {}

  const selection = window.getSelection();
  if (savedRange && selection) {
    try {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    } catch {}
  }

  try {
    const ok = document.execCommand("insertText", false, text);
    if (ok) return true;
  } catch {}

  const sel = window.getSelection();
  let range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : lastSelectionRange;

  if (!range) {
    range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
  }

  if (range) {
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  try {
    target.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
  } catch {
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  return true;
}

/** Remove the previous live interim chunk before writing its replacement. */
function removeLastInsertedContentEditable(target: HTMLElement): boolean {
  if (!lastInsertedText || lastInsertedTarget !== target) return false;

  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) nodes.push(node as Text);

  const needle = lastInsertedText;
  for (let i = nodes.length - 1; i >= 0; i--) {
    const textNode = nodes[i];
    const at = textNode.data.lastIndexOf(needle);
    if (at < 0) continue;
    textNode.deleteData(at, needle.length);
    lastInsertedText = "";
    return true;
  }
  return false;
}

function setInputValue(target: HTMLInputElement | HTMLTextAreaElement, value: string): boolean {
  try { target.focus(); } catch {}

  try {
    const proto = target instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc?.set) {
      desc.set.call(target, value);
    } else {
      target.value = value;
    }
  } catch {
    target.value = value;
  }

  try { target.setSelectionRange(value.length, value.length); } catch {}

  try {
    target.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  } catch {
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

export function streamTextIntoActiveInput(text: string, targetOverride?: HTMLElement | null): boolean {
  if (!text?.trim()) return false;

  let target = targetOverride || null;

  // When no override, always resolve fresh target — never trust stale session
  if (!target) {
    const freshTarget = findTypingTarget();
    if (freshTarget) {
      target = freshTarget;
    }
  }

  // Fallback to session target if nothing else found
  if (!target && activeStreamSession?.target && document.body.contains(activeStreamSession.target)) {
    target = activeStreamSession.target;
  }

  // Migrate session if focus changed
  if (target && activeStreamSession && target !== activeStreamSession.target) {
    startStreamingSession(target);
  }

  // Create session if none exists
  if (!activeStreamSession && target) {
    startStreamingSession(target);
  }

  if (!target) {
    // Last resort: try every contenteditable on the page
    const allCE = document.querySelectorAll("[contenteditable='true']:not([readonly])") as NodeListOf<HTMLElement>;
    for (const el of allCE) {
      if (document.body.contains(el) && !el.closest("[data-voice-pill]")) {
        target = el;
        startStreamingSession(el);
        console.warn("[Voice][active-input] fallback: used last-resort contenteditable", { tag: el.tagName, className: el.className?.slice(0, 80) });
        break;
      }
    }
  }

  if (!target) {
    console.warn("[Voice][active-input] streamTextIntoActiveInput: NO target found", {
      text: text.slice(0, 60),
      hasSession: !!activeStreamSession,
      sessionTarget: activeStreamSession?.target?.tagName,
      lastFocused: lastFocusedElement?.tagName,
      lastTouched: lastTouchedEditor?.tagName,
      activeElement: document.activeElement?.tagName,
    });
    return false;
  }

  // Validate target still in DOM
  if (!document.body.contains(target)) {
    const fresh = findTypingTarget();
    if (!fresh) return false;
    startStreamingSession(fresh);
    target = fresh;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    if (!activeStreamSession || activeStreamSession.target !== target) {
      startStreamingSession(target);
    }
    const session = activeStreamSession;
    if (!session) return false;

    let textToInsert = text;
    if (session.initialPrefix.length > 0 && !/\s$/.test(session.initialPrefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
      textToInsert = " " + textToInsert;
    }
    const nextVal = session.initialPrefix + textToInsert + session.initialSuffix;
    setInputValue(target, nextVal);
    recordForRewind(target, textToInsert, session.initialPrefix.length, session.initialPrefix.length + textToInsert.length);
    lastInsertedText = textToInsert;
    lastInsertedTarget = target;
    return true;
  }

  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    // SpeechRecognition interim results are cumulative. Replace the prior
    // chunk only when the new result grows the previous result. Independent
    // final utterances (for example "period" then "next sentence") must
    // append normally.
    if (
      lastInsertedTarget === target &&
      lastInsertedText &&
      text.trimStart().startsWith(lastInsertedText.trim())
    ) {
      removeLastInsertedContentEditable(target);
    }
    const insertOffset = getContentEditableCursorOffset(target);
    insertIntoContentEditable(target, text);
    recordForRewind(target, text, insertOffset, insertOffset + text.length);
    lastInsertedText = text;
    lastInsertedTarget = target;
    return true;
  }

  return false;
}

export function insertTextAtCursor(text: string, targetOverride?: HTMLElement | null): boolean {
  if (!text) return false;
  const target = targetOverride || findTypingTarget();
  if (!target) return false;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const prefix = target.value.substring(0, start);
    const suffix = target.value.substring(end);
    let textToInsert = text;
    if (prefix.length > 0 && !/\s$/.test(prefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
      textToInsert = " " + textToInsert;
    }
    const nextValue = prefix + textToInsert + suffix;
    setInputValue(target, nextValue);
    recordForRewind(target, textToInsert, start, start + textToInsert.length);
    lastInsertedText = textToInsert;
    lastInsertedTarget = target;
    return true;
  }

  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    const insertOffset = getContentEditableCursorOffset(target);
    const ok = insertIntoContentEditable(target, text);
    if (ok) {
      recordForRewind(target, text, insertOffset, insertOffset + text.length);
      lastInsertedText = text;
      lastInsertedTarget = target;
    }
    return ok;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WISPR FLOW-LEVEL API: interim replacement, undo, smart insert, selection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Replace the last interim text with new text (Wispr Flow's live replacement).
 * For inputs: rebuilds value from session prefix + new text + suffix.
 * For contenteditable: deletes the last inserted text node range, inserts new.
 */
export function replaceInterimText(newText: string, targetOverride?: HTMLElement | null): boolean {
  if (!newText?.trim()) return false;

  const target = targetOverride || lastInsertedTarget || findTypingTarget();
  if (!target) return false;

  // For inputs/textarea: rebuild from session state
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    if (!activeStreamSession || activeStreamSession.target !== target) {
      startStreamingSession(target);
    }
    const session = activeStreamSession;
    if (!session) return false;

    let textToInsert = newText;
    if (session.initialPrefix.length > 0 && !/\s$/.test(session.initialPrefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
      textToInsert = " " + textToInsert;
    }
    const nextVal = session.initialPrefix + textToInsert + session.initialSuffix;
    setInputValue(target, nextVal);
    lastInsertedText = textToInsert;
    lastInsertedTarget = target;
    return true;
  }

  // For contenteditable: delete last inserted text, insert new
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    try { target.focus(); } catch {}

    // Try to select and delete the last inserted text
    if (lastInsertedText && lastInsertedTarget === target) {
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          // Walk backwards from cursor to find the start of last inserted text
          const tempRange = document.createRange();
          tempRange.selectNodeContents(target);
          tempRange.setEnd(range.startContainer, range.startOffset);
          const textBefore = tempRange.toString();
          const startOffset = textBefore.length - lastInsertedText.length;
          if (startOffset >= 0) {
            // Select the last inserted text
            const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null);
            let charCount = 0;
            let startNode: Text | null = null;
            let startCharOffset = 0;
            let endNode: Text | null = null;
            let endCharOffset = 0;
            let node: Text | null;
            while ((node = walker.nextNode() as Text | null)) {
              const nodeLen = node.textContent?.length || 0;
              if (!startNode && charCount + nodeLen > startOffset) {
                startNode = node;
                startCharOffset = startOffset - charCount;
              }
              if (charCount + nodeLen >= textBefore.length) {
                endNode = node;
                endCharOffset = textBefore.length - charCount;
                break;
              }
              charCount += nodeLen;
            }
            if (startNode && endNode) {
              const deleteRange = document.createRange();
              deleteRange.setStart(startNode, startCharOffset);
              deleteRange.setEnd(endNode, endCharOffset);
              deleteRange.deleteContents();
            }
          }
        }
      } catch {}
    }

    insertIntoContentEditable(target, newText);
    lastInsertedText = newText;
    lastInsertedTarget = target;
    return true;
  }

  return false;
}

/**
 * Undo the last inserted text (Wispr Flow's "scratch that" / "undo that").
 * Removes the last chunk of text that was inserted by dictation.
 */
export function undoLastInsert(targetOverride?: HTMLElement | null): boolean {
  const target = targetOverride || lastInsertedTarget;
  if (!target || !lastInsertedText) return false;

  if (!document.body.contains(target)) return false;

  // For inputs/textarea: rebuild without the last inserted text
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    if (!activeStreamSession || activeStreamSession.target !== target) return false;
    const session = activeStreamSession;
    // Remove the last inserted text from the current value
    const currentVal = target.value;
    const lastIdx = currentVal.lastIndexOf(lastInsertedText);
    if (lastIdx === -1) return false;
    const newVal = currentVal.substring(0, lastIdx) + currentVal.substring(lastIdx + lastInsertedText.length);
    setInputValue(target, newVal);
    // Update session prefix to reflect removal
    session.initialPrefix = session.initialPrefix.substring(
      0,
      session.initialPrefix.length - (session.initialPrefix.endsWith(lastInsertedText) ? lastInsertedText.length : 0)
    );
    lastInsertedText = "";
    lastInsertedTarget = null;
    return true;
  }

  // For contenteditable: select and delete the last inserted text
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    try { target.focus(); } catch {}
    const textContent = target.innerText || target.textContent || "";
    const lastIdx = textContent.lastIndexOf(lastInsertedText);
    if (lastIdx === -1) return false;

    try {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, null);
      let charCount = 0;
      let startNode: Text | null = null;
      let startCharOffset = 0;
      let endNode: Text | null = null;
      let endCharOffset = 0;
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const nodeLen = node.textContent?.length || 0;
        if (!startNode && charCount + nodeLen > lastIdx) {
          startNode = node;
          startCharOffset = lastIdx - charCount;
        }
        if (charCount + nodeLen >= lastIdx + lastInsertedText.length) {
          endNode = node;
          endCharOffset = lastIdx + lastInsertedText.length - charCount;
          break;
        }
        charCount += nodeLen;
      }
      if (startNode && endNode) {
        const deleteRange = document.createRange();
        deleteRange.setStart(startNode, startCharOffset);
        deleteRange.setEnd(endNode, endCharOffset);
        deleteRange.deleteContents();
        target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
        lastInsertedText = "";
        lastInsertedTarget = null;
        return true;
      }
    } catch {}
    return false;
  }

  return false;
}

/**
 * Check if text is selected in the active typing element.
 */
export function hasSelection(targetOverride?: HTMLElement | null): boolean {
  const target = targetOverride || findTypingTarget();
  if (!target) return false;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    return start !== end;
  }

  try {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    return !range.collapsed && target.contains(range.commonAncestorContainer);
  } catch {
    return false;
  }
}

/**
 * Get the currently selected text in the active element.
 */
export function getSelectedText(targetOverride?: HTMLElement | null): string {
  const target = targetOverride || findTypingTarget();
  if (!target) return "";

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    return target.value.substring(start, end);
  }

  try {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    return sel.toString();
  } catch {
    return "";
  }
}

/**
 * Replace the current selection with text (Wispr Flow's voice-edit: select text → dictate replacement).
 */
export function replaceSelectionWith(text: string, targetOverride?: HTMLElement | null): boolean {
  if (!text) return false;
  const target = targetOverride || findTypingTarget();
  if (!target) return false;

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const prefix = target.value.substring(0, start);
    const suffix = target.value.substring(end);
    setInputValue(target, prefix + text + suffix);
    recordForRewind(target, text, start, start + text.length);
    lastInsertedText = text;
    lastInsertedTarget = target;
    return true;
  }

  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    try { target.focus(); } catch {}
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (!range.collapsed && target.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        insertIntoContentEditable(target, text);
        lastInsertedText = text;
        lastInsertedTarget = target;
        return true;
      }
    }
    // No selection — just insert
    insertIntoContentEditable(target, text);
    recordForRewind(target, text, 0, text.length);
    lastInsertedText = text;
    lastInsertedTarget = target;
    return true;
  }

  return false;
}

/**
 * Smart insert with auto-capitalization and punctuation intelligence.
 * - Capitalizes first letter after sentence-ending punctuation (. ! ?)
 * - Adds space before text if needed
 * - Handles spoken punctuation: "comma" → ",", "period" → ".", etc.
 */
export function smartInsert(text: string, targetOverride?: HTMLElement | null): boolean {
  if (!text?.trim()) return false;

  // Spoken punctuation mapping
  const punctuationMap: Record<string, string> = {
    "comma": ",",
    "period": ".",
    "full stop": ".",
    "exclamation mark": "!",
    "exclamation point": "!",
    "question mark": "?",
    "semicolon": ";",
    "colon": ":",
    "ellipsis": "...",
    "dash": " - ",
    "hyphen": " - ",
    "new line": "\n",
    "newline": "\n",
    "new paragraph": "\n\n",
    "open parenthesis": "(",
    "close parenthesis": ")",
    "open bracket": "[",
    "close bracket": "]",
    "open quote": "\"",
    "close quote": "\"",
  };

  let processed = text.trim();
  const lower = processed.toLowerCase();

  // Replace spoken punctuation
  if (punctuationMap[lower]) {
    processed = punctuationMap[lower];
  }

  // Auto-capitalize: after . ! ? or at start of empty field
  const target = targetOverride || findTypingTarget();
  if (target && processed.length > 0) {
    let shouldCapitalize = false;

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const val = target.value;
      const lastNonSpace = val.replace(/\s+$/, "").slice(-1);
      shouldCapitalize = !lastNonSpace || ".!?".includes(lastNonSpace);
    } else {
      const textContent = target.innerText || target.textContent || "";
      const lastNonSpace = textContent.replace(/\s+$/, "").slice(-1);
      shouldCapitalize = !lastNonSpace || ".!?".includes(lastNonSpace);
    }

    if (shouldCapitalize) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    }
  }

  return streamTextIntoActiveInput(processed, targetOverride);
}

/**
 * Get the last inserted text and its target (for debugging/testing).
 */
export function getLastInsertedInfo(): { text: string; target: HTMLElement | null } {
  return { text: lastInsertedText, target: lastInsertedTarget };
}
