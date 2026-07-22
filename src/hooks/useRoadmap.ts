import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  eta: string | null;
  owner: string | null;
  labels: string | null;
  category: string | null;
  target_version: string | null;
  created_at: string | null;
}

export function useRoadmap() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }

    const { data: itemsData } = await supabase
      .from('roadmap_items' as never)
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false }) as { data: RoadmapItem[] | null };

    if (itemsData) setItems(itemsData);

    const { data: votesData } = await supabase
      .from('roadmap_votes' as never)
      .select('roadmap_item_id') as { data: { roadmap_item_id: string }[] | null };

    if (votesData) {
      const counts: Record<string, number> = {};
      for (const v of votesData) {
        counts[v.roadmap_item_id] = (counts[v.roadmap_item_id] || 0) + 1;
      }
      setVoteCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submitVote = useCallback(async (roadmapItemId: string, email: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'No database connection' };
    try {
      const { error } = await supabase
        .from('roadmap_votes' as never)
        .insert({ roadmap_item_id: roadmapItemId, email } as never);
      if (error) {
        if (error.message?.includes('duplicate') || error.message?.includes('violates unique constraint')) {
          return { success: false, error: 'You have already voted for this feature.' };
        }
        return { success: false, error: error.message };
      }
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to vote' };
    }
  }, [fetchData]);

  const submitFeatureRequest = useCallback(async (data: { user_name: string; email: string; message: string }): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'No database connection' };
    try {
      const { error: fbError } = await supabase
        .from('feedback' as never)
        .insert({
          user_name: data.user_name,
          email: data.email,
          message: data.message,
          category: 'feature',
          status: 'new',
        } as never);
      if (fbError) return { success: false, error: fbError.message };

      await supabase
        .from('email_queue' as never)
        .insert({
          recipient: data.email,
          subject: 'We received your feature request!',
          html_content: `<p>Hi ${data.user_name},</p><p>Thank you for your feature suggestion! Our team will review it and consider it for our roadmap.</p><p>Your idea:</p><blockquote>${data.message}</blockquote><p>— The Noska Team</p>`,
          status: 'pending',
        } as never);

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to submit' };
    }
  }, []);

  const subscribeToNewsletter = useCallback(async (email: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    if (!supabase) return { success: false, error: 'No database connection' };
    try {
      const { data: existing } = await supabase
        .from('newsletter_subscribers' as never)
        .select('id')
        .eq('email' as never, email)
        .maybeSingle() as { data: { id: string } | null };

      if (existing) return { success: false, error: 'This email is already subscribed.' };

      const displayName = name || email.split('@')[0];

      const { error } = await supabase
        .from('newsletter_subscribers' as never)
        .insert({
          email,
          name: displayName,
          source: 'signup',
          status: 'active',
          tags: ['roadmap'],
          metadata: { subscribed_from: 'roadmap_page' },
        } as never);
      if (error) return { success: false, error: error.message };

      await supabase
        .from('email_queue' as never)
        .insert({
          recipient: email,
          subject: 'You\'re subscribed to Noska updates!',
          html_content: `<p>Hi ${displayName},</p><p>You've subscribed to receive updates about new Noska features and releases. We'll keep you posted on everything new and exciting.</p><p>— The Noska Team</p>`,
          status: 'pending',
        } as never);

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to subscribe' };
    }
  }, []);

  return { items, voteCounts, loading, submitVote, submitFeatureRequest, subscribeToNewsletter, refetch: fetchData };
}
