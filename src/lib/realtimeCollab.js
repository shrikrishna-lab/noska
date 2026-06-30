import { supabase } from './supabase';

class RealtimeCollab {
  constructor() {
    this.channels = new Map();
    this.userId = null;
    this.userName = null;
    this.userAvatar = null;
    this.userColor = null;
    this.listeners = new Map();
    this._joinedWorkspace = false;
  }

  static _getColor(id) {
    const colors = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  }

  initUser(userId, userName, userAvatar) {
    this.userId = userId || `anon-${Math.random().toString(36).slice(2, 11)}`;
    this.userName = userName || 'Anonymous';
    this.userAvatar = userAvatar || '👤';
    this.userColor = RealtimeCollab._getColor(this.userId);
    const stored = localStorage.getItem('noska_workspace_joined');
    this._joinedWorkspace = stored === 'true';
  }

  getUser() {
    return { userId: this.userId, userName: this.userName, userAvatar: this.userAvatar, userColor: this.userColor };
  }

  isJoined() { return this._joinedWorkspace; }

  joinWorkspace() {
    this._joinedWorkspace = true;
    localStorage.setItem('noska_workspace_joined', 'true');
    this._emit('workspace:join', {});
  }

  leaveWorkspace() {
    this._joinedWorkspace = false;
    localStorage.setItem('noska_workspace_joined', 'false');
    this.destroy();
    this._emit('workspace:leave', {});
  }

  _channel(key) { return this.channels.get(key); }
  _setChannel(key, ch) { this.channels.set(key, ch); }
  _delChannel(key) {
    const ch = this.channels.get(key);
    if (ch) { supabase.removeChannel(ch); }
    this.channels.delete(key);
  }

  on(event, cb) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  _emit(event, data) { this.listeners.get(event)?.forEach(cb => { try { cb(data); } catch (e) { console.warn("realtimeCollab: listener error", e); } }); }

  joinPage(pageId) {
    if (!this._joinedWorkspace) return;
    if (this._channel(`presence:${pageId}`) || this._channel(`broadcast:${pageId}`)) return;

    const pres = supabase.channel(`presence:${pageId}`, {
      config: { presence: { key: this.userId } }
    });

    pres.on('presence', { event: 'sync' }, () => {
      const state = pres.presenceState();
      const users = Object.entries(state).map(([id, sessions]) => ({ id, ...sessions[0] }));
      this._emit('presence:sync', { pageId, users });
    });

    pres.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      this._emit('presence:join', { pageId, user: { id: key, ...newPresences[0] } });
    });

    pres.on('presence', { event: 'leave' }, ({ key }) => {
      this._emit('presence:leave', { pageId, userId: key });
      this._emit('cursor:remove', { pageId, userId: key });
    });

    pres.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try {
          await pres.track({
            userId: this.userId,
            userName: this.userName,
            userAvatar: this.userAvatar,
            userColor: this.userColor,
            pageId,
            status: 'viewing',
            onlineAt: Date.now()
          });
        } catch (e) { console.warn("realtimeCollab: track failed", e); }
      }
    });

    this._setChannel(`presence:${pageId}`, pres);

    const bc = supabase.channel(`broadcast:${pageId}`);

    bc.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('cursor:move', { pageId, ...payload });
    });

    bc.on('broadcast', { event: 'selection' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('selection:change', { pageId, ...payload });
    });

    bc.on('broadcast', { event: 'block:edit' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('block:edit', { pageId, ...payload });
    });

    bc.on('broadcast', { event: 'block:edit-stop' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('block:edit-stop', { pageId, ...payload });
    });

    bc.on('broadcast', { event: 'canvas:node-move' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('canvas:node-move', { pageId, ...payload });
    });

    bc.on('broadcast', { event: 'canvas:transform' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('canvas:transform', { pageId, ...payload });
    });

    bc.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== this.userId) this._emit('typing', { pageId, ...payload });
    });

    bc.subscribe((status) => {
      if (status === 'SUBSCRIBED') return;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`realtimeCollab: broadcast channel ${pageId} subscription failed: ${status}`);
      }
    });
    this._setChannel(`broadcast:${pageId}`, bc);
  }

  leavePage(pageId) {
    this._delChannel(`presence:${pageId}`);
    this._delChannel(`broadcast:${pageId}`);
  }

  async updateStatus(pageId, status, blockId = null) {
    const ch = this._channel(`presence:${pageId}`);
    if (!ch) return;
    try {
      await ch.track({
        userId: this.userId,
        userName: this.userName,
        userAvatar: this.userAvatar,
        userColor: this.userColor,
        pageId,
        status,
        currentBlockId: blockId,
        onlineAt: Date.now()
      });
    } catch (e) { console.warn("realtimeCollab: status track failed", e); }
  }

  sendCursor(pageId, x, y, targetBlockId = null) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        userId: this.userId,
        userName: this.userName,
        userAvatar: this.userAvatar,
        userColor: this.userColor,
        x, y,
        targetBlockId,
        timestamp: Date.now()
      }
    }).catch((e) => { console.warn("realtimeCollab: sendCursor failed", e); });
  }

  sendSelection(pageId, range) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'selection',
      payload: {
        userId: this.userId,
        userName: this.userName,
        userColor: this.userColor,
        blockId: range?.blockId,
        startOffset: range?.startOffset,
        endOffset: range?.endOffset,
        text: range?.text,
        timestamp: Date.now()
      }
    }).catch((e) => { console.warn("realtimeCollab: sendSelection failed", e); });
  }

  sendBlockEdit(pageId, blockId) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'block:edit',
      payload: { userId: this.userId, userName: this.userName, userColor: this.userColor, blockId, timestamp: Date.now() }
    }).catch((e) => { console.warn("realtimeCollab: sendBlockEdit failed", e); });
  }

  sendBlockEditStop(pageId, blockId) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'block:edit-stop',
      payload: { userId: this.userId, blockId, timestamp: Date.now() }
    }).catch((e) => { console.warn("realtimeCollab: sendBlockEditStop failed", e); });
  }

  sendCanvasNodeMove(pageId, nodeId, x, y) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'canvas:node-move',
      payload: { userId: this.userId, userName: this.userName, userColor: this.userColor, nodeId, x, y, timestamp: Date.now() }
    }).catch((e) => { console.warn("realtimeCollab: sendCanvasNodeMove failed", e); });
  }

  sendCanvasTransform(pageId, zoom, panX, panY) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'canvas:transform',
      payload: { userId: this.userId, zoom, panX, panY, timestamp: Date.now() }
    }).catch((e) => { console.warn("realtimeCollab: sendCanvasTransform failed", e); });
  }

  sendTyping(pageId) {
    const ch = this._channel(`broadcast:${pageId}`);
    if (!ch) return;
    ch.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: this.userId, userName: this.userName, pageId, timestamp: Date.now() }
    }).catch((e) => { console.warn("realtimeCollab: sendTyping failed", e); });
  }

  destroy() {
    for (const key of this.channels.keys()) this._delChannel(key);
    this.channels.clear();
    this.listeners.clear();
  }
}

export const realtimeCollab = new RealtimeCollab();
