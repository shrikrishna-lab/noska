import React, { useMemo } from "react";
import {
  Check,
  Square,
  Table,
  Hash,
  Image as ImageIcon,
  Terminal,
  Quote as QuoteIcon,
  Link2,
  MessageSquare,
  ChevronRight,
  FileText
} from "lucide-react";
import { renderInlineMarkdown } from "../../utils/helpers";
import { getBlockTitle } from "../../utils/blockModel";
import type { Page } from "../../lib/supabaseService";
import type { Block } from "../../../types/blocks";
import { PageIcon } from "../PageIcon";

// Real block text: rich-text spans (primary storage) fall back to block.text
function btext(block: Block): string {
  return (getBlockTitle(block as never) || block.text || "").trim();
}

function calloutIcon(block: Block): string {
  const p = block.properties as Record<string, unknown> | undefined;
  const icon = typeof p?.icon === "string" ? p.icon : undefined;
  return icon || "💡";
}

const CALLOUT_TONES: Record<string, string> = {
  info: "bg-[var(--callout)]",
  default: "bg-[var(--surface-2)]",
  gray: "bg-[#f0f0f0] dark:bg-[#1a1a1a]",
  brown: "bg-[#f5f0eb] dark:bg-[#2a2218]",
  orange: "bg-[#faf0e6] dark:bg-[#2a1f0f]",
  yellow: "bg-[#faf6e6] dark:bg-[#2a260f]",
  green: "bg-[#eef5ee] dark:bg-[#122612]",
  blue: "bg-[#eef3f8] dark:bg-[#0f1d2a]",
  purple: "bg-[#f2eef8] dark:bg-[#1f122a]",
  pink: "bg-[#f8eef5] dark:bg-[#2a0f1f]",
  red: "bg-[#f8eeee] dark:bg-[#2a0f0f]"
};

interface PreviewBlock {
  block: Block;
  depth: number;
}

// Build a faithful tree: children are found via parentId (with `content`
// fallback); top-level blocks are those with null/undefined parentId OR a
// parentId that doesn't resolve to a block in this page. All real blocks
// are included (no cap) so long content can scroll.
function buildTree(blocks: Block[], pageId: string): PreviewBlock[] {
  const byId = new Map<string, Block>();
  blocks.forEach((b) => byId.set(b.id, b));

  const childrenByParent = new Map<string, Block[]>();
  const topLevel: Block[] = [];

  blocks.forEach((b) => {
    if (b.isDeleted) return;
    const parent = b.parentId ? byId.get(b.parentId) : undefined;
    if (b.parentId && parent && parent.id !== pageId) {
      const arr = childrenByParent.get(b.parentId) || [];
      arr.push(b);
      childrenByParent.set(b.parentId, arr);
    } else {
      topLevel.push(b);
    }
  });

  const sortPos = (arr: Block[]) =>
    arr.sort((a, b) => (a.position || "").localeCompare(b.position || ""));

  const out: PreviewBlock[] = [];
  const walk = (list: Block[], depth: number) => {
    sortPos(list).forEach((b) => {
      out.push({ block: b, depth });
      const kids = childrenByParent.get(b.id);
      if (kids && kids.length) walk(kids, depth + 1);
      else if (b.content && b.content.length) {
        const fromContent = b.content
          .map((id) => byId.get(id))
          .filter((x): x is Block => Boolean(x && !x.isDeleted));
        if (fromContent.length) walk(fromContent, depth + 1);
      }
    });
  };

  walk(topLevel, 0);
  return out;
}

function MiniBlock({ block, depth }: PreviewBlock) {
  const indent = { paddingLeft: depth > 0 ? `${Math.min(depth, 6) * 16}px` : undefined };

  switch (block.type) {
    case "h1":
    case "heading_1":
      return (
        <div style={indent} className="pt-2 pb-1 text-[20px] font-bold leading-snug text-[var(--text)]">
          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "h2":
    case "heading_2":
      return (
        <div style={indent} className="pt-1.5 pb-0.5 text-[17px] font-semibold leading-snug text-[var(--text)]">
          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "h3":
    case "heading_3":
      return (
        <div style={indent} className="pt-1 pb-0.5 text-[15px] font-medium leading-snug text-[var(--text)]">
          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "h4":
    case "heading_4":
      return (
        <div style={indent} className="pt-0.5 text-[14px] font-medium leading-snug text-[var(--text)]">
          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "bullet":
    case "bulleted_list_item":
      return (
        <div style={indent} className="flex items-start gap-1.5 text-[14px] leading-snug text-[var(--text-secondary)]">
          <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--text-muted)]" />
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "number":
    case "numbered_list_item":
      return (
        <div style={indent} className="flex items-start gap-1.5 text-[14px] leading-snug text-[var(--text-secondary)]">
          <span className="shrink-0 font-mono text-[12px] text-[var(--muted)] mt-px">1.</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "todo":
    case "to_do": {
      const checked = !!(block.properties as Record<string, unknown> | undefined)?.checked;
      return (
        <div style={indent} className="flex items-start gap-1.5 text-[14px] leading-snug">
          {checked ? (
            <Check size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          ) : (
            <Square size={13} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
          )}
          <span className={checked ? "flex-1 text-[var(--muted)] line-through" : "flex-1 text-[var(--text-secondary)]"}>
            <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
          </span>
        </div>
      );
    }
    case "toggle":
    case "toggle-h1":
    case "toggle-h2":
    case "toggle-h3":
      return (
        <div style={indent} className="flex items-start gap-1.5 text-[14px] leading-snug text-[var(--text-secondary)]">
          <ChevronRight size={14} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "quote":
      return (
        <div style={indent} className="border-l-2 border-[var(--accent)] pl-2.5 py-0.5 text-[14px] italic leading-snug text-[var(--text-secondary)]">
          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    case "callout": {
      const p = block.properties as Record<string, unknown> | undefined;
      const tone = typeof p?.tone === "string" ? p.tone : typeof p?.color === "string" ? p.color : "info";
      return (
        <div style={indent} className={`flex items-start gap-2.5 rounded-md border border-[var(--border)] px-3 py-2 text-[14px] leading-snug text-[var(--text)] ${CALLOUT_TONES[tone] || "bg-[var(--callout)]"}`}>
          <span className="shrink-0 text-[15px] leading-none mt-px">{calloutIcon(block)}</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
    }
    case "code":
      return (
        <div style={indent} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[12px] leading-relaxed text-[var(--text)] whitespace-pre-wrap">
          {btext(block) || "// empty code block"}
        </div>
      );
    case "divider":
      return <hr style={indent} className="my-1 border-[var(--border)]" />;
    case "image":
      return block.text ? (
        <div style={indent}>
          <img src={block.text} alt="" className="max-h-[120px] w-full rounded-md border border-[var(--border)] object-cover" loading="lazy" />
        </div>
      ) : (
        <div style={indent} className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
          <ImageIcon size={13} /> Image
        </div>
      );
    case "page": {
      const p = block.properties as Record<string, unknown> | undefined;
      return (
        <div style={indent} className="flex items-center gap-2 text-[14px] leading-snug text-[var(--text)]">
          <span className="shrink-0 flex items-center justify-center text-[14px]">
            <PageIcon icon={typeof p?.icon === "string" ? p.icon : undefined} size={14} fallback={<FileText size={14} />} />
          </span>
          <span className="truncate">{btext(block) || "Untitled"}</span>
        </div>
      );
    }
    case "database":
    case "table":
      return (
        <div style={indent} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[13px] text-[var(--text)]">
          <Table size={14} className="shrink-0 text-[var(--accent)]" />
          <span className="truncate font-medium">{btext(block) || "Database"}</span>
        </div>
      );
    case "link_to_page":
    case "link-to-page":
      return (
        <div style={indent} className="flex items-center gap-1.5 text-[14px] leading-snug text-[var(--accent)]">
          <Link2 size={12} className="shrink-0" />
          <span className="truncate">{btext(block) || "Link to page"}</span>
        </div>
      );
    case "mention":
      return (
        <div style={indent} className="flex items-center gap-1.5 text-[14px] leading-snug text-[var(--accent)]">
          <MessageSquare size={12} className="shrink-0" />
          <span className="truncate">@{btext(block) || "mention"}</span>
        </div>
      );
    case "bookmark":
      return (
        <div style={indent} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] leading-snug text-[var(--text-secondary)]">
          <QuoteIcon size={13} className="shrink-0 text-[var(--muted)]" />
          <span className="truncate flex-1">{btext(block) || "Web bookmark"}</span>
        </div>
      );
    case "video":
    case "audio":
    case "file":
    case "mermaid":
    case "ai-block":
    case "ai-meeting":
    case "embed-generic":
    case "template_button":
    case "button":
    case "breadcrumb":
    case "table_of_contents":
    case "table-of-contents":
    case "synced_block":
    case "synced-block":
    case "form":
    case "block-equation":
    case "inline-equation":
      return (
        <div style={indent} className="flex items-center gap-1.5 text-[14px] leading-snug text-[var(--text-secondary)]">
          <Terminal size={13} className="shrink-0 text-[var(--muted)]" />
          <span className="truncate flex-1">{btext(block) || block.type.replace(/-/g, " ")}</span>
        </div>
      );
    case "columns":
    case "2-columns":
    case "3-columns":
    case "4-columns":
    case "5-columns":
      return (
        <div style={indent} className="text-[12px] text-[var(--muted)]">
          ▦ {block.type.replace("-columns", " columns")}
        </div>
      );
    case "tabs":
      return (
        <div style={indent} className="flex items-center gap-1 text-[12px] text-[var(--muted)]">
          <Hash size={11} /> Tabs block
        </div>
      );
    default:
      return (
        <div style={indent} className="text-[14px] leading-relaxed text-[var(--text-secondary)] break-words">
          <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(btext(block)) }} />
        </div>
      );
  }
}

export default function PageBlocksPreview({ page }: { page: Page }) {
  const tree = useMemo(() => buildTree(page.blocks || [], page.id), [page.blocks, page.id]);

  if (tree.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] py-4 text-center text-[12px] italic text-[var(--muted)]">
        Empty page — no blocks yet
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tree.map(({ block, depth }) => (
        <MiniBlock key={block.id} block={block} depth={depth} />
      ))}
    </div>
  );
}