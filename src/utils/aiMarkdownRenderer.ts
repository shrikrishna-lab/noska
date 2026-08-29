/**
 * Noska AI — Fast, Streaming-Safe Markdown to HTML Parser
 * 
 * Supports:
 * - Tables (| col1 | col2 |)
 * - Fenced code blocks (```lang ... ```)
 * - Headers (#, ##, ###, ####)
 * - Unordered & Ordered Lists (- , * , 1. )
 * - Blockquotes (> )
 * - Horizontal Rules (---)
 * - Inline formatting (**bold**, *italic*, `code`, ~~strike~~, [links](url))
 * - Safe HTML escaping to prevent XSS
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseInline(text: string): string {
  let out = text;

  // Restore allowed safe <br> / <br/> tags after escaping
  out = out.replace(/&lt;br\s*\/?&gt;/gi, '<br />');
  out = out.replace(/<br\s*\/?>/gi, '<br />');

  // Inline code (escape content inside)
  out = out.replace(/`([^`]+)`/g, (_, code) => {
    return `<code class="px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] border border-[var(--border)] font-mono text-[12px] text-[var(--accent)]">${escapeHtml(code)}</code>`;
  });

  // Bold + Italic
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');

  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-[var(--text)]">$1</strong>');
  out = out.replace(/__(.+?)__/g, '<strong class="font-bold text-[var(--text)]">$1</strong>');

  // Italic
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strikethrough
  out = out.replace(/~~(.+?)~~/g, '<del class="opacity-60">$1</del>');

  // Links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline hover:opacity-80 transition-opacity">$1</a>');

  return out;
}

function parseTableCell(cellText: string): string {
  // 1. Convert raw <br> tags and literal "\n" to standardized <br />
  let content = cellText.replace(/<br\s*\/?>/gi, '<br />');

  // 2. Escape HTML
  content = escapeHtml(content);

  // 3. Apply inline markdown
  content = parseInline(content);

  // 4. If the cell contains bullet points (• or - ), format them with clean vertical spacing
  if (content.includes('•') || content.includes('<br />')) {
    const parts = content.split(/<br\s*\/?>/gi);
    if (parts.length > 1) {
      content = parts
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => {
          if (p.startsWith('•') || p.startsWith('-')) {
            const cleanBullet = p.replace(/^[•-]\s*/, '');
            return `<div class="flex items-start gap-1.5 my-1 text-[12.5px] leading-relaxed"><span class="text-[var(--accent)] select-none shrink-0">•</span><span>${cleanBullet}</span></div>`;
          }
          return `<div class="my-0.5 leading-relaxed">${p}</div>`;
        })
        .join('');
    }
  }

  return content;
}

export function renderAIMarkdown(rawMarkdown: string): string {
  if (!rawMarkdown) return '';

  const cleaned = rawMarkdown
    .replace(/<<TOOL:[\s\S]*?>>[\s\S]*?<<\/TOOL>>/gi, '')
    .replace(/<<TOOL:[\s\S]*?>>/gi, '')
    .replace(/<<\/TOOL>>/gi, '')
    .trim();

  if (!cleaned) return '';

  const lines = cleaned.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableHeaderParsed = false;
  let tableBuffer: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  function closeList() {
    if (inList) {
      htmlParts.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  }

  function flushTable() {
    if (!inTable) return;
    if (tableBuffer.length > 0) {
      let tableHtml = '<div className="overflow-x-auto my-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]"><table class="w-full text-left border-collapse text-xs">';
      
      // First line is header
      const headerLine = tableBuffer[0];
      const headerCells = headerLine
        .split('|')
        .map(c => c.trim())
        .filter((c, i, arr) => i > 0 && i < arr.length - 1 || (arr.length === 1 ? true : c !== ''));

      if (headerCells.length > 0) {
        tableHtml += '<thead class="bg-[var(--surface-2)] border-b border-[var(--border)]"><tr>';
        for (const h of headerCells) {
          tableHtml += `<th class="px-3 py-2 font-semibold text-[var(--text)] border-r last:border-r-0 border-[var(--border)]">${parseTableCell(h)}</th>`;
        }
        tableHtml += '</tr></thead>';
      }

      // Remaining rows (skipping delimiter line if present)
      tableHtml += '<tbody class="divide-y divide-[var(--border)]">';
      for (let r = 1; r < tableBuffer.length; r++) {
        const rowLine = tableBuffer[r];
        // Skip separator row like |---|---|
        if (/^\s*\|?\s*[-:]+[-| :]*\|?\s*$/.test(rowLine)) {
          continue;
        }
        const cells = rowLine
          .split('|')
          .map(c => c.trim())
          .filter((c, i, arr) => i > 0 && i < arr.length - 1 || (arr.length === 1 ? true : c !== ''));

        if (cells.length > 0) {
          tableHtml += '<tr class="hover:bg-[var(--surface-1)] transition-colors">';
          for (const cell of cells) {
            tableHtml += `<td class="px-3.5 py-2.5 border-r last:border-r-0 border-[var(--border)] leading-relaxed text-[var(--text-secondary)] align-top">${parseTableCell(cell)}</td>`;
          }
          tableHtml += '</tr>';
        }
      }
      tableHtml += '</tbody></table></div>';
      htmlParts.push(tableHtml);
    }
    inTable = false;
    tableHeaderParsed = false;
    tableBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Fenced Code Blocks
    if (/^```/.test(line.trim())) {
      if (inCodeBlock) {
        // Close code block
        closeList();
        const codeContent = escapeHtml(codeBuffer.join('\n'));
        htmlParts.push(
          `<div class="my-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[#1e1e24] text-[#ececec]">` +
          (codeLanguage ? `<div class="px-3.5 py-1.5 bg-[#18181c] border-b border-white/10 text-[10.5px] font-mono font-semibold uppercase tracking-wider text-[#a09c94] flex items-center justify-between"><span>${codeLanguage}</span></div>` : '') +
          `<pre class="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed scrollbar-thin"><code>${codeContent}</code></pre></div>`
        );
        inCodeBlock = false;
        codeBuffer = [];
        codeLanguage = '';
        continue;
      } else {
        closeList();
        flushTable();
        inCodeBlock = true;
        codeLanguage = line.trim().replace(/^```/, '').trim();
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 2. Tables: Lines containing multiple pipe characters
    if (/^\s*\|.*\|\s*$/.test(line) || (line.includes('|') && (lines[i + 1]?.includes('---') || tableBuffer.length > 0))) {
      closeList();
      inTable = true;
      tableBuffer.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 3. Headers
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      closeList();
      htmlParts.push(`<h1 class="text-xl font-bold text-[var(--text)] mt-4 mb-2 tracking-tight">${parseInline(escapeHtml(h1[1]))}</h1>`);
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      closeList();
      htmlParts.push(`<h2 class="text-lg font-bold text-[var(--text)] mt-3.5 mb-1.5 tracking-tight">${parseInline(escapeHtml(h2[1]))}</h2>`);
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      closeList();
      htmlParts.push(`<h3 class="text-sm font-semibold text-[var(--text)] mt-3 mb-1 tracking-tight">${parseInline(escapeHtml(h3[1]))}</h3>`);
      continue;
    }

    const h4 = line.match(/^####\s+(.+)$/);
    if (h4) {
      closeList();
      htmlParts.push(`<h4 class="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mt-2.5 mb-1">${parseInline(escapeHtml(h4[1]))}</h4>`);
      continue;
    }

    // 4. Horizontal Rules
    if (/^(\*\*\*|---|___)$/.test(line.trim())) {
      closeList();
      htmlParts.push('<hr class="my-3 border-[var(--border)]" />');
      continue;
    }

    // 5. Blockquotes
    const bq = line.match(/^>\s*(.+)$/);
    if (bq) {
      closeList();
      htmlParts.push(`<blockquote class="pl-3.5 border-l-2 border-[var(--accent)] text-[var(--text-secondary)] italic my-2">${parseInline(escapeHtml(bq[1]))}</blockquote>`);
      continue;
    }

    // 6. Unordered Lists (- , * , • )
    const ul = line.match(/^\s*[-*•]\s+(.+)$/);
    if (ul) {
      if (inList !== 'ul') {
        closeList();
        inList = 'ul';
        htmlParts.push('<ul class="list-disc pl-5 my-1.5 space-y-1 text-[var(--text)]">');
      }
      htmlParts.push(`<li class="leading-relaxed">${parseInline(escapeHtml(ul[1]))}</li>`);
      continue;
    }

    // 7. Ordered Lists (1. , 2. )
    const ol = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (ol) {
      if (inList !== 'ol') {
        closeList();
        inList = 'ol';
        htmlParts.push('<ol class="list-decimal pl-5 my-1.5 space-y-1 text-[var(--text)]">');
      }
      htmlParts.push(`<li class="leading-relaxed">${parseInline(escapeHtml(ol[2]))}</li>`);
      continue;
    }

    // Empty line closes list
    if (!line.trim()) {
      closeList();
      continue;
    }

    // 8. Regular paragraph / text line
    closeList();
    htmlParts.push(`<p class="leading-relaxed my-1.5 text-[var(--text)]">${parseInline(escapeHtml(line))}</p>`);
  }

  closeList();
  flushTable();

  // If stream cut off in the middle of code block, render partial code block cleanly
  if (inCodeBlock) {
    const codeContent = escapeHtml(codeBuffer.join('\n'));
    htmlParts.push(
      `<div class="my-3 rounded-xl overflow-hidden border border-[var(--border)] bg-[#1e1e24] text-[#ececec]">` +
      (codeLanguage ? `<div class="px-3.5 py-1.5 bg-[#18181c] border-b border-white/10 text-[10.5px] font-mono font-semibold uppercase tracking-wider text-[#a09c94]"><span>${codeLanguage}</span></div>` : '') +
      `<pre class="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed scrollbar-thin"><code>${codeContent}</code></pre></div>`
    );
  }

  return htmlParts.join('\n');
}
