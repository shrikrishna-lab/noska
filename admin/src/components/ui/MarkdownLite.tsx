import type { ReactNode } from "react";

export function renderInlineMd(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const k = `${keyPrefix}-${i++}`;
    if (m[1] !== undefined) {
      nodes.push(<a key={k} href={m[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{m[1]}</a>);
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={k} className="font-semibold">{m[3]}</strong>);
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

function renderMarkdownLiteShared(body: string): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = body.split("\n");
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} className="ml-3.5 list-disc space-y-0.5">
        {bullets.map((b, i) => <li key={i}>{renderInlineMd(b, `${key}-${i}`)}</li>)}
      </ul>,
    );
    bullets = [];
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^\s*-\s+/.test(line)) { bullets.push(line.replace(/^\s*-\s+/, "")); return; }
    flush(`ul-${idx}`);
    if (/^#{1,6}\s+/.test(line)) {
      out.push(<p key={idx} className="font-semibold text-foreground">{renderInlineMd(line.replace(/^#{1,6}\s+/, ""), `h-${idx}`)}</p>);
    } else if (/^>\s?/.test(line)) {
      out.push(<p key={idx} className="border-l-2 border-border pl-2 text-[11px] italic text-muted-foreground">{renderInlineMd(line.replace(/^>\s?/, ""), `q-${idx}`)}</p>);
    } else if (line.trim() === "") {
      // skip
    } else {
      out.push(<p key={idx}>{renderInlineMd(line, `p-${idx}`)}</p>);
    }
  });
  flush("ul-end");
  return out;
}


export function MarkdownBody({ body, className }: { body: string; className?: string }) {
  return <div className={className ?? "space-y-1.5"}>{renderMarkdownLiteShared(body)}</div>;
}
