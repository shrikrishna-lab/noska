// ═══════════════════════════════════════════════════════════════
// Clipboard Pipeline
// Handles paste and copy with support for future extensions.
// ═══════════════════════════════════════════════════════════════

export class ClipboardPipeline {
  constructor(options = {}) {
    this.onPasteUrl = options.onPasteUrl || null;
    this.onRichPaste = options.onRichPaste || null;
    this.onPlainPaste = options.onPlainPaste || null;
    this.onHtmlPaste = options.onHtmlPaste || null;
  }
  
  handlePaste(e, { insertHtml, insertText, insertRichText }) {
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
  
  handleCopy(e, { getSelectedHtml, getSelectedText, getRichText }) {
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

export function createClipboardPipeline(options) {
  return new ClipboardPipeline(options);
}

export function extractPlainText(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  return temp.textContent || temp.innerText || '';
}

export function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function htmlToClipboard(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  return temp.textContent || '';
}