import React, { useState, useEffect } from 'react';
import { Users, Share2, Copy, Check } from 'lucide-react';
import { realtimeCollab } from '../../lib/realtimeCollab';

export default function WorkspaceJoinBar({ onOpenSettings }) {
  const [joined, setJoined] = useState(realtimeCollab.isJoined());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub1 = realtimeCollab.on('workspace:join', () => setJoined(true));
    const unsub2 = realtimeCollab.on('workspace:leave', () => setJoined(false));
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleJoin = () => {
    realtimeCollab.joinWorkspace();
    setJoined(true);
  };

  const handleLeave = () => {
    realtimeCollab.leaveWorkspace();
    setJoined(false);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { console.warn("WorkspaceJoinBar: failed to copy link"); }
  };

  if (joined) {
    return (
      <button
        onClick={handleLeave}
        className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 hover:bg-[var(--hover)] px-2 py-1 text-[10px] text-[var(--text-secondary)] transition group"
        title="Leave collaboration workspace"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
        <Users size={10} />
        <span>Online</span>
        <span className="text-[9px] text-[var(--muted)] ml-0.5">· Leave</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleJoin}
        className="flex items-center gap-1 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/8 hover:bg-[var(--accent)]/15 px-2 py-1 text-[10px] text-[var(--accent)] transition"
      >
        <Share2 size={10} />
        <span>Join Collaboration</span>
      </button>
      <button
        onClick={handleCopyLink}
        className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)] transition"
        title="Copy workspace link to invite others"
      >
        {copied ? <Check size={10} className="text-[var(--success)]" /> : <Copy size={10} />}
      </button>
    </div>
  );
}
