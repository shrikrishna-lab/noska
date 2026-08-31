/**
 * Active input tracking & smooth streaming word-by-word text insertion for global dictation.
 * Supports standard HTML inputs, textareas, and contenteditable block editors (RichTextEditor).
 */

let lastFocusedElement: HTMLElement | null = null;
let lastSelectionRange: Range | null = null;

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

if (typeof window !== "undefined") {
  // Track last focused input or contenteditable element
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as HTMLElement;
      if (isTypingElement(target)) {
        lastFocusedElement = target;
      }
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
  const tag = el.tagName.toLowerCase();
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

export function getActiveTypingElement(): HTMLElement | null {
  const current = document.activeElement as HTMLElement;
  if (current && isTypingElement(current)) {
    return current;
  }
  if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
    return lastFocusedElement;
  }
  // Fallback: search for active rich-text block or editable element in the viewport
  if (typeof document !== "undefined") {
    const editorTarget = document.querySelector(
      ".rich-text-editor[contenteditable='true'], [contenteditable='true']:not([readonly]), textarea:not([readonly]), input[type='text']:not([readonly])"
    ) as HTMLElement | null;
    if (editorTarget) {
      lastFocusedElement = editorTarget;
      return editorTarget;
    }
  }
  return null;
}

/** Helper to get character offset of selection within a contenteditable element */
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

/** Starts a new streaming dictation session snapshotting the starting cursor position */
export function startStreamingSession(targetOverride?: HTMLElement | null) {
  const target = targetOverride || getActiveTypingElement();
  if (!target) {
    activeStreamSession = null;
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
    target.focus();
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

/** Ends the streaming dictation session */
export function endStreamingSession() {
  activeStreamSession = null;
}

/** Streams text smoothly into active input word-by-word with live cursor positioning */
export function streamTextIntoActiveInput(text: string, targetOverride?: HTMLElement | null): boolean {
  if (!text) return false;

  const target = targetOverride || activeStreamSession?.target || getActiveTypingElement();
  if (!target) return false;

  // 1. Standard Input / TextArea with smooth streaming replacement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.focus();

    if (!activeStreamSession || activeStreamSession.target !== target) {
      startStreamingSession(target);
    }

    const session = activeStreamSession;
    if (session) {
      let textToInsert = text;
      if (session.initialPrefix.length > 0 && !/\s$/.test(session.initialPrefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
        textToInsert = " " + textToInsert;
      }

      const nextVal = session.initialPrefix + textToInsert + session.initialSuffix;
      const nextCursor = (session.initialPrefix + textToInsert).length;

      target.value = nextVal;
      target.setSelectionRange(nextCursor, nextCursor);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));

      // Track utterance in Rewind buffer
      try {
        import("./rewind-engine").then(({ recordUtterance }) => {
          recordUtterance(target, textToInsert.trim(), session.initialPrefix.length, nextCursor, session.initialPrefix, session.initialSuffix);
        });
      } catch {}

      return true;
    }
  }

  // 2. ContentEditable / RichTextEditor Block Streaming
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    target.focus();

    if (!activeStreamSession || activeStreamSession.target !== target) {
      startStreamingSession(target);
    }

    const session = activeStreamSession;
    if (session) {
      let textToInsert = text;
      if (session.initialPrefix.length > 0 && !/\s$/.test(session.initialPrefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
        textToInsert = " " + textToInsert;
      }

      const nextText = session.initialPrefix + textToInsert + session.initialSuffix;

      target.innerText = nextText;

      // Restore cursor position to the end of the newly streamed text
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {}

      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));

      try {
        import("./rewind-engine").then(({ recordUtterance }) => {
          recordUtterance(target, textToInsert.trim(), session.initialPrefix.length, session.initialPrefix.length + textToInsert.length, session.initialPrefix, session.initialSuffix);
        });
      } catch {}

      return true;
    }

    return insertTextAtCursor(text, target);
  }

  return false;
}

/**
 * Inserts text at the current cursor position or replaces the selected text.
 */
export function insertTextAtCursor(text: string, targetOverride?: HTMLElement | null): boolean {
  if (!text) return false;

  const target = targetOverride || getActiveTypingElement();
  if (!target) return false;

  // 1. Standard HTMLInputElement or HTMLTextAreaElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    target.focus();
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const originalValue = target.value;

    const prefix = originalValue.substring(0, start);
    const suffix = originalValue.substring(end);

    let textToInsert = text;
    if (prefix.length > 0 && !/\s$/.test(prefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
      textToInsert = " " + textToInsert;
    }

    const nextValue = prefix + textToInsert + suffix;
    const nextCursorPos = start + textToInsert.length;

    if (typeof target.setRangeText === "function") {
      target.setRangeText(textToInsert, start, end, "end");
    } else {
      target.value = nextValue;
      target.setSelectionRange(nextCursorPos, nextCursorPos);
    }

    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // 2. ContentEditable / Rich Text editors (ProseMirror, Slate, Lexical, TipTap, HTML nodes)
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    target.focus();

    try {
      const executed = document.execCommand("insertText", false, text);
      if (executed) {
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    } catch {}

    const selection = window.getSelection();
    let range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : lastSelectionRange;

    if (!range && target) {
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
      selection?.removeAllRanges();
      selection?.addRange(range);

      target.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  }

  return false;
}
