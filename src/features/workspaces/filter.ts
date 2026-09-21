import type { WorkspaceRow } from './service';

export interface WorkspaceScoped {
  workspaceId?: string | null;
}

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

function itemWorkspaceId(item: Pick<WorkspaceScoped, 'workspaceId'>, fallbackId: string | null): string | null {
  if (!isUnscopedWorkspaceId(item.workspaceId)) return String(item.workspaceId);
  return fallbackId;
}

export function filterByWorkspace<T extends WorkspaceScoped>(
  items: T[],
  activeId: string | null,
  rows: WorkspaceRow[],
): T[] {
  if (!rows.length || !activeId) return items;
  const oldest = oldestWorkspaceId(rows);
  return items.filter(item => {
    const wid = itemWorkspaceId(item, oldest);
    return wid === null || wid === activeId;
  });
}

export function filterPagesByWorkspace<T extends WorkspaceScoped>(
  pages: T[],
  activeId: string | null,
  rows: WorkspaceRow[],
): T[] {
  return filterByWorkspace(pages, activeId, rows);
}
