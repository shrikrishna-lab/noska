import React, { useState } from 'react';
import { Users } from 'lucide-react';

function getStatusIcon(status) {
  switch (status) {
    case 'editing': return '✏️';
    case 'idle': return '💤';
    default: return '👁️';
  }
}

function getStatusLabel(status) {
  switch (status) {
    case 'editing': return 'Editing';
    case 'idle': return 'Idle';
    default: return 'Viewing';
  }
}

export default function CollabPresenceBar({ users = [], ownStatus = 'viewing', pageId, onStatusChange }) {
  const [showPicker, setShowPicker] = useState(false);
  const allUsers = users;
  const onlineCount = allUsers.filter(u => u.status !== 'idle').length + 1;

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm shadow-sm">
      <Users size={12} className="text-[var(--muted)] shrink-0" />
      <div className="flex -space-x-1">
        {allUsers.slice(0, 5).map((u) => (
          <span
            key={u.userId || u.id}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] border-2 border-[var(--surface)] relative"
            style={{ backgroundColor: u.userColor + '20', borderColor: u.userColor }}
            title={`${u.userName} — ${getStatusLabel(u.status)}`}
          >
            {u.userAvatar || '👤'}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--surface)] ${
                u.status === 'editing' ? 'bg-emerald-400' : u.status === 'idle' ? 'bg-amber-400' : 'bg-blue-400'
              }`}
            />
          </span>
        ))}
        {allUsers.length > 5 && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] bg-[var(--surface-3)] text-[var(--muted)] border border-[var(--border)]">
            +{allUsers.length - 5}
          </span>
        )}
      </div>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-[10px] text-[var(--muted)] hover:text-[var(--text-secondary)] transition shrink-0 cursor-pointer"
        title="Change status"
      >
        {onlineCount} online
      </button>
      {showPicker && onStatusChange && (
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-[var(--border)]">
          {['viewing', 'editing', 'idle'].map((s) => (
            <button
              key={s}
              onClick={() => { onStatusChange(s); setShowPicker(false); }}
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition ${
                ownStatus === s
                  ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover)]'
              }`}
              title={`Set status: ${getStatusLabel(s)}`}
            >
              {getStatusIcon(s)} {getStatusLabel(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
