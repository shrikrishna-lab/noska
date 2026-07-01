import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Hash, Link2, Image, Code, Table2, ListTodo, BookOpen,
  Sparkles, AlertCircle, CheckCircle, ArrowRight, Tag,
  Type, BarChart3
} from 'lucide-react';
import { plainText } from '../../utils/helpers';
import { getAllRelations } from '../../utils/pageLinks';

function analyzePage(page, pages) {
  if (!page) return { score: 0, issues: [], strengths: [], stats: {} };

  const blocks = page.blocks || [];
  const text = plainText(page);
  const words = text.split(/\s+/).filter(Boolean).length;
  const headings = blocks.filter(b => /^h[123]$/.test(b.type));
  const images = blocks.filter(b => b.type === 'image');
  const codeBlocks = blocks.filter(b => b.type === 'code');
  const tables = blocks.filter(b => b.type === 'table');
  const todos = blocks.filter(b => b.type === 'todo');
  const relations = getAllRelations(page.id, pages);

  const issues = [];
  const strengths = [];

  if (!page.title || page.title === 'Untitled') {
    issues.push({ icon: Type, label: 'No title', detail: 'Give your page a descriptive title', action: 'Rename page' });
  }
  if (words < 30) {
    issues.push({ icon: BookOpen, label: 'Very short', detail: `Only ${words} words — add more content`, action: 'Add content' });
  } else if (words < 100) {
    issues.push({ icon: BookOpen, label: 'Short page', detail: `Only ${words} words, aim for 100+`, action: 'Expand' });
  } else {
    strengths.push({ icon: BookOpen, label: `${words} words`, detail: 'Good content length' });
  }

  if (headings.length === 0 && words > 100) {
    issues.push({ icon: Hash, label: 'No headings', detail: 'Add headings to structure content', action: 'Add headings' });
  } else if (headings.length > 0) {
    strengths.push({ icon: Hash, label: `${headings.length} heading${headings.length > 1 ? 's' : ''}`, detail: 'Good structure' });
  }

  if ((page.tags || []).length === 0) {
    issues.push({ icon: Tag, label: 'No tags', detail: 'Add tags for better organization', action: 'Add tags' });
  } else {
    strengths.push({ icon: Tag, label: `${page.tags.length} tag${page.tags.length > 1 ? 's' : ''}`, detail: page.tags.join(', ') });
  }

  const connections = relations.backlinks.length + relations.outgoing.length;
  if (connections === 0) {
    issues.push({ icon: Link2, label: 'No connections', detail: 'Link to/from other pages', action: 'Add links' });
  } else {
    strengths.push({ icon: Link2, label: `${connections} connection${connections > 1 ? 's' : ''}`, detail: `${relations.backlinks.length} backlinks, ${relations.outgoing.length} outgoing` });
  }

  if (images.length > 0) strengths.push({ icon: Image, label: `${images.length} image${images.length > 1 ? 's' : ''}`, detail: 'Visual content' });
  if (codeBlocks.length > 0) strengths.push({ icon: Code, label: `${codeBlocks.length} code block${codeBlocks.length > 1 ? 's' : ''}`, detail: 'Technical content' });
  if (todos.length > 0) strengths.push({ icon: ListTodo, label: `${todos.filter(t => t.checked).length}/${todos.length} done`, detail: 'Task tracking' });

  const totalChecks = 8;
  const passed = strengths.length;
  const score = Math.min(100, Math.round((passed / totalChecks) * 100));

  return { score, issues, strengths, stats: { words, headings: headings.length, blocks: blocks.length } };
}

export default function PageInsights({ page, pages, onSend }) {
  const analysis = useMemo(() => analyzePage(page, pages), [page, pages]);
  const { score, issues, strengths, stats } = analysis;

  if (!page) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-3 py-2 space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--muted)]">
          <BarChart3 size={11} />
          Page Health
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-12 rounded-full bg-[var(--border)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${score}%` }} />
          </div>
          <span className="text-[9px] font-medium text-[var(--text)]">{score}%</span>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="space-y-1">
          {issues.slice(0, 3).map((issue, i) => (
            <motion.button
              key={issue.label}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSend?.(`${issue.action} for this page`)}
              className="flex items-center gap-2 w-full p-1.5 rounded-lg hover:bg-[var(--hover)] text-left group transition-colors"
            >
              <AlertCircle size={11} className="text-[var(--warning)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium text-[var(--text)] truncate">{issue.label}</div>
                <div className="text-[8px] text-[var(--muted)] truncate">{issue.detail}</div>
              </div>
              <ArrowRight size={10} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </motion.button>
          ))}
        </div>
      )}

      {strengths.length > 0 && issues.length === 0 && (
        <div className="flex items-center gap-1 text-[9px] text-[var(--success)]">
          <CheckCircle size={9} />
          All checks passed
        </div>
      )}
    </motion.div>
  );
}
