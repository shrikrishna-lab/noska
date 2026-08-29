/**
 * Active input tracking & cursor-preserving text insertion for global dictation.
 */

let lastFocusedElement: HTMLElement | null = null;
let lastSelectionRange: Range | null = null;

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
        lastSelectionRange = sel.getRangeAt(0).cloneRange();
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
  return null;
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

    // If there's preceding text without trailing space and text doesn't start with space or punctuation, add space
    let textToInsert = text;
    if (prefix.length > 0 && !/\s$/.test(prefix) && !/^[\s,.:;!?]/.test(textToInsert)) {
      textToInsert = " " + textToInsert;
    }

    const nextValue = prefix + textToInsert + suffix;
    const nextCursorPos = start + textToInsert.length;

    // Use setRangeText where available for native undo stack, fallback to value assignment
    if (typeof target.setRangeText === "function") {
      target.setRangeText(textToInsert, start, end, "end");
    } else {
      target.value = nextValue;
      target.setSelectionRange(nextCursorPos, nextCursorPos);
    }

    // Trigger synthetic input events so React / frameworks detect the change
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // 2. ContentEditable / Rich Text editors (ProseMirror, Slate, Lexical, TipTap, HTML nodes)
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    target.focus();

    // Prefer document.execCommand('insertText') for native rich-text editor history / undo handling
    try {
      const executed = document.execCommand("insertText", false, text);
      if (executed) {
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      }
    } catch {
      // Fall through to DOM selection insertion
    }

    // Fallback: DOM Range insertion
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

      // Move cursor after the inserted text
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
