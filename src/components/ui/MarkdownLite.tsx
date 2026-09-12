import type { ReactNode } from "react";

// ── Markdown-lite (safe: builds React nodes, never injects HTML) ──────────
// Supports: #/##/### headings, **bold**, *italic*, _italic_, `code`,
// [text](url), "> " quote callouts, "- " bullets, "---" rules.

export interface MarkdownLiteOptions {
  /** Skip a leading "# Title" line — used when the title is already shown in chrome. */
  skipTitle?: boolean;
}

export function renderInlineMd(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*|_([^_\s][^_]*)_/g;
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
      nodes.push(<code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{m[4]}</code>);
    } else if (m[5] !== undefined) {
      nodes.push(<em key={k}>{m[5]}</em>);
    } else if (m[6] !== undefined) {
      nodes.push(<em key={k}>{m[6]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMarkdownLite(body: string, opts: MarkdownLiteOptions = {}): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = body.split("\n");
  let bullets: string[] = [];
  let quote: string[] = [];
  let titleSkipped = false;

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} className="ml-1 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2 leading-relaxed">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
            <span className="min-w-0">{renderInlineMd(b, `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  const flushQuote = (key: string) => {
    if (quote.length === 0) return;
    out.push(
      <div key={key} className="rounded-lg border-l-[3px] border-primary/40 bg-primary/5 px-3 py-2">
        {quote.map((q, i) => (
          <p key={i} className="text-[13px] italic leading-relaxed text-muted-foreground">
            {renderInlineMd(q, `${key}-${i}`)}
          </p>
        ))}
      </div>,
    );
    quote = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `b-${idx}`;

    if (/^\s*-\s+/.test(line)) {
      quote = [];
      bullets.push(line.replace(/^\s*-\s+/, ""));
      return;
    }
    flushBullets(key);

    if (/^>\s?/.test(line)) {
      quote.push(line.replace(/^>\s?/, ""));
      return;
    }
    flushQuote(key);

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      out.push(<hr key={key} className="my-4 border-border" />);
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      if (level === 1 && opts.skipTitle && !titleSkipped) {
        titleSkipped = true; // title already shown in chrome
        return;
      }
      if (level === 1) {
        out.push(
          <p key={key} className="text-lg font-bold tracking-tight text-foreground">
            {renderInlineMd(text, key)}
          </p>,
        );
      } else {
        out.push(
          <p key={key} className="mt-4 text-sm font-bold tracking-wide text-foreground">
            {renderInlineMd(text, key)}
          </p>,
        );
      }
      return;
    }

    if (line.trim() === "") return; // spacing handled per-block

    out.push(
      <p key={key} className="leading-relaxed text-foreground/90">
        {renderInlineMd(line, key)}
      </p>,
    );
  });

  flushBullets("b-end");
  flushQuote("q-end");
  return out;
}

export function MarkdownBody({
  body,
  className,
  opts,
}: {
  body: string;
  className?: string;
  opts?: MarkdownLiteOptions;
}) {
  return <div className={className ?? "space-y-2.5"}>{renderMarkdownLite(body, opts)}</div>;
}
