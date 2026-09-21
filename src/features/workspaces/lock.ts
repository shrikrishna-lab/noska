import type { WorkspaceRow } from './service';

export function workspaceIndexById(rows: WorkspaceRow[], id: string | null): number {
  if (!id) return -1;
  return rows.findIndex(row => row.id === id);
}

export function isWorkspaceLockedByIndex(
  rows: WorkspaceRow[],
  id: string | null,
  limit: number | null,
): boolean {
  if (limit === null || limit === undefined) return false;
  if (!rows.length || !id) return false;
  const index = workspaceIndexById(rows, id);
  return index >= 0 && index >= limit;
}

export function lockedWorkspaceMessage(name?: string | null): string {
  const where = name ? `"${name}" is` : 'This workspace is';
  return `${where} locked and read-only (plan limit). Upgrade your plan to make changes — import and export still work.`;
}
