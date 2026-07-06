// ═══════════════════════════════════════════════════════════════
// Rich Text Utilities
// Bidirectional conversion between rich text arrays and HTML.
// ═══════════════════════════════════════════════════════════════

// A single formatted text run — every field is optional except `text`,
// inferred from every property read/written across this file
// (richTextToHtml, getFormatFromElement, normalizeRichText, etc.).
export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  link?: string;
  color?: string;
  bgColor?: string;
  highlight?: string;
  tag?: string;
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

export function unescapeHtml(text: string) {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'");
}

export function isEmptyRichText(richText: RichTextSpan[] | null | undefined) {
  if (!richText || !Array.isArray(richText)) return true;
  return richText.length === 0 || richText.every(s => !s.text);
}

export function richTextToPlainText(richText: RichTextSpan[] | null | undefined) {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map(s => s.text || '').join('');
}

export function richTextToHtml(richText: RichTextSpan[] | null | undefined) {
  if (!richText || !Array.isArray(richText)) return '';
  
  return richText.map(span => {
    if (!span || typeof span.text !== 'string') return '';
    
    let text = escapeHtml(span.text);
    
    if (!text) return '';
    
    const formats = [];
    
    if (span.code) {
      return `<code class="inline-code">${text}</code>`;
    }
    
    if (span.link) {
      const href = escapeHtml(span.link);
      formats.push(`<a href="${href}" class="rich-link">`);
    }
    
    if (span.color && span.bgColor) {
      formats.push(`<span style="color:${span.color};background-color:${span.bgColor}">`);
    } else if (span.color) {
      formats.push(`<span style="color:${span.color}">`);
    } else if (span.bgColor) {
      formats.push(`<span style="background-color:${span.bgColor};padding:0 3px;border-radius:3px">`);
    }
    
    if (span.bold) formats.push('<strong>');
    if (span.italic) formats.push('<em>');
    if (span.underline) formats.push('<u>');
    if (span.strikethrough) formats.push('<s>');
    if (span.highlight) formats.push(`<mark class="highlight-${span.highlight}">`);
    
    const closeTags = formats.reverse().map(f => {
      if (f.startsWith('</')) return f;
      if (f.startsWith('<a')) return '</a>';
      if (f.startsWith('<span')) return '</span>';
      if (f.startsWith('<mark')) return '</mark>';
      if (f.startsWith('<strong')) return '</strong>';
      if (f.startsWith('<em')) return '</em>';
      if (f.startsWith('<u')) return '</u>';
      if (f.startsWith('<s')) return '</s>';
      return '';
    }).join('');
    
    return formats.join('') + text + closeTags;
  }).join('');
}

type SpanFormat = Omit<RichTextSpan, "text">;

interface WalkState {
  spans: RichTextSpan[];
  currentFormats: SpanFormat;
  skipNextBreak: boolean;
}

function createWalkState(): WalkState {
  return {
    spans: [],
    currentFormats: {},
    skipNextBreak: false
  };
}

function getFormatFromElement(el: Element): SpanFormat {
  const formats: SpanFormat = {};
  const tag = el.tagName?.toLowerCase();
  
  if (tag === 'strong' || tag === 'b') formats.bold = true;
  if (tag === 'em' || tag === 'i') formats.italic = true;
  if (tag === 'u') formats.underline = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') formats.strikethrough = true;
  if (tag === 'code') formats.code = true;
  if (tag === 'a') formats.link = el.getAttribute('href') || undefined;
  
  if (tag === 'span' || tag === 'mark') {
    const style = (el as HTMLElement).style;
    if (style.color) formats.color = style.color;
    if (style.backgroundColor) formats.bgColor = style.backgroundColor;
    if (el.classList) {
      for (const cls of el.classList) {
        if (cls.startsWith('highlight-')) {
          formats.highlight = cls.replace('highlight-', '');
        }
        if (cls === 'inline-code') {
          formats.code = true;
        }
        if (cls === 'rich-link') {
          formats.link = el.getAttribute('href') || undefined;
        }
      }
    }
  }
  
  if (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i' || tag === 'u' || tag === 's' || tag === 'strike' || tag === 'del' || tag === 'code') {
    formats.tag = tag;
  }
  
  return formats;
}

interface WalkOptions {
  onTextNode?: (text: string, formats: SpanFormat) => void;
}

function walkDOM(node: Node | null, state: WalkState, options: WalkOptions = {}) {
  if (!node) return;
  
  const { onTextNode = () => {} } = options;
  
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (text) {
      onTextNode(text, state.currentFormats);
    }
    return;
  }
  
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  
  const el = node as Element;
  const tag = el.tagName?.toLowerCase();
  
  if (tag === 'br') {
    if (state.spans.length > 0 && state.spans[state.spans.length - 1].text !== '\n') {
      state.spans.push({ text: '\n' });
    }
    return;
  }
  
  if (tag === 'div' || tag === 'p') {
    const hadContent = state.spans.length > 0;
    walkDOMChildren(node, state, options);
    if (hadContent && state.spans.length > 0 && state.spans[state.spans.length - 1].text !== '\n') {
      state.spans.push({ text: '\n' });
    }
    return;
  }
  
  const formats = getFormatFromElement(el);
  const savedFormats = { ...state.currentFormats };
  
  Object.assign(state.currentFormats, formats);
  
  walkDOMChildren(node, state, options);
  
  state.currentFormats = savedFormats;
}

function walkDOMChildren(node: Node, state: WalkState, options: WalkOptions) {
  if (!node) return;
  const childNodes = node.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    walkDOM(childNodes[i], state, options);
  }
}

export function htmlToRichText(html: string): RichTextSpan[] {
  if (!html || typeof html !== 'string') return [];
  
  const trimmed = html.trim();
  if (!trimmed || trimmed === '<br>' || trimmed === '<div><br></div>') {
    return [];
  }
  
  const state = createWalkState();
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  state.spans = [];
  
  walkDOM(tempDiv, state, {
    onTextNode(text, formats) {
      if (!text) return;
      state.spans.push({ text, ...formats });
    }
  });
  
  const merged: RichTextSpan[] = [];
  for (const span of state.spans) {
    if (span.text === '\n') continue;
    
    const last = merged[merged.length - 1];
    if (last && canMergeSpans(last, span)) {
      last.text += span.text;
    } else {
      merged.push({ ...span });
    }
  }
  
  return merged.filter(s => s.text && s.text.length > 0);
}

function canMergeSpans(a: RichTextSpan, b: RichTextSpan) {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.strikethrough === b.strikethrough &&
    a.code === b.code &&
    a.link === b.link &&
    a.color === b.color &&
    a.bgColor === b.bgColor &&
    a.highlight === b.highlight
  );
}

export function normalizeRichText(richText: RichTextSpan[] | null | undefined): RichTextSpan[] {
  if (!richText || !Array.isArray(richText)) return [];
  
  const result: RichTextSpan[] = [];
  for (const span of richText) {
    if (!span || typeof span.text !== 'string') continue;
    if (!span.text) continue;
    
    const normalized: RichTextSpan = { text: span.text };
    if (span.bold) normalized.bold = true;
    if (span.italic) normalized.italic = true;
    if (span.underline) normalized.underline = true;
    if (span.strikethrough) normalized.strikethrough = true;
    if (span.code) normalized.code = true;
    if (span.link) normalized.link = span.link;
    if (span.color) normalized.color = span.color;
    if (span.bgColor) normalized.bgColor = span.bgColor;
    if (span.highlight) normalized.highlight = span.highlight;
    
    result.push(normalized);
  }
  
  return result;
}

export function compareRichText(a: RichTextSpan[] | null | undefined, b: RichTextSpan[] | null | undefined) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    const sa = a[i];
    const sb = b[i];
    if (sa.text !== sb.text) return false;
    if (Boolean(sa.bold) !== Boolean(sb.bold)) return false;
    if (Boolean(sa.italic) !== Boolean(sb.italic)) return false;
    if (Boolean(sa.underline) !== Boolean(sb.underline)) return false;
    if (Boolean(sa.strikethrough) !== Boolean(sb.strikethrough)) return false;
    if (Boolean(sa.code) !== Boolean(sb.code)) return false;
    if (sa.link !== sb.link) return false;
    if (sa.color !== sb.color) return false;
    if (sa.bgColor !== sb.bgColor) return false;
    if (sa.highlight !== sb.highlight) return false;
  }
  
  return true;
}

export function cloneRichText(richText: RichTextSpan[] | null | undefined): RichTextSpan[] {
  if (!richText || !Array.isArray(richText)) return [];
  return richText.map(span => ({ ...span }));
}

export function plainTextToRichText(text: string): RichTextSpan[] {
  if (!text) return [];
  return [{ text }];
}

interface MarkdownToken {
  type: string;
  start: number;
  end: number;
  content: string;
  url: string | null;
}

function createToken(type: string, start: number, end: number, content: string, extra?: { url?: string }): MarkdownToken {
  extra = extra || {};
  return { type, start, end, content, url: extra.url || null };
}

function tokenizeMarkdown(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    // Bold-italic: ***text***
    if (i <= len - 3 && text[i] === '*' && text[i + 1] === '*' && text[i + 2] === '*') {
      const openPos = i;
      i += 3;
      let contentStart = i;
      let contentEnd = -1;
      let closePos = -1;
      // Find closing ***
      let j = i;
      while (j <= len - 3) {
        if (text[j] === '*' && text[j + 1] === '*' && text[j + 2] === '*') {
          contentEnd = j;
          closePos = j;
          break;
        }
        j++;
      }
      if (closePos !== -1 && contentEnd > contentStart) {
        tokens.push(createToken('bold-italic', openPos, closePos + 3, text.slice(contentStart, contentEnd)));
        i = closePos + 3;
        continue;
      } else {
        // Not a valid bold-italic, treat as literal ***
        tokens.push(createToken('literal', openPos, openPos + 3, '***'));
        i = openPos + 3;
        continue;
      }
    }

    // Bold: **text**
    if (i <= len - 2 && text[i] === '*' && text[i + 1] === '*') {
      const openPos = i;
      i += 2;
      let contentStart = i;
      let contentEnd = -1;
      let closePos = -1;
      // Find closing **
      let j = i;
      while (j <= len - 2) {
        if (text[j] === '*' && text[j + 1] === '*') {
          contentEnd = j;
          closePos = j;
          break;
        }
        j++;
      }
      if (closePos !== -1 && contentEnd > contentStart) {
        tokens.push(createToken('bold', openPos, closePos + 2, text.slice(contentStart, contentEnd)));
        i = closePos + 2;
        continue;
      } else {
        // Not a valid bold, treat as literal **
        tokens.push(createToken('literal', openPos, openPos + 2, '**'));
        i = openPos + 2;
        continue;
      }
    }

    // Strikethrough: ~~text~~
    if (i <= len - 2 && text[i] === '~' && text[i + 1] === '~') {
      const openPos = i;
      i += 2;
      let contentStart = i;
      let contentEnd = -1;
      let closePos = -1;
      let j = i;
      while (j <= len - 2) {
        if (text[j] === '~' && text[j + 1] === '~') {
          contentEnd = j;
          closePos = j;
          break;
        }
        j++;
      }
      if (closePos !== -1 && contentEnd > contentStart) {
        tokens.push(createToken('strikethrough', openPos, closePos + 2, text.slice(contentStart, contentEnd)));
        i = closePos + 2;
        continue;
      } else {
        tokens.push(createToken('literal', openPos, openPos + 2, '~~'));
        i = openPos + 2;
        continue;
      }
    }

    // Code: `text`
    if (i < len && text[i] === '`') {
      const openPos = i;
      i++;
      let contentStart = i;
      let closePos = -1;
      let j = i;
      while (j < len) {
        if (text[j] === '`') {
          closePos = j;
          break;
        }
        j++;
      }
      if (closePos !== -1 && closePos > contentStart) {
        tokens.push(createToken('code', openPos, closePos + 1, text.slice(contentStart, closePos)));
        i = closePos + 1;
        continue;
      } else {
        tokens.push(createToken('literal', openPos, openPos + 1, '`'));
        i = openPos + 1;
        continue;
      }
    }

    // Italic: *text* or _text_
    if ((i < len && text[i] === '*') || (i < len && text[i] === '_')) {
      const marker = text[i];
      const openPos = i;
      i++;
      let contentStart = i;
      let closePos = -1;
      let j = i;
      while (j < len) {
        if (text[j] === marker && (j === 0 || text[j - 1] !== marker)) {
          closePos = j;
          break;
        }
        j++;
      }
      if (closePos !== -1 && closePos > contentStart) {
        tokens.push(createToken('italic', openPos, closePos + 1, text.slice(contentStart, closePos)));
        i = closePos + 1;
        continue;
      } else {
        tokens.push(createToken('literal', openPos, openPos + 1, marker));
        continue;
      }
    }

    // Link: [text](url)
    if (i < len && text[i] === '[') {
      const openPos = i;
      let j = i + 1;
      let textEnd = -1;
      while (j < len) {
        if (text[j] === ']') {
          textEnd = j;
          break;
        }
        j++;
      }
      if (textEnd !== -1 && textEnd > i + 1 && textEnd + 1 < len && text[textEnd + 1] === '(') {
        const urlStart = textEnd + 2;
        let urlEnd = -1;
        let parenCount = 1;
        let k = urlStart;
        while (k < len && parenCount > 0) {
          if (text[k] === '(') parenCount++;
          else if (text[k] === ')') parenCount--;
          if (parenCount === 0) {
            urlEnd = k;
            break;
          }
          k++;
        }
        if (urlEnd !== -1 && urlEnd > urlStart) {
          const linkText = text.slice(i + 1, textEnd);
          const url = text.slice(urlStart, urlEnd);
          tokens.push(createToken('link', openPos, urlEnd + 1, linkText, { url }));
          i = urlEnd + 1;
          continue;
        }
      }
    }

    // No marker found, skip one character
    i++;
  }

  // Sort tokens by start position
  tokens.sort((a, b) => a.start - b.start);

  return tokens;
}

function hasAnyFormat(span: RichTextSpan) {
  return span.bold || span.italic || span.underline || span.strikethrough || span.code || span.link;
}

function mergeAdjacentSpans(spans: RichTextSpan[]): RichTextSpan[] {
  if (!spans || spans.length === 0) return [];

  const merged: RichTextSpan[] = [];
  for (const span of spans) {
    if (!span.text || span.text.length === 0) continue;

    const last = merged[merged.length - 1];
    if (last && !hasAnyFormat(last) && !hasAnyFormat(span) && canMergeSpans(last, span)) {
      last.text += span.text;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

export function markdownToRichText(markdown: string): RichTextSpan[] {
  if (!markdown || typeof markdown !== 'string') return [];

  const tokens = tokenizeMarkdown(markdown);

  if (tokens.length === 0) {
    return markdown.trim() ? [{ text: markdown }] : [];
  }

  const spans: RichTextSpan[] = [];
  let pos = 0;

  for (const token of tokens) {
    if (token.start > pos) {
      const plain = markdown.slice(pos, token.start);
      if (plain) spans.push({ text: plain });
    }

    const formats: SpanFormat = {};

    switch (token.type) {
      case 'bold-italic':
        formats.bold = true;
        formats.italic = true;
        break;
      case 'bold':
        formats.bold = true;
        break;
      case 'italic':
        formats.italic = true;
        break;
      case 'strikethrough':
        formats.strikethrough = true;
        break;
      case 'code':
        formats.code = true;
        break;
      case 'link': {
        const innerRichText = markdownToRichText(token.content);
        if (innerRichText.length === 1 && !innerRichText[0].bold && !innerRichText[0].italic && !innerRichText[0].code && !innerRichText[0].strikethrough) {
          formats.link = token.url;
        } else {
          for (const inner of innerRichText) {
            spans.push({
              text: inner.text,
              bold: inner.bold,
              italic: inner.italic,
              code: inner.code,
              strikethrough: inner.strikethrough,
              link: token.url
            });
          }
          pos = token.end;
          continue;
        }
        break;
      }
      case 'literal':
        spans.push({ text: token.content });
        pos = token.end;
        continue;
    }

    spans.push({ text: token.content, ...formats });
    pos = token.end;
  }

  if (pos < markdown.length) {
    const remainder = markdown.slice(pos);
    if (remainder) spans.push({ text: remainder });
  }

  return mergeAdjacentSpans(spans);
}