// ═══════════════════════════════════════════════════════════════
// Clipboard Pipeline
// Handles paste and copy with support for future extensions.
// ═══════════════════════════════════════════════════════════════

interface ClipboardPipelineOptions {
  onPasteUrl?: ((url: string) => void) | null;
  onRichPaste?: ((html: string, helpers: { insertHtml: (html: string) => void }) => void) | null;
  onPlainPaste?: ((text: string, helpers: { insertText: (text: string) => void }) => void) | null;
  onHtmlPaste?: ((html: string, helpers: { insertHtml: (html: string) => void }) => void) | null;
}

interface HandlePasteHelpers {
  insertHtml: (html: string) => void;
  insertText: (text: string) => void;
  insertRichText?: (rich: unknown) => void;
}

export class ClipboardPipeline {
  onPasteUrl: ClipboardPipelineOptions["onPasteUrl"];
  onRichPaste: ClipboardPipelineOptions["onRichPaste"];
  onPlainPaste: ClipboardPipelineOptions["onPlainPaste"];
  onHtmlPaste: ClipboardPipelineOptions["onHtmlPaste"];
  onCopy?: (() => void) | null;

  constructor(options: ClipboardPipelineOptions = {}) {
    this.onPasteUrl = options.onPasteUrl || null;
    this.onRichPaste = options.onRichPaste || null;
    this.onPlainPaste = options.onPlainPaste || null;
    this.onHtmlPaste = options.onHtmlPaste || null;
  }
  
  handlePaste(e: ClipboardEvent, { insertHtml, insertText, insertRichText }: HandlePasteHelpers) {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return false;
    
    const items = Array.from(clipboardData.items || []);
    const htmlItem = items.find(item => item.kind === 'string' && item.type === 'text/html');
    const plainItem = items.find(item => item.kind === 'string' && item.type === 'text/plain');
    const urlItem = items.find(item => item.kind === 'string' && item.type === 'text/uri-list');
    
    const plainText = plainItem ? clipboardData.getData('text/plain') : '';
    
    if (urlItem) {
      const url = clipboardData.getData('text/uri-list') || clipboardData.getData('text/plain');
      if (url && /^https?:\/\//.test(url.trim())) {
        const urlOnly = url.trim().split(/\s/)[0];
        if (this.onPasteUrl) {
          e.preventDefault();
          this.onPasteUrl(urlOnly);
          return true;
        }
      }
    }
    
    if (htmlItem && this.onHtmlPaste) {
      e.preventDefault();
      const html = clipboardData.getData('text/html');
      this.onHtmlPaste(html, { insertHtml });
      return true;
    }
    
    if (plainText && this.onPlainPaste) {
      e.preventDefault();
      this.onPlainPaste(plainText, { insertText });
      return true;
    }
    
    if (this.onRichPaste && htmlItem) {
      e.preventDefault();
      const html = clipboardData.getData('text/html');
      this.onRichPaste(html, { insertHtml });
      return true;
    }
    
    return false;
  }
  
  handleCopy(e: ClipboardEvent, { getSelectedHtml, getSelectedText, getRichText }: {
    getSelectedHtml?: () => string;
    getSelectedText?: () => string;
    getRichText?: () => unknown;
  }) {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return false;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    if (!selectedText) return false;
    
    if (this.onCopy) {
      e.preventDefault();
      const richText = getRichText ? getRichText() : null;
      const html = getSelectedHtml ? getSelectedHtml() : range.cloneContents();
      clipboardData.setData('text/plain', selectedText);
      return true;
    }
    
    return false;
  }
}

export function createClipboardPipeline(options: ClipboardPipelineOptions) {
  return new ClipboardPipeline(options);
}

export function extractPlainText(html: string) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  return temp.textContent || temp.innerText || '';
}

export function cleanHtml(html: string) {
  if (!html) return '';
  return html
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function htmlToClipboard(html: string) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  return temp.textContent || '';
}