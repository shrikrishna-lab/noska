import type { ReactNode } from "react";

// ── Markdown-lite (safe: builds React nodes, never injects HTML) ──────────
// Supports: **bold**, *italic*, `code`, [text](url), "# "/"## " headings,
// "> " quote lines and "- " bullets. Everything else is plain text.

export function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // token pattern: link, bold, code, italic — matched left to right
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyPrefix}-${i++}`;
    if (m[1] !== undefined) {
      nodes.push(
        <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
          {m[1]}
        </a>,
      );
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={k} className="font-semibold text-foreground">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">{m[4]}</code>);
    } else if (m[5] !== undefined) {
      nodes.push(<em key={k}>{m[5]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMarkdownLite(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = body.split("\n");
  let bullets: string[] = [];
  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} className="ml-3.5 list-disc space-y-0.5">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `${key}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^\s*-\s+/.test(line)) {
      bullets.push(line.replace(/^\s*-\s+/, ""));
      return;
    }
    flushBullets(`ul-${idx}`);
    if (/^#{1,6}\s+/.test(line)) {
      out.push(
        <p key={idx} className="mt-0.5 text-xs font-semibold text-foreground">
          {renderInline(line.replace(/^#{1,6}\s+/, ""), `h-${idx}`)}
        </p>,
      );
    } else if (/^>\s?/.test(line)) {
      out.push(
        <p key={idx} className="border-l-2 border-current/20 pl-2 text-[11px] italic text-muted-foreground">
          {renderInline(line.replace(/^>\s?/, ""), `q-${idx}`)}
        </p>,
      );
    } else if (line.trim() === "") {
      // collapse blank lines inside a compact banner
    } else {
      out.push(<p key={idx}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushBullets("ul-end");
  return out;
}


// Convenience wrapper: renders a markdown string as styled block elements.
export function MarkdownBody({ body, className }: { body: string; className?: string }) {
  return <div className={className ?? "space-y-1.5"}>{renderMarkdownLite(body)}</div>;
}
