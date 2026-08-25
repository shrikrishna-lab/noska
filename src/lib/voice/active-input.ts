/**
 * Active input tracking & cursor-preserving smooth character-by-character
 * text streaming for global voice dictation.
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
  // Fallback: look for the active or first editable block in the editor
  const editorBlock = document.querySelector(
    "[data-block-id] .rich-text-editor[contenteditable='true'], .rich-text-editor[contenteditable='true'], [contenteditable='true'], textarea:not([disabled]), input[type='text']:not([disabled])"
  ) as HTMLElement | null;
  if (editorBlock) {
    return editorBlock;
  }
  return null;
}

function getPrefixText(target: HTMLElement): string {
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    return target.value.substring(0, start);
  }
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        const prefixRange = range.cloneRange();
        prefixRange.selectNodeContents(target);
        prefixRange.setEnd(range.endContainer, range.endOffset);
        return prefixRange.toString();
      } catch {
        return "";
      }
    }
  }
  return "";
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
  if (descriptor?.set) {
    descriptor.set.call(el, value);
  } else {
    el.value = value;
  }
}

function rangeIsInside(el: HTMLElement, range: Range): boolean {
  return el.contains(range.startContainer) && el.contains(range.endContainer);
}

/**
 * Inserts a single character/chunk into the active input or contentEditable.
 */
function insertDirectChunk(textChunk: string, targetOverride?: HTMLElement | null): boolean {
  if (!textChunk) return false;
  const target = targetOverride || getActiveTypingElement();
  if (!target) return false;

  // 1. Standard HTMLInputElement or HTMLTextAreaElement
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const originalValue = target.value;

    const prefix = originalValue.substring(0, start);
    const suffix = originalValue.substring(end);

    setNativeValue(target, prefix + textChunk + suffix);

    const nextCursorPos = start + textChunk.length;
    try {
      target.setSelectionRange(nextCursorPos, nextCursorPos);
    } catch {}

    target.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    target.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    return true;
  }

  // 2. ContentEditable / Rich Text editors (ProseMirror, Slate, Lexical, TipTap, HTML nodes)
  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    target.focus();
    const selection = window.getSelection();

    let range: Range | null =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

    if (!range || !rangeIsInside(target, range)) {
      const saved = lastSelectionRange;
      if (saved && rangeIsInside(target, saved)) {
        range = saved.cloneRange();
      } else {
        range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
      }
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, textChunk);
    } catch {
      inserted = false;
    }

    if (!inserted) {
      range.deleteContents();
      const textNode = document.createTextNode(textChunk);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    target.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    try {
      target.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: textChunk,
        })
      );
    } catch {}
    return true;
  }

  return false;
}

// Fluid character-by-character typing queue
interface QueueItem {
  char: string;
  target: HTMLElement | null;
}

const smoothTypeQueue: QueueItem[] = [];
let isTypingLoopRunning = false;

function runSmoothTypingLoop(onChar?: (char: string) => void) {
  if (smoothTypeQueue.length === 0) {
    isTypingLoopRunning = false;
    return;
  }

  isTypingLoopRunning = true;
  const item = smoothTypeQueue.shift()!;
  insertDirectChunk(item.char, item.target);
  onChar?.(item.char);

  // Dynamic interval: speed up if more characters are queued so user never waits
  const delay = smoothTypeQueue.length > 25 ? 5 : smoothTypeQueue.length > 10 ? 12 : 18;

  setTimeout(() => {
    runSmoothTypingLoop(onChar);
  }, delay);
}

/**
 * Streams incoming voice transcript smoothly character-by-character with natural pacing.
 */
export function insertTextSmoothly(
  text: string,
  targetOverride?: HTMLElement | null,
  onChar?: (char: string) => void
): boolean {
  if (!text) return false;

  const target = targetOverride || getActiveTypingElement();
  if (!target) return false;

  const prefix = getPrefixText(target);
  let textToQueue = text;
  if (prefix.length > 0 && !/\s$/.test(prefix) && !/^[\s,.:;!?]/.test(text)) {
    textToQueue = " " + text;
  }

  for (let i = 0; i < textToQueue.length; i++) {
    smoothTypeQueue.push({ char: textToQueue[i], target });
  }

  if (!isTypingLoopRunning) {
    runSmoothTypingLoop(onChar);
  }

  return true;
}

export function flushSmoothTyping() {
  while (smoothTypeQueue.length > 0) {
    const item = smoothTypeQueue.shift()!;
    insertDirectChunk(item.char, item.target);
  }
  isTypingLoopRunning = false;
}

/**
 * Standard instantaneous insertion fallback.
 */
export function insertTextAtCursor(text: string, targetOverride?: HTMLElement | null): boolean {
  return insertTextSmoothly(text, targetOverride);
}
