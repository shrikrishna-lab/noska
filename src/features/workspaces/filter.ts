import type { Page } from '../../lib/supabaseService';
import type { WorkspaceRow } from './service';

export function isUnscopedWorkspaceId(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

export function oldestWorkspaceId(rows: WorkspaceRow[]): string | null {
  if (!rows.length) return null;
  let oldest = rows[0];
  for (const row of rows) {
    if (row.created_at < oldest.created_at) oldest = row;
  }
  return oldest.id;
}

export function resolveActiveWorkspaceId(rows: WorkspaceRow[], storedId: string | null): string | null {
  if (!rows.length) return null;
  if (storedId && rows.some(row => row.id === storedId)) return storedId;
  return oldestWorkspaceId(rows);
}

function pageWorkspaceId(page: Pick<Page, 'workspaceId'>, fallbackId: string | null): string | null {
  if (!isUnscopedWorkspaceId(page.workspaceId)) return String(page.workspaceId);
  return fallbackId;
}

export function filterPagesByWorkspace(
  pages: Page[],
  activeId: string | null,
  rows: WorkspaceRow[],
): Page[] {
  if (!rows.length || !activeId) return pages;
  const oldest = oldestWorkspaceId(rows);
  return pages.filter(page => {
    const wid = pageWorkspaceId(page, oldest);
    return wid === null || wid === activeId;
  });
}
