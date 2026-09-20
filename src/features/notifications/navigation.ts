import { useEffect, useState } from 'react';
import { notificationClient } from './api';
import { getAuthUserId } from '../../lib/supabase';
import { isUuid, type NotificationRecord } from './types';

export interface NotificationTarget { pageId?: string; blockId?: string; commentId?: string; view?: 'inbox' }
const safeBlockId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export function parseNotificationTarget(n: Partial<NotificationRecord>): NotificationTarget | null {
  const metadata = n.metadata || {};
  let pageId = n.page_id || (typeof metadata.page_id === 'string' ? metadata.page_id : undefined);
  let blockId = n.block_id || (typeof metadata.block_id === 'string' ? metadata.block_id : undefined);
  let commentId = n.comment_id || (typeof metadata.comment_id === 'string' ? metadata.comment_id : undefined) || (n.entity_type === 'comment' && isUuid(n.entity_id) ? n.entity_id : undefined);
  if (n.action_url) {
    if (!n.action_url.startsWith('/') || n.action_url.startsWith('//') || /[\\\s]/.test(n.action_url)) return null;
    const url = new URL(n.action_url, 'https://notification.invalid');
    const workspaceMatch = url.pathname.match(/^\/workspace\/([0-9a-f-]+)\/page\/([0-9a-f-]+)\/?$/i);
    if (workspaceMatch && !isUuid(workspaceMatch[1])) return null;
    const match = workspaceMatch ? [workspaceMatch[0], workspaceMatch[2]] : url.pathname.match(/^\/(?:my-workspace|page|app\/page|workspace\/page)\/([0-9a-f-]+)\/?$/i);
    if (!match) return ['/inbox', '/app/inbox', '/my-workspace'].includes(url.pathname) && !url.search && !url.hash ? { view: 'inbox' } : null;
    if (pageId && pageId !== match[1]) return null;
    pageId = match[1];
    const allowed = new Set(['block', 'blockId', 'comment', 'commentId']);
    if ([...url.searchParams.keys()].some(key => !allowed.has(key))) return null;
    const urlBlock = url.searchParams.get('block') || url.searchParams.get('blockId') || (url.hash.startsWith('#block-') ? url.hash.slice(7) : undefined);
    const urlComment = url.searchParams.get('comment') || url.searchParams.get('commentId');
    if (url.hash && !url.hash.startsWith('#block-')) return null;
    if ((blockId && urlBlock && blockId !== urlBlock) || (commentId && urlComment && commentId !== urlComment)) return null;
    blockId = urlBlock || blockId;
    commentId = urlComment || commentId;
  }
  if (!isUuid(pageId) || (blockId && !safeBlockId(blockId)) || (commentId && !isUuid(commentId))) return null;
  return { pageId, blockId, commentId };
}
export async function validateNotificationTarget(target: NotificationTarget, userId: string): Promise<NotificationTarget> {
  if (target.view === 'inbox') return target;
  if (!isUuid(userId) || !isUuid(target.pageId)) throw new Error('This notification has no available destination.');
  const subject = await getAuthUserId();
  const { data: page, error } = await notificationClient.from('pages').select('id,user_id,trashed,blocks,visibility').eq('id', target.pageId).maybeSingle();
  if (error || !page || page.trashed) throw new Error('This page is unavailable or your access was removed.');
  if (page.user_id !== userId && page.user_id !== subject && page.visibility !== 'public') {
    const { data: permissions, error: permissionError } = await notificationClient.from('page_permissions').select('can_view').eq('page_id', target.pageId).in('user_id', subject ? [userId, subject] : [userId]);
    if (permissionError || !permissions?.some(permission => permission.can_view)) throw new Error('You no longer have access to this page.');
  }
  const result = { ...target };
  if (target.commentId) {
    const { data: comment, error: commentError } = await notificationClient.from('page_comments').select('id,block_id').eq('id', target.commentId).eq('page_id', target.pageId).maybeSingle();
    if (commentError || !comment) throw new Error('This comment is no longer available.');
    if (target.blockId && comment.block_id && target.blockId !== comment.block_id) throw new Error('The comment destination has changed.');
    result.blockId = comment.block_id || target.blockId;
  }
  if (result.blockId) {
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    const contains = (list: Record<string, unknown>[]): boolean => list.some(block => block.id === result.blockId && !block.deleted || Array.isArray(block.children) && contains(block.children));
    if (!contains(blocks)) throw new Error('This block is no longer available.');
  }
  return result;
}
let pendingTarget: NotificationTarget | null = null;
const targetListeners = new Set<() => void>();
function publishTarget(target: NotificationTarget | null) {
  pendingTarget = target;
  targetListeners.forEach(listener => listener());
}
export function useNotificationTarget(pageId?: string, active = true) {
  const [target, setTarget] = useState(pendingTarget);
  useEffect(() => {
    const update = () => setTarget(pendingTarget);
    targetListeners.add(update);
    update();
    return () => { targetListeners.delete(update); };
  }, []);
  return active && target?.pageId === pageId ? target : null;
}
export function highlightNotificationTarget(target: NotificationTarget, stillCurrent: () => boolean, onMissing: () => void) {
  if (!target.pageId || (!target.blockId && !target.commentId)) return () => {};
  let stopped = false;
  let highlighted: HTMLElement | null = null;
  let previousOutline = '';
  let previousOffset = '';
  const stop = () => {
    if (stopped) return;
    stopped = true;
    observer.disconnect();
    window.clearTimeout(timeout);
    if (highlighted) {
      highlighted.style.outline = previousOutline;
      highlighted.style.outlineOffset = previousOffset;
    }
    if (pendingTarget === target) publishTarget(null);
  };
  const locate = () => {
    if (stopped) return;
    if (!stillCurrent()) { stop(); return; }
    if (highlighted) return;
    const roots = [...document.querySelectorAll<HTMLElement>('[data-notification-page]')];
    const root = roots.find(element => element.dataset.notificationPage === target.pageId && element.dataset.notificationActive === 'true');
    if (!root) return;
    const attribute = target.commentId ? 'data-comment-id' : 'data-block-id';
    const id = target.commentId || target.blockId;
    const element = [...root.querySelectorAll<HTMLElement>(`[${attribute}]`)].find(candidate => candidate.getAttribute(attribute) === id);
    if (!element) return;
    highlighted = element;
    previousOutline = element.style.outline;
    previousOffset = element.style.outlineOffset;
    element.style.outline = '2px solid var(--accent)';
    element.style.outlineOffset = '3px';
    element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  };
  const observer = new MutationObserver(locate);
  const timeout = window.setTimeout(() => {
    const missing = !highlighted && stillCurrent();
    stop();
    if (missing) onMissing();
  }, 8000);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  publishTarget(target);
  locate();
  return stop;
}
export function requestNotificationOpen(id: string) {
  window.dispatchEvent(new CustomEvent('noska:notification-open', { detail: { notificationId: id } }));
}
