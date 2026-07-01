import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, ChevronDown, ChevronRight, Trash2, Globe, ExternalLink, Sparkles } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { TextArea } from "../ui";
import RichTextEditor from "./RichTextEditor";
import { BlockRegistry } from "../../registry/BlockRegistry";
import { emojis, renderInlineMarkdown } from "../../utils/helpers";
import { markdownToRichText, richTextToPlainText } from "../../utils/richText";
import EmbedBlock from "./EmbedBlock";
import ImageBlock from "./ImageBlock";
import PagePeek from "./PagePeek";
import MediaUploadPlaceholder from "./MediaUploadPlaceholder";
import CodeBlock from "./CodeBlock";
import ChartBlock from "./ChartBlock";
import SimpleTable from "./SimpleTable";
import ColumnsBlock from "./ColumnsBlock";
import DatabaseBlock from "../DatabaseBlock";
import FormsBlock from "../FormsBlock";

function placeholderFor(type) {
  if (type === "code") return "Code";
  if (type === "block-equation" || type === "equation") return "E = mc^2";
  return "Press 'space' for AI or '/' for commands";
}

export default function renderBlockEditor(block, index, cls, ref, onPatch, onKeyDown, onDelete, pages, onFocus, onBlur, isLocked, isFocused, onNavigate, onOpenImagePicker, pageId, onToast, onCreateSubpage, apiKey, aiProvider, page, onBlocks, onPasteUrl) {
  const registryItem = BlockRegistry.find(r => r.type === block.type);
  if (registryItem?.category === "Embeds") {
    return <EmbedBlock block={block} onPatch={onPatch} onKeyDown={onKeyDown} onDelete={onDelete} />;
  }

  if (block.type === "page") {
    const linked = pages.find((p) => p.id === (block.linkedPageId || block.id));
    const previewPage = linked || pages.find((p) => p.id === block.linkedPageId);
    return (
      <PagePeek page={previewPage} pages={pages} onNavigate={onNavigate}>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            const targetId = linked?.id || block.linkedPageId;
            if (targetId && pages.find((p) => p.id === targetId)) {
              onNavigate?.(targetId, { altKey: e.altKey });
            } else if (onCreateSubpage) {
              const newId = onCreateSubpage(block.id, block.text || "");
              if (newId) onNavigate?.(newId, { altKey: e.altKey });
            }
          }}
          className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)]"
        >
          <span>{linked?.icon || "📄"}</span>
          <span>{linked?.title || block.text || "Untitled"}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--muted)]">Subpage</span>
        </button>
      </PagePeek>
    );
  }

  if (block.type === "link-to-page") {
    const target = pages.find((p) => p.id === block.targetPageId);
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
        <Link size={14} className="text-[var(--accent)] shrink-0" />
        {target ? (
          <PagePeek page={target} pages={pages} onNavigate={onNavigate}>
              <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => onNavigate?.(target.id, { altKey: e.altKey })} className="truncate font-medium text-[var(--accent)] hover:underline">
              {target.icon} {target.title || "Untitled"}
            </button>
          </PagePeek>
        ) : (
          <select
            disabled={isLocked}
            value={block.targetPageId || ""}
            onChange={(e) => onPatch({ targetPageId: e.target.value })}
            className="min-w-0 flex-1 bg-transparent outline-none text-[var(--secondary)]"
          >
            <option value="">Select a page to link…</option>
            {pages.filter((p) => !p.trashed).map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.title || "Untitled"}</option>
            ))}
          </select>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--muted)]">Link</span>
      </div>
    );
  }

  if (block.type === "mention") {
    const target = pages.find((p) => p.id === block.mentionPageId);
    return (
      <PagePeek page={target} pages={pages} onNavigate={onNavigate}>
        <div className="inline-flex items-center gap-1 rounded bg-[var(--accent)]/10 px-2 py-0.5 text-sm text-[var(--accent)]">
          <span>@</span>
          {target ? (
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => onNavigate?.(target.id, { altKey: e.altKey })} className="font-medium hover:underline">
              {target.title || "Untitled"}
            </button>
          ) : (
            <select
              disabled={isLocked}
              value={block.mentionPageId || ""}
              onChange={(e) => {
                const picked = pages.find((p) => p.id === e.target.value);
                onPatch({ mentionPageId: e.target.value, text: `@${picked?.title || "Untitled"}` });
              }}
              className="bg-transparent outline-none"
            >
              <option value="">Mention a page…</option>
              {pages.filter((p) => !p.trashed).map((p) => (
                <option key={p.id} value={p.id}>{p.title || "Untitled"}</option>
              ))}
            </select>
          )}
        </div>
      </PagePeek>
    );
  }

  if (block.type === "divider") return <hr className="my-4 border-[var(--border)]" />;
  if (block.type === "todo") {
    const checked = block.properties?.checked !== undefined ? block.properties.checked : !!block.checked;
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    return (
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={isLocked}
          onChange={(e) => onPatch({
            properties: { ...(block.properties || {}), checked: e.target.checked },
            checked: e.target.checked
          })}
          className="mt-1.5 h-4 w-4 accent-[var(--accent)] cursor-pointer"
        />
        <RichTextEditor
          richText={richText}
          onRichTextChange={(rt, pt) => onPatch({
            properties: { ...(block.properties || {}), richText: rt },
            text: pt
          })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          onPasteUrl={onPasteUrl}
          className={`${cls} ${checked ? "text-[var(--muted)] line-through" : ""}`}
          placeholder="To-do"
        />
      </label>
    );
  }
  if (block.type === "toggle") {
    const collapsed = block.properties?.collapsed !== undefined ? block.properties.collapsed : !block.open;
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    const childBlocks = (block.content || [])
      .map(id => page?.blocks?.find(b => b.id === id))
      .filter(Boolean);
    return (
      <div>
        <div className="flex items-start gap-1">
          <button
            className="mt-1.5 h-5 w-5 inline-grid place-items-center rounded text-[var(--secondary)] hover:bg-[var(--hover)] cursor-pointer shrink-0"
            onClick={() => onPatch({
              open: collapsed,
              properties: { ...(block.properties || {}), collapsed: !collapsed }
            })}
          >
            <motion.div
              animate={{ rotate: collapsed ? 0 : 90 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <ChevronRight size={14} />
            </motion.div>
          </button>
          <div className="flex-1 min-w-0">
            <RichTextEditor
              richText={richText}
              onRichTextChange={(rt, pt) => onPatch({
                properties: { ...(block.properties || {}), richText: rt },
                text: pt
              })}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              readOnly={isLocked}
              onPasteUrl={onPasteUrl}
              className={cls}
              placeholder="Toggle"
            />
            {!collapsed && childBlocks.length > 0 && (
              <div className="ml-6 mt-2 space-y-1">
                {childBlocks.map(child => (
                  <div key={child.id} className="text-xs text-[var(--muted)] border-l-2 border-[var(--border)] pl-3 py-1">
                    Nested block
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <ImageBlock
        block={block}
        onPatch={onPatch}
        onDelete={onDelete}
        isLocked={isLocked}
        pageId={pageId}
        pages={pages}
        onNavigate={onNavigate}
        onToast={onToast}
      />
    );
  }
  if (block.type === "code") {
    return <CodeBlock block={block} onPatch={onPatch} isLocked={isLocked} onDelete={onDelete} />;
  }
  if (block.type === "video") {
    const [videoWidth, setVideoWidth] = React.useState(block.videoWidth || null);
    const vidRef = React.useRef(null);
    const handleVidResize = (dir) => (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = vidRef.current?.offsetWidth || 600;
      const onMove = (ev) => {
        const delta = ev.clientX - startX;
        const newW = Math.max(200, Math.min(1200, startW + (dir === 'right' ? delta : -delta)));
        if (vidRef.current) vidRef.current.style.width = `${newW}px`;
        setVideoWidth(newW);
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (videoWidth) onPatch?.({ videoWidth });
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-[var(--border)] bg-black relative group/video">
        {block.text ? (
          <>
            <video
              ref={vidRef}
              controls
              className="max-h-[480px] object-contain bg-black"
              style={{ width: videoWidth ? `${videoWidth}px` : '100%' }}
              src={block.text}
              poster={block.poster}
            >
              Your browser does not support the video tag.
            </video>
            <div className="absolute inset-y-0 right-0 w-1.5 cursor-col-resize opacity-0 group-hover/video:opacity-60 transition"
                 onMouseDown={handleVidResize('right')} />
            <div className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize opacity-0 group-hover/video:opacity-60 transition"
                 onMouseDown={handleVidResize('corner')}>
              <GripHorizontal size={12} className="absolute -bottom-0.5 -right-0.5 text-white drop-shadow" />
            </div>
            {!isLocked && (
              <div className="absolute top-2 right-2 opacity-0 group-hover/video:opacity-100 transition flex gap-1">
                <input
                  type="text"
                  value={block.text}
                  onChange={(e) => onPatch({ text: e.target.value })}
                  className="w-48 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--text)] outline-none"
                  placeholder="Video URL..."
                />
                <button
                  onClick={onDelete}
                  className="rounded-md bg-[var(--danger)]/80 px-2 py-1 text-[10px] text-white hover:bg-[var(--danger)] transition"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        ) : (
          <MediaUploadPlaceholder
            type="video"
            onSelect={(url) => onPatch({ text: url })}
            onDelete={onDelete}
            isLocked={isLocked}
            accept="video/*"
          />
        )}
      </div>
    );
  }
  if (block.type === "audio") {
    return (
      <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 group/audio">
        {block.text ? (
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-lg shrink-0">
              🎵
            </div>
            <div className="min-w-0 flex-1">
              <audio controls className="w-full h-8" src={block.text}>
                Your browser does not support the audio tag.
              </audio>
              <div className="text-[10px] text-[var(--muted)] mt-1 truncate">{block.text}</div>
            </div>
            {!isLocked && (
              <button
                onClick={onDelete}
                className="text-[var(--muted)] hover:text-red-400 transition opacity-0 group-hover/audio:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ) : (
          <MediaUploadPlaceholder
            type="audio"
            onSelect={(url) => onPatch({ text: url })}
            onDelete={onDelete}
            isLocked={isLocked}
            accept="audio/*"
          />
        )}
      </div>
    );
  }
  if (block.type === "file") {
    const fileName = block.name || block.text?.split("/").pop() || "file";
    return (
      <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 group/file">
        {block.text ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-lg shrink-0">
              📎
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text)] truncate">{fileName}</div>
              <div className="text-[10px] text-[var(--muted)] truncate">{block.text}</div>
            </div>
            <a
              href={block.text}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition shrink-0"
            >
              Download
            </a>
            {!isLocked && (
              <button
                onClick={onDelete}
                className="text-[var(--muted)] hover:text-red-400 transition opacity-0 group-hover/file:opacity-100 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ) : (
          <MediaUploadPlaceholder
            type="file"
            onSelect={(url) => onPatch({ text: url })}
            onDelete={onDelete}
            isLocked={isLocked}
            accept="*/*"
            fileName={true}
          />
        )}
      </div>
    );
  }
  if (block.type === "bookmark") {
    const url = block.text || block.url || "";
    return (
      <div className="my-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden group/bookmark">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 p-4 hover:bg-[var(--hover)] transition"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-lg shrink-0">
              <Globe size={18} className="text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--text)] truncate">{block.title || url}</div>
              <div className="text-[10px] text-[var(--muted)] truncate">{url}</div>
            </div>
            <ExternalLink size={14} className="text-[var(--muted)] shrink-0" />
          </a>
        ) : (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--text)]">Web Bookmark</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={block.text || ""}
                onChange={(e) => onPatch({ text: e.target.value, url: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                placeholder="Paste any URL..."
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
                disabled={isLocked}
              />
              {!isLocked && (
                <button onClick={onDelete} className="text-[var(--muted)] hover:text-red-400 transition">
                  <Trash2 size={13} />
                </button>
          )}
          </div>
        </div>
        )}
      </div>
    );
  }
  if (block.type === "table") return <SimpleTable block={block} onPatch={onPatch} isLocked={isLocked} />;
  if (block.type === "columns" || block.type.endsWith("-columns")) return <ColumnsBlock block={block} onPatch={onPatch} isLocked={isLocked} />;
  if (block.type === "database" || block.type === "database-inline" || block.type === "database-full") return <DatabaseBlock block={block} onPatch={onPatch} isLocked={isLocked} apiKey={apiKey} aiProvider={aiProvider} page={page} />;
  
  if (block.type === "callout") {
    return <CalloutBlock block={block} cls={cls} isLocked={isLocked} onPatch={onPatch} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} onPasteUrl={onPasteUrl} />;
  }
  if (block.type === "bullet") {
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    return (
      <div className="flex gap-2">
        <span className="pt-1.5 text-[var(--secondary)]">•</span>
        <RichTextEditor
          as="div"
          richText={richText}
          onRichTextChange={(rt, pt) => onPatch({
            properties: { ...(block.properties || {}), richText: rt },
            text: pt
          })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          onPasteUrl={onPasteUrl}
          placeholder="List item"
        />
      </div>
    );
  }
  if (block.type === "number") {
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    return (
      <div className="flex gap-2">
        <span className="pt-1.5 text-[var(--secondary)]">{index + 1}.</span>
        <RichTextEditor
          as="div"
          richText={richText}
          onRichTextChange={(rt, pt) => onPatch({
            properties: { ...(block.properties || {}), richText: rt },
            text: pt
          })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          placeholder="List item"
        />
      </div>
    );
  }

  if (block.type === "table-of-contents") {
    const owningPage = pages.find(p => p.blocks?.some(b => b.id === block.id));
    const headings = (owningPage?.blocks || []).filter(b => ["h1", "h2", "h3", "h4"].includes(b.type)) || [];
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">Table of Contents</div>
        {headings.length === 0 ? (
          <div className="text-xs text-[var(--muted)]">Add headings to view table of contents</div>
        ) : (
          <div className="space-y-1.5 text-xs text-[var(--accent)] font-medium">
            {headings.map(h => (
              <div
                key={h.id}
                style={{ paddingLeft: h.type === "h2" ? 12 : h.type === "h3" ? 24 : h.type === "h4" ? 36 : 0 }}
                className="hover:underline cursor-pointer truncate"
              >
                {h.text || "Untitled Section"}
              </div>
            ))}
              </div>
            )}
        </div>
    );
  }

  if (block.type === "tabs") {
    const rawTabs = block.tabs || ["Tab 1", "Tab 2", "Tab 3"];
    const tabs = rawTabs.map(t => typeof t === 'string' ? t : t?.title || 'Tab');
    const activeTabIdx = block.activeTabIdx || 0;
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="flex bg-[var(--surface)] border-b border-[var(--border)]">
          {tabs.map((tabLabel, idx) => (
            <button
              key={idx}
              onClick={() => onPatch({ activeTabIdx: idx })}
              className={`px-4 py-2 text-xs font-semibold border-r border-[var(--border)] transition cursor-pointer ${
                activeTabIdx === idx ? "bg-[var(--hover)] text-[var(--accent)]" : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              {tabLabel}
            </button>
          ))}
        </div>
        <div className="p-4 text-xs text-[var(--text)]">
          <TextArea
            value={block[`tabContent_${activeTabIdx}`] || ""}
            onChange={(val) => onPatch({ [`tabContent_${activeTabIdx}`]: val })}
            readOnly={isLocked}
            onPasteUrl={onPasteUrl}
            placeholder="List item"
          />
        </div>
      </div>
    );
  }

  if (block.type.includes("chart")) {
    return <ChartBlock block={block} onPatch={onPatch} isLocked={isLocked} />;
  }

  if (block.type === "button") {
    const isTemplate = Array.isArray(block.templateBlocks) && block.templateBlocks.length > 0;
    return (
      <div className="my-2">
        <button
          disabled={isLocked}
          onClick={() => {
            if (!isTemplate || isLocked || !page?.blocks) return;
            const clones = block.templateBlocks.map(t => ({
              ...JSON.parse(JSON.stringify(t)),
              id: crypto.randomUUID()
            }));
            const idx = page.blocks.findIndex(b => b.id === block.id);
            if (idx < 0) return;
            const newBlocks = [...page.blocks];
            newBlocks.splice(idx + 1, 0, ...clones);
            onBlocks(newBlocks);
          }}
          className={`rounded-lg px-4 py-2 text-xs font-semibold shadow-md active:scale-95 transition cursor-pointer ${
            isTemplate
              ? "bg-[var(--success)] hover:bg-[var(--success)]/80 text-white"
              : "bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"
          }`}
        >
          {isTemplate ? "▶ " : ""}{block.text || (isTemplate ? "Template button" : "Interactive Button")}
        </button>
        {isTemplate && (
          <span className="ml-2 text-[10px] text-[var(--muted)]">
            {block.templateBlocks.length} block{block.templateBlocks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  if (block.type === "breadcrumb") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium bg-[var(--surface)] py-1.5 px-3 rounded-lg border border-[var(--border)]">
        <span>Workspace</span>
        <span>/</span>
        <span className="text-[var(--secondary)]">{pages[0]?.title || "My Page"}</span>
        <span>/</span>
        <span className="text-[var(--text)] font-semibold">{block.text || "Current Block"}</span>
      </div>
    );
  }

  if (block.type === "form") {
    return <FormsBlock block={block} onPatch={onPatch} isLocked={isLocked} />;
  }

  if (block.type === "synced-block") {
    return (
      <div className="my-2 rounded-lg border border-[var(--noska-blue)]/30 bg-[var(--noska-blue-soft)]">
        <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--noska-blue)] border-b border-[var(--noska-blue)]/20">
          <span>⟳</span>
          <span>Synced block</span>
          <span className="ml-auto text-[9px] text-[var(--muted)] font-normal normal-case">
            {block.syncedGroupId?.slice(0, 8)}
          </span>
        </div>
        <div className="p-2">
          <TextArea
            ref={ref}
            value={block.text}
            onChange={(text) => onPatch({ text })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={isLocked}
            className="text-[14.5px] leading-relaxed text-[var(--text)]/90 block w-full"
            placeholder="Edit synced block content..."
          />
        </div>
      </div>
    );
  }

  if (block.type === "block-equation") {
    const html = block.text ? katex.renderToString(block.text, { throwOnError: false, displayMode: true }) : "";
    return (
      <div className={cls}>
        {isFocused || !block.text ? (
          <RichTextEditor
            value={block.text}
            onChange={(text) => onPatch({ text })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={isLocked}
            onPasteUrl={onPasteUrl}
            className="font-mono text-center text-md my-4 block w-full"
            placeholder="E = mc^2"
          />
        ) : (
          <div
            className="py-2 cursor-text select-none"
            onMouseDown={(e) => {
              e.preventDefault();
              ref.current?.focus();
              onFocus();
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    );
  }

  if (block.type === "toggle-h1" || block.type === "toggle-h2" || block.type === "toggle-h3") {
    const sizeCls = block.type === "toggle-h1" ? "text-[22px] font-bold" : block.type === "toggle-h2" ? "text-[18px] font-semibold" : "text-[15px] font-semibold";
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    return (
      <div className="flex items-start gap-1">
        <button
          onClick={() => onPatch({ open: !block.open })}
          className={`mt-1 shrink-0 transition cursor-pointer ${block.open ? "rotate-90" : ""}`}
        >
          <ChevronRight size={14} />
        </button>
        <div className="flex-1">
          <RichTextEditor
            richText={richText}
            onRichTextChange={(rt, pt) => onPatch({
              properties: { ...(block.properties || {}), richText: rt },
              text: pt
            })}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            readOnly={isLocked}
            onPasteUrl={onPasteUrl}
            className={`${cls} ${sizeCls}`}
            placeholder="Toggle heading..."
          />
          {block.open && block.content && block.content.length > 0 && (
            <div className="ml-4 mt-1 space-y-1">
              {block.content.map(id => (
                <div key={id} className="text-xs text-[var(--muted)]">Nested block</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "mermaid") {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          <span>Diagram</span>
        </div>
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          className="font-mono text-xs"
          placeholder="graph TD; A-->B;"
        />
        {block.text && (
          <div className="mt-2 p-3 bg-[var(--callout)] rounded text-xs text-[var(--muted)] text-center">
            Mermaid diagram: {block.text.slice(0, 60)}...
          </div>
        )}
      </div>
    );
  }

  if (block.type === "ai-block") {
    return (
      <div className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--accent)]">AI Block</span>
        </div>
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          placeholder="Ask AI to generate content..."
        />
      </div>
    );
  }

  if (block.type === "ai-meeting") {
    return (
      <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/5 px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={14} className="text-[var(--success)]" />
          <span className="text-xs font-semibold text-[var(--success)]">Meeting Notes</span>
        </div>
        <TextArea
          ref={ref}
          value={block.text}
          onChange={(text) => onPatch({ text })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          placeholder="Meeting notes..."
        />
      </div>
    );
  }

  const hasMarkers = block.text && /\*\*|\*(?!\*)|\`|~~|<u>|<\/u>|\$\$/.test(block.text);
  const showFormatted = !isFocused && hasMarkers && !isLocked;

  if (block.type === "text") {
    const richText = block.properties?.richText != null 
      ? block.properties.richText 
      : markdownToRichText(block.text || '');
    return (
      <RichTextEditor
        richText={richText}
        onRichTextChange={(rt, pt) => onPatch({
          properties: { ...(block.properties || {}), richText: rt },
          text: pt
        })}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={isLocked}
        onPasteUrl={onPasteUrl}
        className={cls}
        placeholder={placeholderFor(block.type)}
      />
    );
  }

  if (block.type === "quote") {
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    return (
      <div className="border-l-[3px] border-[var(--accent)] pl-4 py-2 my-2 rounded-r-lg bg-[var(--callout)]">
        <RichTextEditor
          richText={richText}
          onRichTextChange={(rt, pt) => onPatch({
            properties: { ...(block.properties || {}), richText: rt },
            text: pt
          })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          onPasteUrl={onPasteUrl}
          className={`${cls} italic text-[var(--text-secondary)]`}
          placeholder={"Quote"}
        />
      </div>
    );
  }

  if (["h1", "h2", "h3", "h4"].includes(block.type)) {
    const richText = block.properties?.richText != null
      ? block.properties.richText
      : markdownToRichText(block.text || '');
    const headingTag = block.type;
    return (
      <RichTextEditor
        as={headingTag}
        richText={richText}
        onRichTextChange={(rt, pt) => onPatch({
          properties: { ...(block.properties || {}), richText: rt },
          text: pt
        })}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={isLocked}
        onPasteUrl={onPasteUrl}
        className={cls}
        placeholder={placeholderFor(block.type)}
      />
    );
  }

  return (
    <div className="relative">
      <TextArea
        ref={ref}
        value={block.text}
        onChange={(text) => onPatch({ text })}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        readOnly={isLocked}
        className={`${cls} ${showFormatted ? 'opacity-0' : ''}`}
        style={{
          ...(block.color && block.color !== 'default' ? { color: block.color } : {}),
          ...(block.bgColor ? { backgroundColor: block.bgColor } : {})
        }}
        placeholder={placeholderFor(block.type)}
      />
      {showFormatted && (
        <div
          className="absolute inset-0 cursor-text"
          style={{
            ...(block.bgColor ? { backgroundColor: block.bgColor } : {})
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            ref.current?.focus();
            onFocus();
          }}
        >
          <div
            className={cls}
            style={{
              ...(block.color && block.color !== 'default' ? { color: block.color } : {}),
              ...(block.bgColor ? { backgroundColor: block.bgColor } : {})
            }}
            dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(block.text) }}
          />
        </div>
      )}
    </div>
  );
}

function CalloutBlock({ block, cls, isLocked, onPatch, onKeyDown, onFocus, onBlur, onPasteUrl }) {
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const emojiRef = React.useRef(null);
  React.useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [emojiOpen]);
  const calloutIcon = typeof block.properties?.icon === 'string' ? block.properties.icon : typeof block.meta?.icon === 'string' ? block.meta.icon : "💡";
  const calloutTone = block.properties?.tone || block.properties?.color || "info";
  const toneBg = {
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
    red: "bg-[#f8eeee] dark:bg-[#2a0f0f]",
  }[calloutTone] || "bg-[var(--callout)]";
  const richText = block.properties?.richText != null
    ? block.properties.richText
    : markdownToRichText(block.text || '');
  return (
    <div className={`${cls} rounded-lg border border-[var(--border)] ${toneBg} px-4 py-3 my-2`}>
      <div className="flex gap-3">
        <div className="relative shrink-0" ref={emojiRef}>
          <button
            disabled={isLocked}
            className="text-lg leading-none pt-0.5 hover:bg-[var(--hover)] rounded px-0.5 transition cursor-pointer"
            onClick={() => setEmojiOpen(!emojiOpen)}
          >
            {calloutIcon}
          </button>
          {emojiOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-[208px] bg-[var(--elevated)] border border-[var(--border)] rounded-lg shadow-xl grid grid-cols-8 gap-0.5 p-1.5 max-h-[160px] overflow-y-auto">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  className="flex items-center justify-center w-6 h-6 rounded text-sm hover:bg-[var(--hover)] transition"
                  onClick={() => { onPatch({ properties: { ...(block.properties || {}), icon: emoji }, meta: { ...(block.meta || {}), icon: emoji } }); setEmojiOpen(false); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <RichTextEditor
          richText={richText}
          onRichTextChange={(rt, pt) => onPatch({
            properties: { ...(block.properties || {}), richText: rt },
            text: pt
          })}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          readOnly={isLocked}
          onPasteUrl={onPasteUrl}
          placeholder="Callout"
        />
      </div>
    </div>
  );
}
