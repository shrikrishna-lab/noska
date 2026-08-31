import { supabase } from '../../lib/supabase';
import type { PageComment } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromComments = () => (supabase.from('page_comments' as any));

export async function getComments(pageId: string, blockId?: string): Promise<PageComment[]> {
  let query = fromComments()
    .select('*')
    .eq('page_id', pageId)
    .order('created_at', { ascending: true });

  if (blockId) {
    query = query.eq('block_id', blockId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as PageComment[];
}

export async function addComment(pageId: string, userId: string, userName: string, content: string, blockId?: string, parentCommentId?: string, userAvatar?: string): Promise<PageComment | null> {
  const mentions = extractMentions(content);

  const { data, error } = await fromComments()
    .insert({
      page_id: pageId,
      block_id: blockId || null,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar || null,
      content,
      parent_comment_id: parentCommentId || null,
      mentions,
      reactions: {},
    })
    .select()
    .single();

  if (error) {
    console.warn('addComment error:', error);
    return null;
  }
  return data as unknown as PageComment;
}

export async function updateComment(commentId: string, content: string): Promise<boolean> {
  const mentions = extractMentions(content);
  const { error } = await fromComments()
    .update({ content, mentions, updated_at: new Date().toISOString() })
    .eq('id', commentId);

  return !error;
}

export async function deleteComment(commentId: string): Promise<boolean> {
  const { error } = await fromComments()
    .delete()
    .eq('id', commentId);

  return !error;
}

export async function resolveComment(commentId: string, resolvedBy: string): Promise<boolean> {
  const { error } = await fromComments()
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  return !error;
}

export async function unresolveComment(commentId: string): Promise<boolean> {
  const { error } = await fromComments()
    .update({ resolved: false, resolved_by: null, resolved_at: null })
    .eq('id', commentId);

  return !error;
}

export async function addReaction(commentId: string, emoji: string, userId: string): Promise<boolean> {
  const { data: existing, error: fetchError } = await fromComments()
    .select('reactions')
    .eq('id', commentId)
    .single();

  if (fetchError || !existing) return false;

  const reactions = (existing as unknown as PageComment).reactions || {};
  const users = reactions[emoji] || [];
  const hasReacted = users.includes(userId);

  if (hasReacted) {
    reactions[emoji] = users.filter((u: string) => u !== userId);
    if (reactions[emoji].length === 0) delete reactions[emoji];
  } else {
    reactions[emoji] = [...users, userId];
  }

  const { error } = await fromComments()
    .update({ reactions })
    .eq('id', commentId);

  return !error;
}

function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\s\w+)?)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}
