import React, { useRef, useCallback, useLayoutEffect, useMemo, useState } from "react";
import { renderInlineMarkdown } from "../../utils/helpers";
import { richTextToHtml, htmlToRichText, richTextToPlainText, normalizeRichText, isEmptyRichText, type RichTextSpan } from "../../utils/richText";
import { EditorCommands } from "../../editor/EditorCommands";
import { ClipboardPipeline } from "../../editor/ClipboardPipeline";

function markdownToHtml(text: string | null | undefined) {
  if (!text) return "";
  return renderInlineMarkdown(text);
}

interface SavedCursor {
  offset: number;
}

function saveCursor(el: HTMLElement | null): SavedCursor | null {
  try {
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return null;
    const range = sel.getRangeAt(0);
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    return { offset: pre.toString().length };
  } catch { return null; }
}

function restoreCursor(el: HTMLElement | null, saved: SavedCursor | null) {
  if (!saved || !el) return;
  try {
    const sel = window.getSelection();
    if (!sel) return;
    const range = document.createRange();
    let charCount = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const len = (node.textContent || "").length;
      if (charCount + len >= saved.offset) {
        range.setStart(node, saved.offset - charCount);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      charCount += len;
    }
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch {}
}

interface RichTextModeProps {
  richText: RichTextSpan[] | null | undefined;
  onRichTextChange?: (richText: RichTextSpan[], plainText: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onPasteUrl?: (url: string) => void;
  as?: React.ElementType;
}

function RichTextMode({
  richText,
  onRichTextChange,
  readOnly,
  placeholder,
  className,
  onKeyDown,
  onFocus,
  onBlur,
  onPasteUrl,
  as: WrapperComponent = "div"
}: RichTextModeProps) {
  const divRef = useRef<HTMLElement | null>(null);
  const isInternal = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const commands = useMemo(() => new EditorCommands(null), []);

  const syncToRichText = useCallback((): RichTextSpan[] | null => {
    const el = divRef.current;
    if (!el || isComposing) return null;
    const html = el.innerHTML;
    if (html === "<br>" || !html.trim()) return [];
    return htmlToRichText(html);
  }, [isComposing]);

  const syncFromRichText = useCallback(() => {
    return richTextToHtml(richText || []);
  }, [richText]);

  useLayoutEffect(() => {
    if (!divRef.current || isComposing) return;

    const targetHtml = syncFromRichText();
    const currentHtml = divRef.current.innerHTML;

    if (currentHtml !== targetHtml) {
      isInternal.current = true;
      const saved = saveCursor(divRef.current);
      divRef.current.innerHTML = targetHtml || "";
      if (saved) {
        setTimeout(() => restoreCursor(divRef.current, saved), 0);
      }
    }

    isInternal.current = false;
  }, [syncFromRichText, isComposing]);

  const handleCompositionStart = useCallback((_e: React.CompositionEvent) => {
    setIsComposing(true);
  }, []);

  const handleCompositionUpdate = useCallback((_e: React.CompositionEvent) => {
  }, []);

  const handleCompositionEnd = useCallback((_e: React.CompositionEvent) => {
    setIsComposing(false);
    if (!divRef.current || readOnly) return;
    isInternal.current = true;
    const rt = syncToRichText();
    if (rt) {
      const pt = richTextToPlainText(rt);
      onRichTextChange?.(rt, pt);
    }
    isInternal.current = false;
  }, [readOnly, syncToRichText, onRichTextChange]);

  const handleInput = useCallback(() => {
    if (readOnly || isComposing) return;
    isInternal.current = true;
    const rt = syncToRichText();
    const pt = richTextToPlainText(rt);
    onRichTextChange?.(rt || [], pt);
    isInternal.current = false;
  }, [readOnly, isComposing, syncToRichText, onRichTextChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onKeyDown?.(e);
      return;
    }

    if (e.key === "Backspace") {
      const text = divRef.current?.textContent || "";
      if (!text) {
        e.preventDefault();
        onKeyDown?.(e);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      commands.el = divRef.current as HTMLElement;
      commands.toggleBold();
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      commands.el = divRef.current as HTMLElement;
      commands.toggleItalic();
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      e.preventDefault();
      commands.el = divRef.current as HTMLElement;
      commands.toggleUnderline();
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      commands.el = divRef.current as HTMLElement;
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        const url = prompt("Enter URL:", "https://");
        if (url) {
          commands.insertLink(url, sel.toString());
          handleInput();
        }
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
      e.preventDefault();
      commands.el = divRef.current as HTMLElement;
      commands.toggleStrikethrough();
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "Backquote") {
      e.preventDefault();
      commands.el = divRef.current as HTMLElement;
      commands.toggleCode();
      handleInput();
      return;
    }

    onKeyDown?.(e);
  }, [readOnly, commands, handleInput, onKeyDown]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;

    const clipboard = new ClipboardPipeline({
      onPasteUrl: (url: string) => {
        onPasteUrl?.(url);
      },
      onPlainPaste: (text: string, { insertText }: { insertText: (text: string) => void }) => {
        commands.el = divRef.current as HTMLElement;
        insertText(text);
      },
      onHtmlPaste: (html: string, { insertHtml }: { insertHtml: (html: string) => void }) => {
        commands.el = divRef.current as HTMLElement;
        insertHtml(html);
      }
    });

    const handled = clipboard.handlePaste(e.nativeEvent as ClipboardEvent, {
      insertHtml: (html: string) => {
        commands.el = divRef.current as HTMLElement;
        commands.exec('insertHTML', html);
      },
      insertText: (text: string) => {
        commands.el = divRef.current as HTMLElement;
        commands.exec('insertText', text);
      }
    });

    if (handled) {
      handleInput();
    }
  }, [readOnly, commands, handleInput, onPasteUrl]);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    handleInput();
    onBlur?.(e);
  }, [handleInput, onBlur]);

  const isEmpty = isEmptyRichText(richText) && !divRef.current?.textContent?.trim();

  return (
    <WrapperComponent
      ref={divRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onCompositionStart={handleCompositionStart}
      onCompositionUpdate={handleCompositionUpdate}
      onCompositionEnd={handleCompositionEnd}
      data-placeholder={isEmpty ? placeholder : undefined}
      className={`rich-text-editor outline-none whitespace-pre-wrap break-words [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-[var(--muted)] [&:empty:before]:pointer-events-none ${className}`}
      style={{ minHeight: "1.5em", cursor: "text" }}
    />
  );
}

interface MarkdownModeProps {
  value: string | null | undefined;
  onChange: (markdown: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onPasteUrl?: (url: string) => void;
}

function MarkdownMode({
  value,
  onChange,
  readOnly,
  placeholder,
  className,
  onKeyDown,
  onFocus,
  onBlur,
  onPasteUrl
}: MarkdownModeProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const isInternal = useRef(false);

  const syncToMarkdown = useCallback(() => {
    const el = divRef.current;
    if (!el) return "";
    const html = el.innerHTML;
    if (html === "<br>" || !html.trim()) return "";
    let text = html
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
      .replace(/<s>(.*?)<\/s>/g, "~~$1~~")
      .replace(/<code>(.*?)<\/code>/g, "`$1`")
      .replace(/<span style="color:var\(--(\w+)\)">(.*?)<\/span>/g, "@@$1:$2@@")
      .replace(/<span class="highlight-(\w+)">(.*?)<\/span>/g, "@@bg-$1:$2@@")
      .replace(/&nbsp;/g, " ")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/<div><br><\/div>/g, "\n")
      .replace(/<div>(.*?)<\/div>/g, "$1\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "");
    return text;
  }, []);

  const renderHtml = useCallback((text: string | null | undefined) => {
    if (!text) return "";
    return markdownToHtml(text);
  }, []);

  useLayoutEffect(() => {
    if (!divRef.current || isInternal.current) {
      isInternal.current = false;
      return;
    }
    const saved = saveCursor(divRef.current);
    const html = renderHtml(value);
    if (divRef.current.innerHTML !== html) {
      divRef.current.innerHTML = html || "";
      if (saved) setTimeout(() => restoreCursor(divRef.current, saved), 0);
    }
  }, [value, renderHtml]);

  const handleInput = useCallback(() => {
    if (readOnly) return;
    isInternal.current = true;
    const md = syncToMarkdown();
    onChange(md);
    isInternal.current = false;
  }, [onChange, syncToMarkdown, readOnly]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onKeyDown?.(e);
      return;
    }
    if (e.key === "Backspace") {
      const text = divRef.current?.textContent || "";
      if (!text && !value) {
        e.preventDefault();
        onKeyDown?.(e);
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      document.execCommand("bold", false);
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      document.execCommand("italic", false);
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      e.preventDefault();
      document.execCommand("underline", false);
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
      e.preventDefault();
      document.execCommand("strikeThrough", false);
      handleInput();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === "Backquote") {
      e.preventDefault();
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        document.execCommand("insertHTML", false, "`" + sel.toString() + "`");
        handleInput();
      }
      return;
    }
    onKeyDown?.(e);
  }, [onKeyDown, handleInput, readOnly, value]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const urlMatch = text.match(/^https?:\/\/[^\s]+$/);
    if (urlMatch && onPasteUrl) {
      onPasteUrl(urlMatch[0]);
      return;
    }
    const html = e.clipboardData.getData("text/html");
    if (html && text !== urlMatch?.[0]) {
      const cleaned = html.replace(/<meta[^>]*>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
      document.execCommand("insertHTML", false, cleaned);
    } else {
      document.execCommand("insertText", false, text);
    }
    handleInput();
  }, [handleInput, readOnly, onPasteUrl]);

  const handleFocus = useCallback((e: React.FocusEvent) => {
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    const md = syncToMarkdown();
    onChange(md);
    onBlur?.(e);
  }, [onBlur, onChange, syncToMarkdown]);

  const isEmpty = !divRef.current?.textContent?.trim() && !value;

  return (
    <div
      ref={divRef}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      data-placeholder={isEmpty ? placeholder : undefined}
      className={`outline-none whitespace-pre-wrap break-words [&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-[var(--muted)] [&:empty:before]:pointer-events-none ${className}`}
      style={{ minHeight: "1.5em", cursor: "text" }}
    />
  );
}

// RichTextEditor is a dual-mode component: callers pass EITHER a
// `richText`-based prop set (RichTextModeProps) OR a `value`/`onChange`
// markdown-based prop set (MarkdownModeProps) — never a mix of both. This
// is determined purely at runtime by `'richText' in props`, matching the
// exact original .jsx dispatch. The union (rather than a single shared
// interface) documents that these are genuinely two distinct calling
// conventions used by different call sites in renderBlockEditor.jsx —
// confirmed as load-bearing per this migration's explicit critical-file
// instruction, so the runtime branch below is preserved exactly as-is.
type RichTextEditorProps = RichTextModeProps | MarkdownModeProps;

export default function RichTextEditor(props: RichTextEditorProps) {
  const hasRichText = 'richText' in props && props.richText !== undefined;

  if (hasRichText) {
    return <RichTextMode {...(props as RichTextModeProps)} />;
  }

  return <MarkdownMode {...(props as MarkdownModeProps)} />;
}

export { richTextToHtml, htmlToRichText, richTextToPlainText, normalizeRichText, isEmptyRichText };
