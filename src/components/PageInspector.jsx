import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Info, Link2, Activity, Users, History, Shield, Brain,
  Clock, FileText, BookOpen, BarChart3, Tag, Star,
  RotateCcw, Sparkles, Hash, Target, GitBranch,
  AlertCircle, CheckCircle, XCircle, Loader2, Diff,
  Image, Code, Table2, CheckSquare, Type, List, FileJson,
  Globe, User, FolderTree, Layers, Settings,
} from 'lucide-react';
import { timeAgo, plainText } from '../utils/helpers';
import { getAllRelations } from '../utils/pageLinks';
import { auditEngine } from '../lib/auditEngine';

const TABS = [
  { id: 'overview', icon: Info, label: 'Overview' },
  { id: 'stats', icon: BarChart3, label: 'Stats' },
  { id: 'details', icon: FileJson, label: 'Details' },
  { id: 'properties', icon: Settings, label: 'Properties' },
  { id: 'relationships', icon: Link2, label: 'Relationships' },
  { id: 'activity', icon: Activity, label: 'Activity' },
  { id: 'collaboration', icon: Users, label: 'Collaboration' },
  { id: 'versions', icon: History, label: 'Versions' },
  { id: 'audit', icon: Shield, label: 'Audit' },
  { id: 'ai', icon: Brain, label: 'AI' },
];

function TabBar({ activeTab, onTabChange }) {
  return (
    <div className="flex flex-wrap gap-0.5 px-2 pt-2 pb-1 border-b border-[var(--border)]">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
            activeTab === tab.id
              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          }`}
          aria-label={tab.label}
        >
          <tab.icon size={11} />
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1 text-[11px]">
      <span className="flex items-center gap-1.5 text-[var(--muted)]">
        <Icon size={11} />
        {label}
      </span>
      <span className="font-medium text-[var(--text)]">{value}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon size={24} className="text-[var(--muted)] mb-2 opacity-40" />
      <p className="text-[10px] text-[var(--muted)] italic">{message}</p>
    </div>
  );
}

function computePageStats(page) {
  if (!page) return {};
  const blocks = page.blocks || [];
  const text = plainText(page);
  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;
  const headings = blocks.filter(b => /^h[123]$/.test(b.type)).length;
  const readingTime = Math.max(1, Math.ceil(words / 220));
  const images = blocks.filter(b => b.type === 'image').length;
  const codeBlocks = blocks.filter(b => b.type === 'code').length;
  const tables = blocks.filter(b => b.type === 'table').length;
  const todos = blocks.filter(b => b.type === 'todo');
  const checkedTodos = todos.filter(b => b.checked).length;
  return { words, chars, paragraphs, headings, readingTime, images, codeBlocks, tables, todos: todos.length, checkedTodos };
}

function computeKnowledgeScore(page, pages, relations, versionsCount, auditCount, aiEvents, stats) {
  if (!page) return { score: 0, metrics: [] };
  let total = 0;
  const metrics = [];
  const blocks = page.blocks || [];

  const wordCount = stats?.words || plainText(page).split(/\s+/).filter(Boolean).length;
  metrics.push({ label: `Content (${wordCount} words)`, pass: wordCount > 50, weight: 18, detail: wordCount > 50 ? `${wordCount} words > 50 min` : `Only ${wordCount} words` });
  if (wordCount > 50) total += 18;

  const hCount = (blocks.filter(b => /^h[123]$/.test(b.type)).length);
  metrics.push({ label: `Headings (${hCount})`, pass: hCount >= 2, weight: 8, detail: hCount >= 2 ? `${hCount} headings >= 2` : `${hCount} headings` });
  if (hCount >= 2) total += 8;

  const backlinkCount = relations?.backlinks?.length || 0;
  const outgoingCount = relations?.outgoing?.length || 0;
  const connections = backlinkCount + outgoingCount;
  metrics.push({ label: `Connections (${connections})`, pass: connections > 0, weight: 12, detail: `${backlinkCount} backlinks, ${outgoingCount} outgoing` });
  if (connections > 0) total += 12;

  const tagCount = (page.tags || []).length;
  metrics.push({ label: `Tags (${tagCount})`, pass: tagCount > 0, weight: 6, detail: tagCount > 0 ? `${tagCount} tags set` : 'No tags' });
  if (tagCount > 0) total += 6;

  const hasProperties = page.status || page.priority || page.isEncrypted;
  metrics.push({ label: 'Properties set', pass: !!hasProperties, weight: 4, detail: hasProperties ? `${page.status || ''} ${page.priority || ''}`.trim() || 'Encrypted' : 'No properties' });
  if (hasProperties) total += 4;

  metrics.push({ label: `History (${(page.lineage || []).length} events)`, pass: (page.lineage || []).length > 0, weight: 4, detail: `${(page.lineage || []).length} lineage entries` });
  if ((page.lineage || []).length > 0) total += 4;

  metrics.push({ label: `Versions (${versionsCount})`, pass: versionsCount > 0, weight: 10, detail: versionsCount > 0 ? `${versionsCount} saved versions` : 'No versions saved' });
  if (versionsCount > 0) total += 10;

  const hasAI = (aiEvents || []).length > 0;
  metrics.push({ label: `AI Activity (${(aiEvents || []).length})`, pass: hasAI, weight: 6, detail: hasAI ? `${aiEvents.length} AI interactions` : 'No AI interactions' });
  if (hasAI) total += 6;

  metrics.push({ label: `Audit (${auditCount} events)`, pass: auditCount > 0, weight: 4, detail: auditCount > 0 ? `${auditCount} audit events` : 'No audit events' });
  if (auditCount > 0) total += 4;

  const isCompleted = page.status === 'completed';
  metrics.push({ label: 'Completed', pass: isCompleted, weight: 6, detail: isCompleted ? 'Marked complete' : 'Not completed' });
  if (isCompleted) total += 6;

  const iconCount = (blocks.filter(b => b.type === 'image').length);
  metrics.push({ label: `Media (${iconCount} images)`, pass: iconCount > 0, weight: 4, detail: iconCount > 0 ? `${iconCount} images` : 'No images' });
  if (iconCount > 0) total += 4;

  const childCount = pages ? pages.filter(p => p.parentId === page.id).length : 0;
  metrics.push({ label: `Children (${childCount})`, pass: childCount > 0, weight: 4, detail: childCount > 0 ? `${childCount} child pages` : 'No children' });
  if (childCount > 0) total += 4;

  const hasIcon = page.icon && page.icon !== '📝';
  metrics.push({ label: 'Custom icon', pass: hasIcon, weight: 2, detail: hasIcon ? page.icon : 'Default icon' });
  if (hasIcon) total += 2;

  const hasCover = page.cover && page.cover !== 'linear-gradient(135deg,#0f7b6c,#2dd4bf,#f4d35e)';
  metrics.push({ label: 'Custom cover', pass: hasCover, weight: 2, detail: hasCover ? 'Set' : 'Default cover' });
  if (hasCover) total += 2;

  return { score: Math.min(100, total), metrics };
}

function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center justify-between px-1 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
      <span className="flex items-center gap-1.5">
        <Icon size={12} />
        {label}
      </span>
      {count !== undefined && <span className="text-[9px]">{count}</span>}
    </div>
  );
}

function OverviewTab({ page, pages, relations, versionsCount, auditCount, aiEvents, knowledge }) {
  const stats = useMemo(() => computePageStats(page), [page]);

  if (!page) return null;

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{page.icon || '📄'}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate text-[var(--text)]">{page.title || 'Untitled'}</div>
          <div className="text-[10px] text-[var(--muted)]">
            Created {page.createdAt ? timeAgo(page.createdAt) : 'Not available'} ·
            Updated {page.updatedAt ? timeAgo(page.updatedAt) : 'Not available'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)] mb-1">
            <BookOpen size={10} /> Knowledge Score
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="var(--border)" strokeWidth="3" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent)" strokeWidth="3"
                  strokeDasharray={`${(knowledge.score / 100) * 82} 82`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-[var(--text)]">{knowledge.score}</span>
            </div>
            <div className="text-[9px] text-[var(--muted)] leading-tight">
              {knowledge.score >= 80 ? 'Excellent' : knowledge.score >= 60 ? 'Good' : knowledge.score >= 40 ? 'Needs work' : 'Minimal'}
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)] mb-1">
            <BarChart3 size={10} /> Stats
          </div>
          {stats.words !== undefined ? (
            <>
              <div className="text-[11px] font-medium text-[var(--text)]">{stats.words} words</div>
              <div className="text-[9px] text-[var(--muted)]">{stats.chars} chars · {stats.blocks} blocks · {stats.readingTime} min read</div>
            </>
          ) : (
            <div className="text-[10px] text-[var(--muted)] italic">No data yet</div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={FileText} label="Details" />
        <StatRow icon={Hash} label="ID" value={page.id ? page.id.slice(0, 8) + '…' : 'Not available'} />
        <StatRow icon={BookOpen} label="Blocks" value={stats.blocks !== undefined ? stats.blocks : 'Not available'} />
        <StatRow icon={BarChart3} label="Words" value={stats.words !== undefined ? stats.words : 'Not available'} />
        <StatRow icon={Type} label="Headings" value={stats.headings !== undefined ? stats.headings : 'Not available'} />
        <StatRow icon={Clock} label="Created" value={page.createdAt ? timeAgo(page.createdAt) : 'Not available'} />
        <StatRow icon={Clock} label="Updated" value={page.updatedAt ? timeAgo(page.updatedAt) : 'Not available'} />
        <StatRow icon={Link2} label="Backlinks" value={relations?.backlinks?.length ?? 'Not available'} />
        <StatRow icon={Link2} label="Outgoing" value={relations?.outgoing?.length ?? 'Not available'} />
        <StatRow icon={History} label="Versions" value={versionsCount ?? 'Not available'} />
        <StatRow icon={Shield} label="Audit events" value={auditCount ?? 'Not available'} />
        <StatRow icon={Star} label={page.favorite ? 'Favorited' : 'Not favorited'} value={''} />
        <StatRow icon={FolderTree} label="Children" value={pages ? pages.filter(p => p.parentId === page.id).length : 'Not available'} />
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Target} label="Knowledge Score Breakdown" />
        <div className="space-y-1 mt-1">
          {knowledge.metrics.map(m => (
            <div key={m.label} className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1 text-[var(--muted)]" title={m.detail}>
                {m.pass ? <CheckCircle size={9} className="text-[var(--accent)] shrink-0" /> : <XCircle size={9} className="text-[var(--secondary)] shrink-0" />}
                <span className="truncate">{m.label}</span>
              </span>
              <span className="text-[var(--text)] shrink-0 ml-1">+{m.weight}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border)] text-[10px] font-bold">
          <span className="text-[var(--muted)]">Total</span>
          <span className="text-[var(--accent)]">{knowledge.score}/100</span>
        </div>
      </div>
    </div>
  );
}

function StatsTab({ page }) {
  const stats = useMemo(() => computePageStats(page), [page]);

  if (!page) return <EmptyState icon={BarChart3} message="No page data" />;

  const hasData = stats.words !== undefined;

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={BarChart3} label="Content" />
        {!hasData ? (
          <EmptyState icon={BarChart3} message="No data yet" />
        ) : (
          <>
            <StatRow icon={FileText} label="Words" value={stats.words} />
            <StatRow icon={Type} label="Characters" value={stats.chars} />
            <StatRow icon={BookOpen} label="Blocks" value={(page.blocks || []).length} />
            <StatRow icon={List} label="Paragraphs" value={stats.paragraphs} />
            <StatRow icon={Hash} label="Headings" value={stats.headings} />
            <StatRow icon={Clock} label="Reading time" value={`${stats.readingTime} min`} />
          </>
        )}
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={Layers} label="Media & Blocks" />
        {!hasData ? (
          <EmptyState icon={Layers} message="No data yet" />
        ) : (
          <>
            <StatRow icon={Image} label="Images" value={stats.images || '0'} />
            <StatRow icon={Code} label="Code blocks" value={stats.codeBlocks || '0'} />
            <StatRow icon={Table2} label="Tables" value={stats.tables || '0'} />
            <StatRow icon={CheckSquare} label="Checklists" value={stats.todos ? `${stats.checkedTodos}/${stats.todos}` : '0'} />
          </>
        )}
      </div>
    </div>
  );
}

function DetailsTab({ page, pages }) {
  if (!page) return <EmptyState icon={FileJson} message="No page data" />;

  const parent = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const children = pages.filter(p => p.parentId === page.id);
  const ownerFromLineage = (page.lineage || []).find(e => e.userName);
  const editorCount = new Set((page.lineage || []).filter(e => e.userName).map(e => e.userName)).size;

  const pageType = (() => {
    const tags = (page.tags || []).map(t => t.toLowerCase());
    if (tags.includes('meeting') || tags.includes('meeting-notes')) return 'Meeting Notes';
    if (tags.includes('project') || tags.includes('project-plan')) return 'Project';
    if (tags.includes('journal') || tags.includes('diary')) return 'Journal';
    if (tags.includes('notes') || tags.includes('documentation')) return 'Documentation';
    if (page.blocks?.some(b => b.type === 'database')) return 'Database';
    if (page.blocks?.some(b => b.type === 'table')) return 'Table';
    if (page.blocks?.every(b => b.type === 'todo')) return 'Checklist';
    if (page.blocks?.length === 0 || !page.blocks) return 'Empty';
    return 'Document';
  })();

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={FileJson} label="Identity" />
        <StatRow icon={Hash} label="UUID" value={page.id || 'Not available'} />
        <StatRow icon={Tag} label="Page type" value={pageType} />
        <StatRow icon={Globe} label="Visibility" value={page.isEncrypted ? 'Encrypted' : page.status === 'archived' ? 'Archived' : 'Visible'} />
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={Clock} label="Timestamps" />
        <StatRow icon={Clock} label="Created at" value={page.createdAt ? new Date(page.createdAt).toLocaleString() : 'Not available'} />
        <StatRow icon={Clock} label="Updated at" value={page.updatedAt ? new Date(page.updatedAt).toLocaleString() : 'Not available'} />
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={User} label="Ownership" />
        <StatRow icon={User} label="Owner" value={ownerFromLineage?.userName || page.createdBy || 'Not indexed'} />
        <StatRow icon={Users} label="Editors" value={editorCount > 0 ? editorCount : 'None'} />
        <StatRow icon={Hash} label="Workspace" value="Default" />
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-0.5">
        <SectionHeader icon={GitBranch} label="Hierarchy" />
        <StatRow icon={FolderTree} label="Parent" value={parent ? `${parent.icon || '📄'} ${parent.title}` : 'No parent (root level)'} />
        <StatRow icon={FolderTree} label="Children" value={children.length > 0 ? children.length : 'No child pages'} />
      </div>
    </div>
  );
}

function PropertiesTab({ page, pages, onPatchPage }) {
  if (!page) return null;
  const parent = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const children = pages.filter(p => p.parentId === page.id);

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-2">
        <SectionHeader icon={Tag} label="Metadata" />
        <div className="space-y-1.5">
          <div>
            <label className="text-[9px] text-[var(--muted)] block mb-0.5">Status</label>
            <select
              value={page.status || 'draft'}
              onChange={e => onPatchPage?.({ status: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] outline-none"
            >
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[var(--muted)] block mb-0.5">Priority</label>
            <select
              value={page.priority || 'medium'}
              onChange={e => onPatchPage?.({ priority: e.target.value })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[var(--muted)] block mb-0.5">Tags</label>
            <input
              value={(page.tags || []).join(', ')}
              onChange={e => onPatchPage?.({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded px-2 py-1 text-[11px] text-[var(--text)] outline-none"
              placeholder="Comma-separated"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)] space-y-2">
        <SectionHeader icon={GitBranch} label="Hierarchy" />
        <div>
          <div className="text-[9px] text-[var(--muted)] mb-0.5">Parent</div>
          <div className="text-[11px] text-[var(--text)]">
            {parent ? (
              <button className="hover:text-[var(--accent)] transition-colors">{parent.icon} {parent.title}</button>
            ) : <span className="text-[var(--muted)] italic">Root level</span>}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-[var(--muted)] mb-0.5">Children ({children.length})</div>
          <div className="space-y-0.5">
            {children.length === 0 && <div className="text-[10px] text-[var(--muted)] italic">No child pages</div>}
            {children.map(child => (
              <div key={child.id} className="text-[11px] flex items-center gap-1 text-[var(--text)]">
                <span>{child.icon}</span>
                <span className="truncate">{child.title || 'Untitled'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RelationshipsTab({ page, pages }) {
  const relations = useMemo(() => page ? getAllRelations(page.id, pages) : { backlinks: [], outgoing: [] }, [page, pages]);

  if (!page) return <EmptyState icon={Link2} message="No page data" />;

  const parent = page.parentId ? pages.find(p => p.id === page.parentId) : null;
  const children = pages.filter(p => p.parentId === page.id);
  const tagRelated = pages.filter(p => p.id !== page.id && p.tags?.some(t => page.tags?.includes(t)));
  const siblings = parent ? pages.filter(p => p.parentId === parent.id && p.id !== page.id) : [];

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Link2} label={`Backlinks (${relations.backlinks.length})`} />
        <div className="space-y-1 mt-1">
          {relations.backlinks.length === 0 && (
            <EmptyState icon={Link2} message="No backlinks yet" />
          )}
          {relations.backlinks.map(link => (
            <button key={link.pageId} className="flex items-center gap-1.5 w-full text-left p-1.5 rounded hover:bg-[var(--hover)] text-[11px] text-[var(--text)] transition-colors">
              <span>{link.icon || '📄'}</span>
              <span className="truncate">{link.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Link2} label={`Outgoing Links (${relations.outgoing.length})`} />
        <div className="space-y-1 mt-1">
          {relations.outgoing.length === 0 && (
            <EmptyState icon={Link2} message="No outgoing links" />
          )}
          {relations.outgoing.map(link => (
            <button key={link.pageId} className="flex items-center gap-1.5 w-full text-left p-1.5 rounded hover:bg-[var(--hover)] text-[11px] text-[var(--text)] transition-colors">
              <span>{link.icon || '🔗'}</span>
              <span className="truncate">{link.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={GitBranch} label={`Hierarchy`} />
        <div className="space-y-1 mt-1">
          <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
            <span>Parent:</span>
            <span className="text-[var(--text)]">{parent ? `${parent.icon || '📄'} ${parent.title}` : 'No parent (root level)'}</span>
          </div>
          <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
            <span>Children:</span>
            <span className="text-[var(--text)]">{children.length > 0 ? `${children.length} child pages` : 'No child pages'}</span>
          </div>
          {siblings.length > 0 && (
            <div className="text-[10px] text-[var(--muted)] flex items-center gap-1">
              <span>Siblings:</span>
              <span className="text-[var(--text)]">{siblings.length} sibling pages</span>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Star} label={`Related by Tags (${tagRelated.length})`} />
        <div className="space-y-1 mt-1">
          {tagRelated.length === 0 && (
            <EmptyState icon={Star} message="No related pages by tag" />
          )}
          {tagRelated.slice(0, 8).map(p => (
            <button key={p.id} className="flex items-center gap-1.5 w-full text-left p-1.5 rounded hover:bg-[var(--hover)] text-[11px] text-[var(--text)] transition-colors">
              <span>{p.icon || '📄'}</span>
              <span className="truncate">{p.title || 'Untitled'}</span>
            </button>
          ))}
          {tagRelated.length > 8 && (
            <div className="text-[9px] text-[var(--muted)] italic px-1">+{tagRelated.length - 8} more</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ page, pageId }) {
  const [auditActivities, setAuditActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    auditEngine.getPageAudit(pageId, { limit: 50 }).then(data => {
      setAuditActivities(data || []);
      setLoading(false);
    }).catch(() => {
      setAuditActivities([]);
      setLoading(false);
    });
  }, [pageId]);

  const merged = useMemo(() => {
    const lineage = (page?.lineage || []).map(e => ({
      id: e.timestamp + '-lineage-' + (page.lineage.indexOf(e)),
      type: 'lineage',
      detail: e.detail || e.action,
      timestamp: e.timestamp,
      userName: e.userName || 'System',
    }));
    const audit = (auditActivities || []).map(e => ({
      id: e.id,
      type: 'audit',
      detail: e.detail || e.action,
      timestamp: e.created_at,
      userName: e.user_name || 'System',
      action: e.action,
    }));
    const all = [...lineage, ...audit];
    all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return all.slice(0, 50);
  }, [page, auditActivities]);

  if (!page) return <EmptyState icon={Activity} message="No page data" />;

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Activity} label={`Recent Activity (${merged.length})`} />
        <div className="space-y-1.5 mt-1 max-h-80 overflow-y-auto scrollbar-thin">
          {loading && <div className="text-[10px] text-[var(--muted)] italic py-2">Loading activity...</div>}
          {!loading && merged.length === 0 && (
            <EmptyState icon={Activity} message="No activity recorded yet" />
          )}
          {merged.map((entry, i) => (
            <div key={entry.id || i} className="flex gap-2 text-[10px]">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${
                entry.type === 'audit' ? 'bg-[var(--accent)]' : 'bg-[var(--muted)]'
              }`} />
              <div className="min-w-0 flex-1">
                <div className="text-[var(--text)] font-medium truncate">
                  {entry.detail || entry.action || 'Unknown action'}
                </div>
                <div className="text-[8px] text-[var(--muted)]">
                  {entry.userName} · {entry.timestamp ? timeAgo(entry.timestamp) : 'Unknown time'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollaborationTab({ pageId, page }) {
  const [presence, setPresence] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  useEffect(() => {
    if (!pageId) return;
    const unsubSync = window.realtimeCollab?.on?.('presence:sync', ({ pageId: pid, users }) => {
      if (pid === pageId) setPresence(users || []);
    });
    const unsubJoin = window.realtimeCollab?.on?.('presence:join', ({ pageId: pid, user }) => {
      if (pid === pageId) setPresence(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    });
    const unsubLeave = window.realtimeCollab?.on?.('presence:leave', ({ pageId: pid, userId }) => {
      if (pid === pageId) setPresence(prev => prev.filter(u => u.id !== userId));
    });
    return () => {
      unsubSync?.();
      unsubJoin?.();
      unsubLeave?.();
    };
  }, [pageId]);

  useEffect(() => {
    if (!pageId) return;
    setLoadingPerms(true);
    auditEngine.getPermissions(pageId).then(data => {
      setPermissions(data || []);
      setLoadingPerms(false);
    }).catch(() => setLoadingPerms(false));
  }, [pageId]);

  const lastEditor = useMemo(() => {
    if (!page?.lineage?.length) return null;
    const edits = page.lineage.filter(e => e.action === 'edited' || e.action === 'ai_edit' || e.detail?.includes('edit'));
    return edits.length > 0 ? edits[edits.length - 1] : null;
  }, [page]);

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Users} label={`Current Viewers (${presence.length})`} />
        <div className="space-y-1 mt-1">
          {presence.length === 0 && (
            <EmptyState icon={Users} message="No collaborators online" />
          )}
          {presence.map(user => (
            <div key={user.id} className="flex items-center gap-2 p-1.5 rounded text-[11px]">
              <div className="w-5 h-5 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[9px] font-bold text-[var(--accent)]">
                {(user.userName || '?')[0]}
              </div>
              <span className="flex-1 truncate text-[var(--text)]">{user.userName || 'Unknown'}</span>
              <span className="text-[9px] text-[var(--muted)]">{user.status || 'viewing'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Shield} label={`Permissions (${permissions.length})`} />
        <div className="space-y-1 mt-1">
          {loadingPerms && <div className="text-[10px] text-[var(--muted)] italic py-2">Loading permissions...</div>}
          {!loadingPerms && permissions.length === 0 && (
            <EmptyState icon={Shield} message="No permissions set" />
          )}
          {permissions.map(p => (
            <div key={p.id || p.user_id} className="flex items-center gap-2 p-1.5 rounded text-[10px]">
              <div className="w-4 h-4 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[8px] font-bold text-[var(--accent)]">
                {(p.user_name || '?')[0]}
              </div>
              <span className="flex-1 truncate text-[var(--text)]">{p.user_name || 'Unknown'}</span>
              <span className="text-[var(--muted)]">{p.role || 'viewer'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Activity} label="Last Editor" />
        <div className="mt-1">
          {lastEditor ? (
            <div className="text-[10px] text-[var(--text)]">
              {lastEditor.userName || 'Unknown'} · {lastEditor.timestamp ? timeAgo(lastEditor.timestamp) : 'Unknown'}
            </div>
          ) : (
            <EmptyState icon={Activity} message="No edit history" />
          )}
        </div>
      </div>
    </div>
  );
}

function VersionsTab({ page, pageId, onRestoreVersion }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    auditEngine.getPageVersions(pageId).then(data => {
      setVersions(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pageId]);

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-1">
          <SectionHeader icon={History} label={`Versions (${versions.length})`} />
          {versions.length >= 2 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--hover)] hover:bg-[var(--accent-soft)] text-[9px] text-[var(--text)] transition-colors"
            >
              <Diff size={9} />
              {compareMode ? 'Cancel' : 'Compare'}
            </button>
          )}
        </div>
        <div className="space-y-1 mt-1 max-h-72 overflow-y-auto scrollbar-thin">
          {loading && <div className="text-[10px] text-[var(--muted)] italic py-2">Loading versions...</div>}
          {!loading && versions.length === 0 && (
            <EmptyState icon={History} message="No versions saved" />
          )}
          {versions.map(v => (
            <div key={v.id} className={`flex items-center gap-2 p-1.5 rounded text-[10px] ${
              compareMode ? 'hover:bg-[var(--hover)] cursor-pointer' : ''
            } ${compareA === v.id ? 'ring-1 ring-[var(--accent)]' : ''} ${compareB === v.id ? 'ring-1 ring-[var(--accent)]' : ''}`}
              onClick={() => {
                if (!compareMode) return;
                if (!compareA) setCompareA(v.id);
                else if (!compareB && compareA !== v.id) setCompareB(v.id);
                else { setCompareA(v.id); setCompareB(null); }
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[var(--text)] font-medium truncate">v{v.version_number}{v.description ? `: ${v.description}` : ''}</div>
                <div className="text-[8px] text-[var(--muted)]">{v.user_name || 'Unknown'} · {v.created_at ? timeAgo(v.created_at) : 'No date'}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRestoreVersion?.(v.id); }}
                className="shrink-0 px-1.5 py-0.5 rounded bg-[var(--hover)] hover:bg-[var(--accent-soft)] text-[9px] text-[var(--text)] transition-colors"
                aria-label={`Restore version ${v.version_number}`}
              >
                <RotateCcw size={9} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {compareMode && compareA && compareB && (
        <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--accent)]">
          <SectionHeader icon={Diff} label="Version Comparison" />
          <div className="text-[9px] text-[var(--muted)] mt-1">
            Comparing v{(versions.find(v => v.id === compareA)?.version_number)} with v{(versions.find(v => v.id === compareB)?.version_number)}
          </div>
        </div>
      )}
    </div>
  );
}

function AuditTab({ pageId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    const opts = filter !== 'all' ? { action: filter } : {};
    auditEngine.getPageAudit(pageId, opts).then(data => {
      setEvents(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [pageId, filter]);

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <div className="flex items-center justify-between mb-1">
          <SectionHeader icon={Shield} label={`Audit Trail (${events.length})`} />
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border)] rounded px-1.5 py-0.5 text-[9px] text-[var(--text)] outline-none"
          >
            <option value="all">All</option>
            <option value="edit">Edits</option>
            <option value="create">Created</option>
            <option value="ai_generated">AI</option>
            <option value="ai_edit">AI Edit</option>
            <option value="trashed">Trashed</option>
            <option value="restore">Restored</option>
            <option value="permission_change">Permissions</option>
          </select>
        </div>
        <div className="space-y-1 mt-1 max-h-96 overflow-y-auto scrollbar-thin">
          {loading && <div className="text-[10px] text-[var(--muted)] italic py-2">Loading...</div>}
          {!loading && events.length === 0 && (
            <EmptyState icon={Shield} message="No audit events" />
          )}
          {events.map(evt => (
            <div key={evt.id} className="flex gap-2 p-1.5 rounded hover:bg-[var(--hover)] text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[var(--text)] font-medium">
                  <span>{evt.user_name || 'System'}</span>
                  <span className="text-[var(--muted)] font-normal">{evt.action || 'unknown'}</span>
                </div>
                {evt.detail && <div className="text-[var(--secondary)] truncate">{evt.detail}</div>}
                <div className="text-[8px] text-[var(--muted)]">{evt.created_at ? timeAgo(evt.created_at) : 'No date'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AITab({ page, pages, onAskAI }) {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [aiEvents, setAiEvents] = useState([]);
  const [loadingAiEvents, setLoadingAiEvents] = useState(false);

  const pageId = page?.id;

  useEffect(() => {
    if (!pageId) return;
    setLoadingAiEvents(true);
    Promise.all([
      auditEngine.getAIEvents(pageId, 20),
      auditEngine.getAuditSummary(pageId),
    ]).then(([events, summaryData]) => {
      setAiEvents(events || []);
      setLoadingAiEvents(false);
    }).catch(() => setLoadingAiEvents(false));
  }, [pageId]);

  const suggestSummary = useCallback(async () => {
    if (!page || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const text = plainText(page).slice(0, 2000);
      const prompt = `Summarize this page in 1-2 sentences:\n\n${text}`;
      const result = await onAskAI?.(prompt);
      setSummary(result || 'AI summary unavailable');
    } catch {
      setSummary('AI summary temporarily unavailable');
    }
    setSummaryLoading(false);
  }, [page, onAskAI, summaryLoading]);

  const lastAiEvent = aiEvents.length > 0 ? aiEvents[0] : null;

  if (!page) return <EmptyState icon={Brain} message="No page data" />;

  return (
    <div className="space-y-2 px-2 py-2">
      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Sparkles} label="AI Summary" />
        <div className="mt-1">
          {!summary && !summaryLoading && (
            <button
              onClick={suggestSummary}
              className="w-full text-left p-2 rounded bg-[var(--accent-soft)] text-[10px] text-[var(--accent)] hover:bg-[var(--accent-soft)]/80 transition-colors"
            >
              Generate AI summary
            </button>
          )}
          {summaryLoading && (
            <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] py-2">
              <Loader2 size={10} className="animate-spin" />
              Generating summary...
            </div>
          )}
          {summary && !summaryLoading && (
            <div className="text-[11px] text-[var(--text)] leading-relaxed">{summary}</div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Brain} label={`AI History (${aiEvents.length})`} />
        <div className="space-y-1 mt-1 max-h-40 overflow-y-auto scrollbar-thin">
          {loadingAiEvents && <div className="text-[10px] text-[var(--muted)] italic py-2">Loading AI history...</div>}
          {!loadingAiEvents && aiEvents.length === 0 && (
            <EmptyState icon={Brain} message="No AI interactions yet" />
          )}
          {aiEvents.slice(0, 10).map(evt => (
            <div key={evt.id} className="flex gap-2 text-[10px] p-1 rounded hover:bg-[var(--hover)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-[var(--text)] font-medium truncate">{evt.detail || evt.action || 'AI action'}</div>
                <div className="flex gap-2 text-[8px] text-[var(--muted)]">
                  {evt.ai_provider && <span>{evt.ai_provider}</span>}
                  {evt.ai_model && <span>{evt.ai_model}</span>}
                  {evt.ai_prompt_tokens > 0 && <span>{evt.ai_prompt_tokens} in</span>}
                  {evt.ai_completion_tokens > 0 && <span>{evt.ai_completion_tokens} out</span>}
                  {evt.ai_latency_ms > 0 && <span>{evt.ai_latency_ms}ms</span>}
                </div>
                <div className="text-[8px] text-[var(--muted)]">{evt.created_at ? timeAgo(evt.created_at) : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lastAiEvent && (
        <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
          <SectionHeader icon={Activity} label="Last AI Action" />
          <div className="mt-1 space-y-0.5">
            <StatRow icon={Brain} label="Provider" value={lastAiEvent.ai_provider || 'Not recorded'} />
            <StatRow icon={Brain} label="Model" value={lastAiEvent.ai_model || 'Not recorded'} />
            <StatRow icon={Hash} label="Input tokens" value={lastAiEvent.ai_prompt_tokens || 'Not recorded'} />
            <StatRow icon={Hash} label="Output tokens" value={lastAiEvent.ai_completion_tokens || 'Not recorded'} />
            <StatRow icon={Clock} label="Latency" value={lastAiEvent.ai_latency_ms ? `${lastAiEvent.ai_latency_ms}ms` : 'Not recorded'} />
            {lastAiEvent.ai_cost > 0 && <StatRow icon={Target} label="Cost" value={`$${lastAiEvent.ai_cost.toFixed(6)}`} />}
            {lastAiEvent.ai_tool_calls?.length > 0 && (
              <StatRow icon={Code} label="Tool calls" value={lastAiEvent.ai_tool_calls.length} />
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-[var(--surface)] p-2 border border-[var(--border)]">
        <SectionHeader icon={Sparkles} label="AI Suggestions" />
        <div className="space-y-1 mt-1">
          {[
            { label: 'Improve writing clarity', icon: Sparkles },
            { label: 'Suggest related pages', icon: Link2 },
            { label: 'Extract action items', icon: CheckCircle },
            { label: 'Find duplicate content', icon: AlertCircle },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => onAskAI?.(`Analyze this page and ${s.label.toLowerCase()}.`)}
              className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-[var(--hover)] text-[10px] text-[var(--text)] transition-colors"
            >
              <s.icon size={11} className="text-[var(--accent)]" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PageInspector({
  page, pages, pageId, activeId,
  onPatchPage, onSelect, onAskAI, onRestoreVersion, onToast,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [versions, setVersions] = useState([]);
  const [auditCount, setAuditCount] = useState(0);
  const [aiEvents, setAiEvents] = useState([]);
  const tabContainerRef = useRef(null);

  const relations = useMemo(() => page ? getAllRelations(page.id, pages) : { backlinks: [], outgoing: [] }, [page, pages]);

  useEffect(() => {
    if (!pageId) return;
    Promise.all([
      auditEngine.getPageVersions(pageId),
      auditEngine.getPageAudit(pageId, { limit: 1 }),
      auditEngine.getAIEvents(pageId, 5),
    ]).then(([vers, audit, ai]) => {
      setVersions(vers || []);
      setAuditCount(audit?.length || 0);
      setAiEvents(ai || []);
    }).catch(() => {});
  }, [pageId]);

  const stats = useMemo(() => computePageStats(page), [page]);

  const knowledge = useMemo(() => {
    if (!page) return { score: 0, metrics: [] };
    return computeKnowledgeScore(page, pages, relations, versions.length, auditCount, aiEvents, stats);
  }, [page, pages, relations, versions.length, auditCount, aiEvents, stats]);

  return (
    <div className="flex flex-col h-full text-[var(--text)]">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div ref={tabContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'overview' && <OverviewTab page={page} pages={pages} relations={relations} versionsCount={versions.length} auditCount={auditCount} aiEvents={aiEvents} knowledge={knowledge} />}
        {activeTab === 'stats' && <StatsTab page={page} />}
        {activeTab === 'details' && <DetailsTab page={page} pages={pages} />}
        {activeTab === 'properties' && <PropertiesTab page={page} pages={pages} onPatchPage={onPatchPage} />}
        {activeTab === 'relationships' && <RelationshipsTab page={page} pages={pages} />}
        {activeTab === 'activity' && <ActivityTab page={page} pageId={pageId} />}
        {activeTab === 'collaboration' && <CollaborationTab pageId={pageId} page={page} />}
        {activeTab === 'versions' && <VersionsTab page={page} pageId={pageId} onRestoreVersion={onRestoreVersion} />}
        {activeTab === 'audit' && <AuditTab pageId={pageId} />}
        {activeTab === 'ai' && <AITab page={page} pages={pages} onAskAI={onAskAI} />}
      </div>
    </div>
  );
}
