import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, X, Check } from 'lucide-react';
import { auditEngine } from '../../lib/auditEngine';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner', desc: 'Full access, can manage everything' },
  { value: 'admin', label: 'Admin', desc: 'Can edit, manage collaborators, audit' },
  { value: 'editor', label: 'Editor', desc: 'Can view and edit content' },
  { value: 'commenter', label: 'Commenter', desc: 'Can view and comment only' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' }
];

function RoleBadge({ role }) {
  const colorMap = {
    owner: 'text-amber-400 bg-amber-400/10',
    admin: 'text-purple-400 bg-purple-400/10',
    editor: 'text-blue-400 bg-blue-400/10',
    commenter: 'text-green-400 bg-green-400/10',
    viewer: 'text-[var(--muted)] bg-[var(--surface-3)]'
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${colorMap[role] || colorMap.viewer}`}>
      {role}
    </span>
  );
}

export default function PermissionPanel({ pageId, onClose }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    auditEngine.getPermissions(pageId).then(perms => {
      setPermissions(perms);
      setLoading(false);
    });
  }, [pageId]);

  const handleAdd = async () => {
    if (!newUserId.trim() || !newUserName.trim()) return;
    setAdding(true);
    await auditEngine.setPermission(pageId, newUserId.trim(), newUserName.trim(), newRole);
    const perms = await auditEngine.getPermissions(pageId);
    setPermissions(perms);
    setNewUserId('');
    setNewUserName('');
    setNewRole('editor');
    setAdding(false);
  };

  const handleRemove = async (userId) => {
    await auditEngine.removePermission(pageId, userId);
    setPermissions(prev => prev.filter(p => p.user_id !== userId));
  };

  const handleRoleChange = async (userId, userName, role) => {
    await auditEngine.setPermission(pageId, userId, userName, role);
    setPermissions(prev => prev.map(p => p.user_id === userId ? { ...p, role } : p));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-[var(--muted)] text-xs">
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <Shield size={13} className="text-[var(--accent)]" />
          <span className="text-xs font-semibold text-[var(--text)]">Permissions</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)] text-[11px]">
            ✕
          </button>
        )}
      </div>

      <div className="px-3 py-2 border-b border-[var(--border)] space-y-1.5">
        <span className="text-[9px] font-medium text-[var(--muted)]">Add collaborator</span>
        <div className="flex gap-1">
          <input
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Name"
            className="flex-1 rounded bg-[var(--surface-3)] border border-[var(--border)] px-1.5 py-1 text-[10px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
          <input
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="User ID"
            className="flex-1 rounded bg-[var(--surface-3)] border border-[var(--border)] px-1.5 py-1 text-[10px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
        <div className="flex gap-1">
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded bg-[var(--surface-3)] border border-[var(--border)] px-1.5 py-1 text-[10px] text-[var(--text)] outline-none"
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !newUserId.trim() || !newUserName.trim()}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] bg-[var(--accent)] text-white disabled:opacity-40 transition"
          >
            <UserPlus size={10} />
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-[var(--border)]">
        {permissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--muted)]">
            <Shield size={20} className="opacity-40 mb-1" />
            <span className="text-[10px]">No collaborators yet</span>
          </div>
        ) : (
          permissions.map((perm) => (
            <div key={perm.id} className="flex items-center gap-2 px-3 py-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] border"
                style={{ borderColor: '#7c3aed40' }}
              >
                {'👤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[var(--text)]">{perm.user_name}</span>
                  <RoleBadge role={perm.role} />
                </div>
                <span className="text-[8px] text-[var(--muted)] truncate block">{perm.user_id}</span>
              </div>
              <select
                value={perm.role}
                onChange={(e) => handleRoleChange(perm.user_id, perm.user_name, e.target.value)}
                className="rounded bg-[var(--surface-3)] border border-[var(--border)] px-1 py-0.5 text-[9px] text-[var(--text)] outline-none"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value} disabled={r.value === 'owner' && perm.role === 'owner'}>
                    {r.label}
                  </option>
                ))}
              </select>
              {perm.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(perm.user_id)}
                  className="p-1 rounded text-[var(--muted)] hover:text-red-400 hover:bg-red-400/10 transition"
                  title="Remove collaborator"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
