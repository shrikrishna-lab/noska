import { supabase } from '../../lib/supabase';
import type { Block } from '../../../types/blocks';
import type { VersionSnapshot } from './types';

export async function createVersion(pageId: string, userId: string, userName: string, blocks: Block[], title?: string, description?: string): Promise<VersionSnapshot | null> {
  // version_number is NOT NULL + unique per page — derive the next number
  // first (retry once if a concurrent insert wins the race on the unique index)
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: latest } = await supabase
      .from('page_versions')
      .select('version_number')
      .eq('page_id', pageId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = ((latest?.version_number as number | undefined) ?? 0) + 1;

    const { data, error } = await supabase
      .from('page_versions')
      .insert({
        page_id: pageId,
        version_number: nextVersion,
        user_id: userId,
        user_name: userName,
        blocks: JSON.parse(JSON.stringify(blocks)) as unknown,
        title: title || 'Version',
        description: description || null,
      } as any)
      .select()
      .single();

    if (!error) return data as unknown as VersionSnapshot;
    const isUniqueRace = typeof (error as { code?: string }).code === 'string' && (error as { code?: string }).code!.startsWith('23');
    if (attempt === 1 || !isUniqueRace) {
      console.warn('createVersion error:', error);
      return null;
    }
  }
  return null;
}

export async function getVersions(pageId: string, limit = 50, offset = 0): Promise<VersionSnapshot[]> {
  const { data, error } = await supabase
    .from('page_versions')
    .select('*')
    .eq('page_id', pageId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return [];
  return data as unknown as VersionSnapshot[];
}

export async function getVersionById(versionId: string): Promise<VersionSnapshot | null> {
  const { data, error } = await supabase
    .from('page_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error || !data) return null;
  return data as unknown as VersionSnapshot;
}

export async function deleteVersion(versionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('page_versions')
    .delete()
    .eq('id', versionId);

  return !error;
}

export function shouldAutoVersion(_blockChanges: { type: string }[]): boolean {
  if (_blockChanges.length === 0) return false;

  const hasStructuralChange = _blockChanges.some(c =>
    c.type === 'insert' || c.type === 'delete' || c.type === 'move'
  );
  if (hasStructuralChange) return true;

  const textEdits = _blockChanges.filter(c => c.type === 'update');
  if (textEdits.length >= 5) return true;

  return false;
}

let lastVersionTime = 0;
const VERSION_COOLDOWN = 10_000;

export function canCreateVersion(): boolean {
  const now = Date.now();
  if (now - lastVersionTime < VERSION_COOLDOWN) return false;
  lastVersionTime = now;
  return true;
}
