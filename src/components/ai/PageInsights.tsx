import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Hash, Link2, Image, Code, Table2, ListTodo, BookOpen,
  Sparkles, AlertCircle, CheckCircle, ArrowRight, Tag,
  Type, BarChart3, ShieldCheck
} from 'lucide-react';
import { plainText } from '../../utils/helpers';
import { getAllRelations } from '../../utils/pageLinks';
import type { Page } from '../../lib/supabaseService';

interface PageInsightsProps {
  page: Page | null;
  pages?: Page[];
  onSend?: (prompt: string) => void;
}

function analyzePage(page: Page | null, pages: Page[] = []) {
  if (!page) return { score: 0, issues: [], strengths: [], stats: { words: 0, headings: 0, blocks: 0 } };

  const blocks = page.blocks || [];
  const text = plainText(page);
  const words = text.split(/\s+/).filter(Boolean).length;
  const headings = blocks.filter(b => /^h[123]$/.test(b.type));
  const images = blocks.filter(b => b.type === 'image');
  const codeBlocks = blocks.filter(b => b.type === 'code');
  const tables = blocks.filter(b => b.type === 'table');
  const todos = blocks.filter(b => b.type === 'todo');
  const relations = page.id ? getAllRelations(page.id, pages) : { backlinks: [], outgoing: [] };

  const issues = [];
  const strengths = [];

  if (!page.title || page.title.trim() === '' || page.title === 'Untitled') {
    issues.push({
      icon: Type,
      label: 'Untitled page',
      detail: 'Suggest a smart, descriptive title',
      action: `Suggest 5 concise and engaging titles for this page based on its content.`
    });
  }

  if (words < 20) {
    issues.push({
      icon: BookOpen,
      label: 'Low word count',
      detail: `Only ${words} words — generate introductory section`,
      action: `Help expand this page with a well-structured introductory overview and bullet points.`
    });
  } else if (words < 100) {
    issues.push({
      icon: BookOpen,
      label: 'Short draft',
      detail: `${words} words — expand key points`,
      action: `Expand on the key concepts in this page to provide more depth and clarity.`
    });
  } else {
    strengths.push({ icon: BookOpen, label: `${words} words`, detail: 'Rich content depth' });
  }

  if (headings.length === 0 && words >= 60) {
    issues.push({
      icon: Hash,
      label: 'No structure headings',
      detail: 'Add H2/H3 sections to organize content',
      action: `Add structured headings (H1, H2, H3) and dividers to organize this page clearly.`
    });
  } else if (headings.length > 0) {
    strengths.push({ icon: Hash, label: `${headings.length} heading${headings.length > 1 ? 's' : ''}`, detail: 'Well organized' });
  }

  const connections = relations.backlinks.length + relations.outgoing.length;
  if (connections === 0 && pages.length > 1) {
    issues.push({
      icon: Link2,
      label: 'No workspace links',
      detail: 'Connect this note to other relevant pages',
      action: `Find connections between this page and other pages in my workspace.`
    });
  } else if (connections > 0) {
    strengths.push({ icon: Link2, label: `${connections} link${connections > 1 ? 's' : ''}`, detail: 'Connected in workspace' });
  }

  if (todos.length > 0) {
    const done = todos.filter(t => t.checked).length;
    strengths.push({ icon: ListTodo, label: `${done}/${todos.length} tasks completed`, detail: 'Task tracking' });
  }
  if (codeBlocks.length > 0) strengths.push({ icon: Code, label: `${codeBlocks.length} code block${codeBlocks.length > 1 ? 's' : ''}`, detail: 'Code references' });
  if (images.length > 0) strengths.push({ icon: Image, label: `${images.length} media item${images.length > 1 ? 's' : ''}`, detail: 'Visual media' });

  const totalChecks = 6;
  const passed = strengths.length;
  const score = Math.min(100, Math.max(15, Math.round((passed / totalChecks) * 100)));

  return { score, issues, strengths, stats: { words, headings: headings.length, blocks: blocks.length } };
}

export default function PageInsights({ page, pages = [], onSend }: PageInsightsProps) {
  const analysis = useMemo(() => analyzePage(page, pages), [page, pages]);
  const { score, issues, strengths, stats } = analysis;

  if (!page) return null;

  return (
    <div className="mx-4 sm:mx-8 my-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]/60 backdrop-blur-xs p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
            <BarChart3 size={13} />
          </div>
          <div>
            <span className="text-xs font-semibold text-[var(--text)]">Document Quality & Health</span>
            <div className="text-[10px] text-[var(--muted)]">
              {stats.words} words · {stats.blocks} blocks · {stats.headings} headings
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 80 ? 'bg-[var(--success)]' : score >= 50 ? 'bg-[var(--accent)]' : 'bg-[var(--warning)]'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-[var(--text)]">{score}%</span>
        </div>
      </div>

      {/* Suggested Fixes / Strengths */}
      {issues.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5">
          {issues.slice(0, 2).map((issue) => {
            const Icon = issue.icon;
            return (
              <button
                key={issue.label}
                type="button"
                onClick={() => onSend?.(issue.action)}
                className="group flex items-center gap-2.5 p-2 rounded-xl bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)]/30 text-left transition-all"
              >
                <div className="w-6 h-6 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center shrink-0">
                  <Icon size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {issue.label}
                  </div>
                  <div className="text-[9px] text-[var(--muted)] truncate">
                    {issue.detail}
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[var(--accent)] opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                  Fix <ArrowRight size={10} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--success)] font-medium">
          <ShieldCheck size={14} />
          Page is well structured and documented!
        </div>
      )}
    </div>
  );
}
