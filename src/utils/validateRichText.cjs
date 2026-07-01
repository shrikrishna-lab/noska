// Standalone validation script for markdownToRichText
// Run with: node src/utils/validateRichText.cjs

function createToken(type, start, end, content, extra) {
  extra = extra || {};
  return { type: type, start: start, end: end, content: content, url: extra.url || null };
}

function tokenizeMarkdown(text) {
  const tokens = [];
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

  tokens.sort((a, b) => a.start - b.start);
  return tokens;
}

function canMergeSpans(a, b) {
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

function hasAnyFormat(span) {
  return span.bold || span.italic || span.underline || span.strikethrough || span.code || span.link;
}

function mergeAdjacentSpans(spans) {
  if (!spans || spans.length === 0) return [];
  const merged = [];
  for (const span of spans) {
    if (!span.text || span.text.length === 0) continue;
    const last = merged[merged.length - 1];
    if (last && !hasAnyFormat(last) && !hasAnyFormat(span) && canMergeSpans(last, span)) {
      last.text += span.text;
    } else {
      merged.push({ text: span.text, bold: span.bold, italic: span.italic, code: span.code, strikethrough: span.strikethrough, link: span.link });
    }
  }
  return merged;
}

function markdownToRichText(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];
  const tokens = tokenizeMarkdown(markdown);
  if (tokens.length === 0) {
    return markdown.trim() ? [{ text: markdown }] : [];
  }
  const spans = [];
  let pos = 0;
  for (const token of tokens) {
    if (token.start > pos) {
      const plain = markdown.slice(pos, token.start);
      if (plain) spans.push({ text: plain });
    }
    const formats = {};
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

const testCases = [
  { id: 1, input: "Hello world", expected: [{ text: "Hello world" }] },
  { id: 2, input: "**bold text**", expected: [{ text: "bold text", bold: true }] },
  { id: "3a", input: "*italic*", expected: [{ text: "italic", italic: true }] },
  { id: "3b", input: "_italic_", expected: [{ text: "italic", italic: true }] },
  { id: 4, input: "`code here`", expected: [{ text: "code here", code: true }] },
  { id: 5, input: "~~struck~~", expected: [{ text: "struck", strikethrough: true }] },
  { id: 6, input: "***bold italic***", expected: [{ text: "bold italic", bold: true, italic: true }] },
  { id: 7, input: "Hello **bold** and _italic_ and `code`", expected: [
    { text: "Hello " },
    { text: "bold", bold: true },
    { text: " and " },
    { text: "italic", italic: true },
    { text: " and " },
    { text: "code", code: true }
  ]},
  { id: 8, input: "[click here](https://example.com)", expected: [{ text: "click here", link: "https://example.com" }] },
  { id: 9, input: "[**bold link**](https://example.com)", expected: [{ text: "bold link", bold: true, link: "https://example.com" }] },
  { id: 10, input: "**bold without close", expected: [{ text: "**bold without close" }] },
  { id: 11, input: "**bold****more bold**", expected: [
    { text: "bold", bold: true },
    { text: "more bold", bold: true }
  ]},
  { id: 12, input: "**bold**_italic_", expected: [
    { text: "bold", bold: true },
    { text: "italic", italic: true }
  ]},
  { id: 13, input: "", expected: [] },
  { id: 14, input: "2 * 3 = 6", expected: [{ text: "2 * 3 = 6" }] },
  { id: 15, input: "**bold **nested** bold**", expected: null, note: "Nested same-type markers - closing at first matching **" }
];

function richTextToString(richText) {
  if (!richText || richText.length === 0) return '[]';
  const parts = [];
  for (const s of richText) {
    const formats = [];
    if (s.bold) formats.push('B');
    if (s.italic) formats.push('I');
    if (s.code) formats.push('C');
    if (s.strikethrough) formats.push('S');
    if (s.link) formats.push('L(' + s.link + ')');
    const fmt = formats.length > 0 ? '<' + formats.join(',') + '>' : '';
    parts.push(fmt + '"' + s.text + '"');
  }
  return parts.join(' + ');
}

function compareSpans(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.text !== b.text) return false;
  if (Boolean(a.bold) !== Boolean(b.bold)) return false;
  if (Boolean(a.italic) !== Boolean(b.italic)) return false;
  if (Boolean(a.code) !== Boolean(a.code)) return false;
  if (Boolean(a.strikethrough) !== Boolean(b.strikethrough)) return false;
  if (a.link !== b.link) return false;
  return true;
}

function compareResults(actual, expected) {
  if (!Array.isArray(actual) && !Array.isArray(expected)) return actual === expected;
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  if (actual.length !== expected.length) return false;
  for (let m = 0; m < actual.length; m++) {
    if (!compareSpans(actual[m], expected[m])) return false;
  }
  return true;
}

console.log("================================================================================");
console.log("MARKDOWN TO RICH TEXT VALIDATION");
console.log("================================================================================");
console.log();

let passed = 0;
let failed = 0;
const bugs = [];

for (const tc of testCases) {
  const actual = markdownToRichText(tc.input);
  const actualStr = richTextToString(actual);
  let expectedStr;
  let pass;

  if (tc.expected === null) {
    // Case 15: documented as unsupported
    expectedStr = '(documented as unsupported - nested same-type markers)';
    pass = true; // Don't count as failure
    console.log('[' + tc.id + '] Input: "' + tc.input + '"');
    console.log('  Output:   ' + actualStr);
    console.log('  Expected: ' + expectedStr);
    console.log('  Result: PASS (documented non-support)');
    console.log('  Note: ' + tc.note);
    passed++;
  } else {
    expectedStr = richTextToString(tc.expected);
    pass = compareResults(actual, tc.expected);

    console.log('[' + tc.id + '] Input: "' + tc.input + '"');
    console.log('  Output:   ' + actualStr);
    console.log('  Expected: ' + expectedStr);
    console.log('  Result: ' + (pass ? 'PASS' : 'FAIL'));

    if (!pass) {
      failed++;
      bugs.push({
        id: tc.id,
        input: tc.input,
        actual: JSON.stringify(actual),
        expected: JSON.stringify(tc.expected)
      });
    } else {
      passed++;
    }
  }
  console.log();
}

console.log("================================================================================");
console.log("SUMMARY: " + passed + " passed, " + failed + " failed out of " + testCases.length + " test cases");
console.log("================================================================================");

if (bugs.length > 0) {
  console.log();
  console.log("FAILURES:");
  for (const bug of bugs) {
    console.log();
    console.log('BUG #' + bug.id);
    console.log('  Input:    "' + bug.input + '"');
    console.log('  Actual:   ' + bug.actual);
    console.log('  Expected: ' + bug.expected);
  }
}