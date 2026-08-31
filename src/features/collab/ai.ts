import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Block } from '../../../types/blocks';

interface AISuggestion {
  id: string;
  type: 'edit' | 'structure' | 'grammar' | 'style' | 'summary';
  title: string;
  description: string;
  blockId?: string;
  original?: string;
  suggested?: string;
  confidence: number;
  applied: boolean;
}

interface AISummary {
  pageId: string;
  summary: string;
  keyChanges: string[];
  collaborators: string[];
  generatedAt: string;
}

interface AICollaboratorInsight {
  userId: string;
  userName: string;
  contributionScore: number;
  editCount: number;
  commentCount: number;
  activeHours: number;
  focusBlocks: string[];
}

export function useAISuggestions(pageId: string | null, userId: string | null) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async (blocks: Block[]) => {
    if (!pageId || !userId || blocks.length === 0) return;
    setLoading(true);

    try {
      const textBlocks = blocks.filter(b => b.text && !b.isDeleted);
      const newSuggestions: AISuggestion[] = [];

      for (const block of textBlocks.slice(0, 20)) {
        const text = block.text || '';
        if (text.length > 200) {
          newSuggestions.push({
            id: `sug-${block.id}-summary`,
            type: 'summary',
            title: 'Long block detected',
            description: `Block has ${text.length} characters. Consider breaking it into smaller sections.`,
            blockId: block.id,
            original: text.slice(0, 100) + '...',
            confidence: 0.7,
            applied: false,
          });
        }

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 5) {
          newSuggestions.push({
            id: `sug-${block.id}-structure`,
            type: 'structure',
            title: 'Multiple sentences in one block',
            description: `Block contains ${sentences.length} sentences. Consider splitting for better readability.`,
            blockId: block.id,
            confidence: 0.6,
            applied: false,
          });
        }

        const spellingErrors = text.match(/\b(teh|recieve|seperate|occured|definately)\b/gi);
        if (spellingErrors && spellingErrors.length > 0) {
          newSuggestions.push({
            id: `sug-${block.id}-grammar`,
            type: 'grammar',
            title: 'Possible spelling error',
            description: `Found: ${spellingErrors.join(', ')}`,
            blockId: block.id,
            original: text,
            confidence: 0.9,
            applied: false,
          });
        }
      }

      setSuggestions(newSuggestions);
    } catch (err) {
      console.warn('AI analysis error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId, userId]);

  const apply = useCallback((suggestionId: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === suggestionId ? { ...s, applied: true } : s)
    );
  }, []);

  const dismiss = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  return { suggestions, loading, analyze, apply, dismiss };
}

export function useAISummary(pageId: string | null) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async (blocks: Block[], activityData?: { userName: string; action: string }[]) => {
    if (!pageId || blocks.length === 0) return;
    setLoading(true);

    try {
      const textContent = blocks
        .filter(b => b.text && !b.isDeleted)
        .map(b => b.text)
        .join('\n');

      const wordCount = textContent.split(/\s+/).filter(Boolean).length;
      const blockCount = blocks.filter(b => !b.isDeleted).length;
      const headingBlocks = blocks.filter(b => b.type?.startsWith('heading') && !b.isDeleted);

      const keyChanges: string[] = [];
      if (activityData) {
        const actionCounts = activityData.reduce((acc, a) => {
          acc[a.action] = (acc[a.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(actionCounts).forEach(([action, count]) => {
          if (action === 'block_edited') keyChanges.push(`${count} block edits`);
          else if (action === 'block_added') keyChanges.push(`${count} new blocks`);
          else if (action === 'comment_added') keyChanges.push(`${count} comments`);
        });
      }

      const collabs = [...new Set(activityData?.map(a => a.userName) || [])];

      setSummary({
        pageId,
        summary: `This page contains ${wordCount} words across ${blockCount} blocks${headingBlocks.length > 0 ? ` with ${headingBlocks.length} headings` : ''}.`,
        keyChanges,
        collaborators: collabs,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('AI summary error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  return { summary, loading, generate };
}

export function useAICollaboratorInsights(pageId: string | null) {
  const [insights, setInsights] = useState<AICollaboratorInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async () => {
    if (!pageId) return;
    setLoading(true);

    try {
      const { data: sessions } = await supabase
        .from('collaboration_sessions' as any)
        .select('*')
        .eq('page_id', pageId);

      const { data: activity } = await supabase
        .from('collab_activity' as any)
        .select('*')
        .eq('page_id', pageId);

      if (!sessions || !activity) return;

      const sessionsArr = sessions as unknown as { user_id: string; user_name: string }[];
      const activityArr = activity as unknown as { user_id: string; user_name: string; action: string; created_at: string }[];

      const userMap = new Map<string, AICollaboratorInsight>();

      for (const s of sessionsArr) {
        if (!userMap.has(s.user_id)) {
          userMap.set(s.user_id, {
            userId: s.user_id,
            userName: s.user_name,
            contributionScore: 0,
            editCount: 0,
            commentCount: 0,
            activeHours: 0,
            focusBlocks: [],
          });
        }
      }

      for (const a of activityArr) {
        const insight = userMap.get(a.user_id);
        if (!insight) continue;

        if (a.action === 'block_edited') insight.editCount++;
        else if (a.action === 'comment_added') insight.commentCount++;
      }

      for (const insight of userMap.values()) {
        insight.contributionScore = insight.editCount * 2 + insight.commentCount * 1;
      }

      setInsights([...userMap.values()].sort((a, b) => b.contributionScore - a.contributionScore));
    } catch (err) {
      console.warn('AI insights error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  return { insights, loading, analyze };
}

export function useSmartNotifications(userId: string | null) {
  const [batched, setBatched] = useState<{ title: string; count: number; type: string }[]>([]);

  const batchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('collab_notifications' as any)
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false });

    if (!data) return;

    const notifications = data as unknown as { type: string; title: string }[];
    const grouped = notifications.reduce((acc, n) => {
      const key = n.type;
      if (!acc[key]) acc[key] = { title: n.title, count: 0, type: n.type };
      acc[key].count++;
      return acc;
    }, {} as Record<string, { title: string; count: number; type: string }>);

    setBatched(Object.values(grouped));
  }, [userId]);

  return { batched, batchNotifications };
}
