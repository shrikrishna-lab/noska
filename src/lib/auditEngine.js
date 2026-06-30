import { supabase } from './supabase';

class AuditEngine {
  constructor() {
    this.cache = new Map();
    this.pending = [];
    this.flushTimer = null;
  }

  async log(event) {
    const entry = {
      page_id: event.pageId,
      block_id: event.blockId || null,
      user_id: event.userId,
      user_name: event.userName,
      action: event.action,
      block_type: event.blockType || null,
      content_before: event.contentBefore ? JSON.parse(JSON.stringify(event.contentBefore)) : null,
      content_after: event.contentAfter ? JSON.parse(JSON.stringify(event.contentAfter)) : null,
      detail: event.detail || null,
      ai_provider: event.aiProvider || null,
      ai_model: event.aiModel || null,
      ai_prompt_tokens: event.aiPromptTokens || 0,
      ai_completion_tokens: event.aiCompletionTokens || 0,
      ai_latency_ms: event.aiLatencyMs || 0,
      ai_tool_calls: event.aiToolCalls ? JSON.parse(JSON.stringify(event.aiToolCalls)) : null,
      ai_cost: event.aiCost || 0,
      ai_undo_ref: event.aiUndoRef || null
    };

    this.pending.push(entry);
    this._scheduleFlush();

    if (this.cache.has(event.pageId)) {
      this.cache.get(event.pageId).unshift(entry);
    }
  }

  _scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      await this._flushNow();
    }, 2000);
  }

  async _flushNow() {
    const batch = this.pending.splice(0, this.pending.length);
    if (batch.length === 0) return;
    try {
      const { error } = await supabase.from('audit_events').insert(batch);
      if (error) console.warn('Audit flush error:', error);
    } catch (e) {
      console.warn('Audit flush failed:', e);
    }
  }

  async getPageAudit(pageId, options = {}) {
    const cacheKey = `page:${pageId}`;
    let query = supabase.from('audit_events').select('*').eq('page_id', pageId).order('created_at', { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    if (options.action) query = query.eq('action', options.action);
    if (options.userId) query = query.eq('user_id', options.userId);
    if (options.since) query = query.gte('created_at', options.since);
    if (options.blockId) query = query.eq('block_id', options.blockId);
    if (options.search) {
      query = query.or(`detail.ilike.%${options.search}%,content_after->>text.ilike.%${options.search}%`);
    }

    try {
      const { data, error } = await query;
      if (error) throw error;
      this.cache.set(cacheKey, data || []);
      return data || [];
    } catch (e) {
      console.warn('Audit query failed:', e);
      return this.cache.get(cacheKey) || [];
    }
  }

  async getAIEvents(pageId, limit = 50) {
    try {
      const { data } = await supabase.from('audit_events')
        .select('*')
        .eq('page_id', pageId)
        .or('action.eq.ai_generated,action.eq.ai_edit')
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (e) {
      console.warn("auditEngine: getAIEvents failed", e);
      return [];
    }
  }

  async getBlockHistory(blockId, limit = 20) {
    try {
      const { data } = await supabase.from('audit_events')
        .select('*')
        .eq('block_id', blockId)
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (e) {
      console.warn("auditEngine: getBlockHistory failed", e);
      return [];
    }
  }

  async getAuditSummary(pageId) {
    try {
      const { data, error } = await supabase.from('audit_events')
        .select('action, created_at, user_id', { count: 'exact', head: false })
        .eq('page_id', pageId);
      if (error) throw error;
      const events = data || [];
      const last24h = events.filter(e => Date.now() - new Date(e.created_at).getTime() < 86400000).length;
      const byAction = {};
      const byUser = {};
      let aiCount = 0;
      for (const e of events) {
        byAction[e.action] = (byAction[e.action] || 0) + 1;
        byUser[e.user_id] = (byUser[e.user_id] || 0) + 1;
        if (e.action.startsWith('ai_')) aiCount++;
      }
      return { total: events.length, byAction, byUser, aiCount, last24h };
    } catch (e) {
      console.warn("auditEngine: getAuditSummary failed", e);
      return { total: 0, byAction: {}, byUser: {}, aiCount: 0, last24h: 0 };
    }
  }

  async restoreBlock(blockId, targetEventId) {
    try {
      const { data: event } = await supabase.from('audit_events')
        .select('*').eq('id', targetEventId).single();
      if (!event || !event.content_after) return null;
      return event.content_after;
    } catch (e) {
      console.warn("auditEngine: restoreBlock failed", e);
      return null;
    }
  }

  async getPageVersions(pageId) {
    try {
      const { data } = await supabase.from('page_versions')
        .select('*').eq('page_id', pageId)
        .order('version_number', { ascending: false }).limit(50);
      return data || [];
    } catch (e) {
      console.warn("auditEngine: getPageVersions failed", e);
      return [];
    }
  }

  async saveVersion(pageId, title, blocks, userId, userName, description) {
    try {
      const { data: maxVer } = await supabase.from('page_versions')
        .select('version_number').eq('page_id', pageId)
        .order('version_number', { ascending: false }).limit(1);
      const versionNumber = (maxVer?.[0]?.version_number || 0) + 1;

      const { error } = await supabase.from('page_versions').insert({
        page_id: pageId,
        version_number: versionNumber,
        title,
        blocks: blocks,
        page_snapshot: { blocks, title },
        user_id: userId,
        user_name: userName,
        description: description || `Version ${versionNumber}`
      });
      if (error) throw error;
      return versionNumber;
    } catch (e) {
      console.warn('Save version failed:', e);
      return null;
    }
  }

  async restoreVersion(pageId, versionId) {
    try {
      const { data: version } = await supabase.from('page_versions')
        .select('*').eq('id', versionId).single();
      if (!version) return null;
      return { blocks: version.blocks, title: version.title, pageSnapshot: version.page_snapshot };
    } catch (e) {
      console.warn("auditEngine: restoreVersion failed", e);
      return null;
    }
  }

  async getPermissions(pageId) {
    try {
      const { data } = await supabase.from('page_permissions')
        .select('*').eq('page_id', pageId);
      return data || [];
    } catch (e) {
      console.warn("auditEngine: getPermissions failed", e);
      return [];
    }
  }

  async setPermission(pageId, userId, userName, role, options = {}) {
    try {
      const defaults = {
        owner: { can_view: true, can_edit: true, can_comment: true, can_share: true, can_delete: true, can_audit: true, can_manage_collaborators: true, can_export: true, can_use_ai: true },
        admin: { can_view: true, can_edit: true, can_comment: true, can_share: true, can_delete: true, can_audit: true, can_manage_collaborators: true, can_export: true, can_use_ai: true },
        editor: { can_view: true, can_edit: true, can_comment: true, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: true, can_use_ai: true },
        commenter: { can_view: true, can_edit: false, can_comment: true, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: false, can_use_ai: false },
        viewer: { can_view: true, can_edit: false, can_comment: false, can_share: false, can_delete: false, can_audit: false, can_manage_collaborators: false, can_export: false, can_use_ai: false }
      };
      const perms = defaults[role] || defaults.editor;

      const { error } = await supabase.from('page_permissions').upsert({
        page_id: pageId,
        user_id: userId,
        user_name: userName,
        role,
        ...perms,
        ...options
      }, { onConflict: 'page_id,user_id' });
      if (error) throw error;

      await this.log({
        pageId, userId: userId, userName: userName,
        action: 'permission_change',
        detail: `Set role "${role}" for ${userName}`
      });
    } catch (e) {
      console.warn('Set permission failed:', e);
    }
  }

  async removePermission(pageId, userId) {
    try {
      await supabase.from('page_permissions').delete().eq('page_id', pageId).eq('user_id', userId);
    } catch (e) { console.warn("auditEngine: removePermission failed", e); }
  }
}

const auditInstance = new AuditEngine();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { auditInstance._flushNow(); });
}

export const auditEngine = auditInstance;
