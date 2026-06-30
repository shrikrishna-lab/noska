import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, Upload, Image, Video, DollarSign, Users, Settings, ExternalLink, Grid, BarChart3, ChevronLeft, Plus, Save } from "lucide-react";
import { uid } from "../../utils/helpers";

const TABS = [
  { id: 'listings', label: 'Listings', icon: Grid },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'payouts', label: 'Payouts', icon: DollarSign },
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function CreatorDashboard({ pages, onToast, onDuplicate }) {
  const [tab, setTab] = useState('listings');
  const [showPublish, setShowPublish] = useState(false);
  const [listings, setListings] = useState([]);

  const handlePublish = (listing) => {
    setListings(prev => [{ ...listing, id: uid(), status: 'draft', addCount: 0, createdAt: new Date().toISOString() }, ...prev]);
    setShowPublish(false);
    onToast?.('Template created as draft');
  };

  return (
    <div className="flex h-full bg-[var(--bg)]">
      {/* Left sidebar */}
      <div className="w-52 border-r border-[var(--border)] shrink-0 flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2"><Store size={16} className="text-[var(--accent)]" /> Creator Studio</h2>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition ${tab === t.id ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--hover)]'}`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-[var(--border)]">
          <button onClick={() => setShowPublish(true)} className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--accent)]/90 transition">
            <Plus size={13} /> New Template
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {showPublish ? (
            <PublishForm pages={pages} onPublish={handlePublish} onCancel={() => setShowPublish(false)} />
          ) : tab === 'listings' ? (
            <ListingsView listings={listings} onToast={onToast} />
          ) : tab === 'analytics' ? (
            <AnalyticsView listings={listings} />
          ) : tab === 'payouts' ? (
            <PayoutsView />
          ) : tab === 'profile' ? (
            <ProfileEditor onToast={onToast} />
          ) : (
            <SettingsView />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PublishForm({ pages, onPublish, onCancel }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'work', price: 0, sourcePageId: '', screenshots: [], videoUrl: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onPublish({ ...form, title: form.title.trim(), description: form.description.trim() });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onCancel} className="text-[var(--muted)] hover:text-[var(--text)]"><ChevronLeft size={16} /></button>
        <h2 className="text-lg font-semibold text-[var(--text)]">Publish to Marketplace</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Template Title</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly Planning Dashboard" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this template do?" rows={3} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none">
              <option value="work">Work</option><option value="life">Life</option><option value="school">School</option><option value="design">Design</option>
              <option value="productivity">Productivity</option><option value="writing">Writing</option><option value="finance">Finance</option>
              <option value="health">Health</option><option value="tech">Tech</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Price (USD)</label>
            <input value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} type="number" min="0" step="0.99" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Source Page</label>
          <select value={form.sourcePageId} onChange={e => setForm(f => ({ ...f, sourcePageId: e.target.value }))} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none">
            <option value="">Select a page...</option>
            {pages.filter(p => !p.trashed).map(p => (
              <option key={p.id} value={p.id}>{p.icon} {p.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-[10px] text-amber-400">Make sure all linked content is inside the template page tree. Pages linking to external content will be blocked from publishing.</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent)]/90 transition"><Save size={14} /> Create Draft</button>
          <button type="button" onClick={onCancel} className="text-xs text-[var(--muted)] hover:text-[var(--text)]">Cancel</button>
        </div>
      </form>
    </motion.div>
  );
}

function ListingsView({ listings, onToast }) {
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">My Listings ({listings.length})</h2>
      {listings.length === 0 ? (
        <div className="text-center py-12">
          <Store size={32} className="mx-auto text-[var(--muted)] mb-2" />
          <p className="text-xs text-[var(--muted)]">No templates yet. Click "New Template" to create your first listing.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map(l => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="h-10 w-14 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center text-lg">📄</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-[var(--text)]">{l.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-[var(--muted)] mt-0.5">
                  <span className="capitalize">{l.category}</span>
                  <span>·</span>
                  <span>{l.price === 0 ? 'Free' : `$${l.price.toFixed(2)}`}</span>
                  <span>·</span>
                  <span>{l.addCount} adds</span>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${l.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : l.status === 'draft' ? 'bg-amber-500/10 text-amber-400' : l.status === 'in_review' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>{l.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsView({ listings }) {
  const totalAdds = listings.reduce((sum, l) => sum + (l.addCount || 0), 0);
  const totalEarnings = listings.filter(l => l.status === 'published').reduce((sum, l) => sum + (l.price || 0) * (l.addCount || 0), 0);
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Analytics</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Adds', value: totalAdds, icon: Download },
          { label: 'Published', value: listings.filter(l => l.status === 'published').length, icon: Check },
          { label: 'Est. Earnings', value: `$${totalEarnings.toFixed(2)}`, icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1"><s.icon size={12} /> {s.label}</div>
            <div className="text-lg font-bold text-[var(--text)]">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">Per-Listing Stats</h4>
        {listings.length === 0 ? <p className="text-xs text-[var(--muted)]">No data</p> : listings.map(l => (
          <div key={l.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
            <span className="text-xs text-[var(--text)]">{l.title}</span>
            <span className="text-xs text-[var(--muted)]">{l.addCount} adds · ${((l.price || 0) * (l.addCount || 0)).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayoutsView() {
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Payouts</h2>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 mb-4">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-2">Payout Account</h4>
        <p className="text-xs text-[var(--muted)] mb-3">Connect a payout account to receive earnings from paid listings.</p>
        <button className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white">Connect Stripe</button>
        <p className="text-xs text-[var(--muted)] mt-3">Platform fee: 10% + $0.40 per transaction. Biweekly payouts with a 14-day hold. Minimum payout: $20.</p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">Payout History</h4>
        <p className="text-xs text-[var(--muted)]">No payouts yet.</p>
      </div>
    </div>
  );
}

function ProfileEditor({ onToast }) {
  const [profile, setProfile] = useState({ displayName: '', bio: '', photoUrl: '', coverUrl: '', links: [''] });
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Creator Profile</h2>
      <div className="max-w-xl space-y-4">
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Display Name</label>
          <input value={profile.displayName} onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} placeholder="Your brand name" className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Bio</label>
          <textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none resize-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Photo URL</label>
          <input value={profile.photoUrl} onChange={e => setProfile(p => ({ ...p, photoUrl: e.target.value }))} placeholder="https://..." className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--secondary)] mb-1 block">Cover URL</label>
          <input value={profile.coverUrl} onChange={e => setProfile(p => ({ ...p, coverUrl: e.target.value }))} placeholder="https://..." className="w-full rounded-lg bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text)] outline-none" />
        </div>
        <button onClick={() => { onToast?.('Profile saved'); }} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white"><Save size={13} /> Save Profile</button>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Creator Settings</h2>
      <div className="space-y-3 max-w-xl">
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Access Locking</h4>
            <p className="text-[10px] text-[var(--muted)]">Prevent buyers from re-exporting your template blocks</p>
          </div>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Buyer Email Capture</h4>
            <p className="text-[10px] text-[var(--muted)]">Collect buyer emails for newsletter</p>
          </div>
          <input type="checkbox" className="toggle" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <div>
            <h4 className="text-xs font-semibold text-[var(--text)]">Auto-email Notifications</h4>
            <p className="text-[10px] text-[var(--muted)]">Send emails on add/purchase/refund</p>
          </div>
          <input type="checkbox" defaultChecked className="toggle" />
        </div>
      </div>
    </div>
  );
}

function Check(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>; }
function Download(props) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
