/**
 * Noska Intelligence — Chat Markdown Renderer
 *
 * Converts model output (markdown) into safe HTML for the chat bubbles.
 * Everything is HTML-escaped FIRST, then a limited set of markdown
 * constructs is applied — so model output can never inject markup.
 * Supports: headings, bold/italic/strike, inline code, fenced code blocks,
 * links, bullet/numbered/todo lists, blockquotes, tables, dividers.
 */

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let codeCounter = 0;

/** Inline markdown on an already-escaped string. */
function renderInline(escaped: string): string {
  return escaped
    // links: [text](url) — only http(s)/mailto and workspace-relative
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|\/[^)\s]*)\)/g,
      (_m, label: string, url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`)
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/~~([^~]+)~~/g, "<s>$1</s>")
    .replace(/`([^`\n]+)`/g, '<code class="ai-inline-code">$1</code>');
}

/**
 * Render assistant markdown to safe HTML. Fenced code blocks become
 * <pre> with a data-language attribute and a copy button target.
 */
export function renderChatMarkdown(source: string | null | undefined): string {
  const raw = String(source || "");
  if (!raw.trim()) return "";
  codeCounter = 0;

  // Pull out fenced code blocks before line processing
  const blocks: string[] = [];
  let work = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang: string, code: string) => {
    const i = blocks.length;
    blocks.push(
      `<div class="ai-code-block"><div class="ai-code-head"><span>${escapeHtml(lang || "code")}</span>` +
      `<button type="button" class="ai-code-copy" data-code-index="${i}">Copy</button></div>` +
      `<pre><code data-raw="${escapeHtml(code.replace(/\n$/, ""))}">${escapeHtml(code.replace(/\n$/, ""))}</code></pre></div>`
    );
    return `\u0000CODEBLOCK${i}\u0000`;
  });

  const lines = work.split("\n");
  const out: string[] = [];
  let listStack: Array<"ul" | "ol"> = [];
  let inQuote = false;
  let tableRows: string[][] = [];

  const closeLists = () => {
    while (listStack.length) out.push(`</${listStack.pop()}>`);
  };
  const closeQuote = () => {
    if (inQuote) { out.push("</blockquote>"); inQuote = false; }
  };
  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [head, ...body] = tableRows;
    const cell = (c: string, tag: string) => `<${tag}>${renderInline(c.trim())}</${tag}>`;
    out.push("<table><thead><tr>" + head.map((c) => cell(c, "th")).join("") + "</tr></thead><tbody>");
    for (const row of body) out.push("<tr>" + row.map((c) => cell(c, "td")).join("") + "</tr>");
    out.push("</tbody></table>");
    tableRows = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Deferred code block placeholder
    const cbMatch = trimmed.match(/^\u0000CODEBLOCK(\d+)\u0000$/);
    if (cbMatch) {
      closeLists(); closeQuote(); flushTable();
      out.push(blocks[parseInt(cbMatch[1], 10)]);
      continue;
    }

    if (!trimmed) { closeLists(); closeQuote(); flushTable(); continue; }

    // Divider
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { closeLists(); closeQuote(); flushTable(); out.push("<hr/>"); continue; }

    // Headings — h1 is demoted one level for chat scale; others keep theirs
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeLists(); closeQuote(); flushTable();
      const level = h[1].length === 1 ? 2 : Math.min(h[1].length, 5);
      out.push(`<h${level}>${renderInline(escapeHtml(h[2]))}</h${level}>`);
      continue;
    }

    // Table rows (| a | b |) incl. separator row
    if (/^\|.*\|$/.test(trimmed)) {
      const cells = trimmed.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator
      closeLists(); closeQuote();
      tableRows.push(cells);
      continue;
    }
    flushTable();

    // Blockquote
    const q = trimmed.match(/^>\s?(.*)$/);
    if (q) {
      closeLists();
      if (!inQuote) { out.push("<blockquote>"); inQuote = true; }
      out.push(`<p>${renderInline(escapeHtml(q[1]))}</p>`);
      continue;
    }
    closeQuote();

    // Todo
    const todo = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (todo) {
      if (listStack[listStack.length - 1] !== "ul") { closeLists(); listStack.push("ul"); out.push('<ul class="ai-todo">'); }
      out.push(`<li class="ai-todo-item ${todo[1].trim().toLowerCase() === "x" ? "done" : ""}"><span class="ai-checkbox">${todo[1].trim().toLowerCase() === "x" ? "✓" : ""}</span>${renderInline(escapeHtml(todo[2]))}</li>`);
      continue;
    }

    // Bullet
    const bullet = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bullet) {
      if (listStack[listStack.length - 1] !== "ul") { closeLists(); listStack.push("ul"); out.push("<ul>"); }
      out.push(`<li>${renderInline(escapeHtml(bullet[1]))}</li>`);
      continue;
    }

    // Numbered
    const num = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (num) {
      if (listStack[listStack.length - 1] !== "ol") { closeLists(); listStack.push("ol"); out.push("<ol>"); }
      out.push(`<li>${renderInline(escapeHtml(num[1]))}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p>${renderInline(escapeHtml(trimmed))}</p>`);
  }
  closeLists(); closeQuote(); flushTable();

  return out.join("\n");
}
