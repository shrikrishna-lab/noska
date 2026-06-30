import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionInput, SPRING_PRESETS } from "../features/motion/MotionSystem";
import {
  Bot,
  SlidersHorizontal,
  Inbox,
  CalendarDays,
  Settings,
  Sparkles,
  Table2,
  X,
  Search,
  MessageSquare,
  GripHorizontal,
  Trash2,
  ArchiveRestore,
  Lock,
  ChevronDown,
  CircleHelp,
  Link2,
  Globe
} from "lucide-react";
import { Modal, ModalHeader, IconButton, Field } from "./ui";
import { aiManager } from "../ai/AIManager";
import { getProviderList, testProviderConnection } from "../ai/providers";
import { getAgentList } from "../ai/agents";

export function SettingsModal({
  initialTab = "General",
  workspaceName,
  setWorkspaceName,
  theme,
  setTheme,
  themeFx,
  setThemeFx,
  apiKey,
  setApiKey,
  aiProvider,
  setAIProvider,
  nvidiaKey,
  setNvidiaKey,
  onReplayOnboarding,
  onLogout,
  onClose,
  ghostWriterEnabled,
  setGhostWriterEnabled
}) {
  const getUserName = () => window.realtimeCollab?.getUser?.()?.userName || 'Workspace User';
  const getUserEmail = () => window.realtimeCollab?.getUser?.()?.userId || 'user@workspace';
  const [tab, setTab] = useState(initialTab);
  const [peopleTab, setPeopleTab] = useState("Guests");
  const [members, setMembers] = useState([`${getUserName()} (Owner)`]);
  const [guests, setGuests] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [outlookConnected, setOutlookConnected] = useState(false);
  const [mcpServers, setMcpServers] = useState([]);
  const [teamspaces, setTeamspaces] = useState([]);

  React.useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);
  const [userName, setUserName] = useState(getUserName);
  const [userEmail, setUserEmail] = useState(getUserEmail);
  const [sidebarSide, setSidebarSide] = useState("Left");
  const [typography, setTypography] = useState("Sans-serif");
  const [compactMode, setCompactMode] = useState(false);
  const [notifsEmail, setNotifsEmail] = useState(true);
  const [notifsPush, setNotifsPush] = useState(false);
  const [notifsDigest, setNotifsDigest] = useState(true);
  const [googleCalConnected, setGoogleCalConnected] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [customEmojis, setCustomEmojis] = useState(["🚀", "🔥", "🎉", "💡", "🧠"]);
  const [newEmoji, setNewEmoji] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateFx = (patch) => setThemeFx({ ...themeFx, ...patch });

  const chooseGif = (gifType) => {
    const urls = {
      "1": "https://media.giphy.com/media/KBbr4hHl9DSahKvInO/giphy.gif?cid=790b76112m5eeeydoe7et0cr3j3ekb1erunxozyshuhxx2vl&ep=v1_stickers_search&rid=giphy.gif&ct=s",
      "2": "https://media.giphy.com/media/5PncuvcXbBuIZcSiQo/giphy.gif?cid=ecf05e47j7vdjtytp3fu84rslaivdun4zvfhej6wlvl6qqsz&ep=v1_stickers_search&rid=giphy.gif&ct=s",
      "3": "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3JwcXdzcHd5MW92NWprZXVpcTBtNXM5cG9obWh0N3I4NzFpaDE3byZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/WgsVx6C4N8tjy/giphy.gif"
    };
    updateFx({ gifType, gifUrl: urls[gifType] || themeFx.gifUrl });
  };

  const starts =
    themeFx.variant === "rectangle"
      ? ["bottom-up", "top-down", "left-right", "right-left"]
      : themeFx.variant === "polygon"
      ? ["top-left", "top-right"]
      : ["center", "top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"];

  const handleAddMember = async () => {
    const name = await window.noskaPrompt("Enter member name or email:", "", "Member Name/Email");
    if (name) {
      setMembers([...members, name]);
      setSaveStatus(`Added member: ${name}`);
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  const handleImportContacts = async () => {
    const email = await window.noskaPrompt("Enter email of the contact to import:", "", "user@example.com");
    if (email) {
      setContacts([...contacts, email]);
      setSaveStatus(`Imported contact: ${email}`);
      setTimeout(() => setSaveStatus(""), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 p-5 backdrop-blur-[8px] saturate-[120%] flex items-center justify-center"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="flex h-[calc(100vh-40px)] w-[980px] max-w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <aside className="w-[300px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)] p-5 overflow-y-auto scrollbar-thin">
          <div className="mb-6 text-sm font-semibold text-[var(--muted)]">Account</div>
          <SettingsNavItem icon={Bot} label={userName} active={tab === "Account"} onClick={() => setTab("Account")} />
          <SettingsNavItem icon={SlidersHorizontal} label="Preferences" active={tab === "Preferences"} onClick={() => setTab("Preferences")} />
          <SettingsNavItem icon={Inbox} label="Notifications" active={tab === "Notifications"} onClick={() => setTab("Notifications")} />
          <SettingsNavItem icon={CalendarDays} label="Mail & Calendar" active={tab === "Mail & Calendar"} onClick={() => setTab("Mail & Calendar")} />
          
          <div className="mb-3 mt-8 text-sm font-semibold text-[var(--muted)]">Workspace</div>
          {["General", "People", "Import"].map((item) => (
            <SettingsNavItem
              key={item}
              icon={item === "People" ? MessageSquare : Settings}
              label={item}
              active={tab === item}
              onClick={() => setTab(item)}
            />
          ))}
          
          <div className="mb-3 mt-8 text-sm font-semibold text-[var(--muted)]">Features</div>
          {["Noska AI", "Connections", "Noska MCP", "Public pages", "Emoji", "Offline"].map((item) => (
            <SettingsNavItem key={item} icon={Sparkles} label={item} active={tab === item} onClick={() => setTab(item)} />
          ))}
          
          <div className="mb-3 mt-8 text-sm font-semibold text-[var(--muted)]">Admin</div>
          <SettingsNavItem icon={Table2} label="Teamspaces" active={tab === "Teamspaces"} onClick={() => setTab("Teamspaces")} />
          
          <button
            onClick={() => setTab("Noska AI")}
            className="mt-8 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] font-semibold text-[var(--text)] hover:bg-[var(--hover)] transition"
          >
            <Sparkles size={16} />Get Noska AI
          </button>
        </aside>
        
        <main className="relative min-w-0 flex-1 overflow-y-auto p-12 scrollbar-thin bg-[var(--surface-2)] text-[var(--text)]">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-3)] text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text)] transition cursor-pointer"
          >
            <X size={18} />
          </button>
          
          {saveStatus && (
            <div className="absolute top-5 left-12 bg-[var(--accent)] text-white text-xs px-3 py-1.5 rounded shadow-lg">
              {saveStatus}
            </div>
          )}

          {tab === "People" && (
            <div className="mx-auto max-w-5xl">
              <h2 className="text-[32px] font-bold">People</h2>
              <div className="mt-3 text-sm text-[var(--secondary)]">
                Manage members and guest access settings for the workspace.
              </div>
              
              <div className="mt-8 flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex gap-4 text-sm font-semibold text-[var(--muted)]">
                  {["Guests", "Members", "Groups", "Contacts"].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setPeopleTab(sub)}
                      className={`pb-2 px-1 transition ${peopleTab === sub ? "border-b-2 border-[var(--text)] text-[var(--text)]" : "hover:text-[var(--text)]"}`}
                    >
                      {sub} {sub === "Members" ? `(${members.length})` : sub === "Guests" ? `(${guests.length})` : ""}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAddMember}
                    className="rounded-md bg-[var(--accent)] text-[var(--bg)] px-3 py-1.5 text-xs font-semibold hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(91,140,255,0.25)] active:scale-[0.98] transition cursor-pointer"
                  >
                    Add members
                  </button>
                  <button
                    onClick={handleImportContacts}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-4)] hover:text-[var(--text)] hover:-translate-y-px active:scale-[0.98] transition cursor-pointer"
                  >
                    Import contacts
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                {peopleTab === "Guests" && (
                  <div>
                    {guests.length === 0 ? (
                      <div className="grid h-48 place-items-center rounded border border-dashed border-[var(--border-strong)] text-center p-6">
                        <div>
                          <Bot size={24} className="mx-auto mb-2 text-[var(--secondary)]" />
                          <div className="font-bold text-sm">No guests in this space</div>
                          <button
                            onClick={async () => {
                              const g = await window.noskaPrompt("Enter guest email to invite:", "", "guest@example.com");
                              if (g) setGuests([...guests, g]);
                            }}
                            className="mt-3 rounded border border-[var(--border-strong)] px-3 py-1 text-xs hover:bg-[var(--hover)] transition"
                          >
                            Invite Guest
                </button>
              </div>
              <div className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--panel)] p-3">
                <div>
                  <div className="text-sm font-semibold text-rose-400">Log out</div>
                  <div className="text-xs text-[var(--muted)]">Sign out of your account</div>
                </div>
                <button
                  onClick={() => { onLogout?.(); onClose?.(); }}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Log out
                </button>
              </div>
            </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {guests.map((g, i) => (
                          <div key={i} className="flex justify-between items-center py-2">
                            <span className="text-sm font-medium">{g}</span>
                            <button
                              onClick={() => setGuests(guests.filter((_, idx) => idx !== i))}
                              className="text-rose-400 text-xs hover:underline"
                            >
                              Revoke
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {peopleTab === "Members" && (
                  <div className="divide-y divide-[var(--border)]">
                    {members.map((m, i) => (
                      <div key={i} className="flex justify-between items-center py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--text)]">
                            {m[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{m}</span>
                        </div>
                        <span className="text-xs text-[var(--muted)]">Workspace Member</span>
                      </div>
                    ))}
                  </div>
                )}

                {peopleTab === "Groups" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-[var(--muted)]">{groups.length} active user groups</p>
                      <button
                        onClick={async () => {
                          const g = await window.noskaPrompt("Enter group name:", "", "Group Name");
                          if (g && g.trim()) {
                            setGroups(prev => [...prev, g.trim()]);
                            setSaveStatus(`Group "${g.trim()}" created.`);
                            setTimeout(() => setSaveStatus(""), 2000);
                          }
                        }}
                        className="bg-[var(--surface)] text-[var(--text)] border border-[var(--border-strong)] px-3 py-1.5 rounded text-xs hover:bg-[var(--hover)] font-semibold transition"
                      >
                        + Create Group
                      </button>
                    </div>
                    {groups.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-[var(--border-strong)] rounded">
                        <p className="text-sm text-[var(--secondary)]">No user groups configured.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {groups.map((g, i) => (
                          <div key={i} className="flex justify-between items-center py-2 text-sm">
                            <span className="font-semibold text-[var(--text)]">{g}</span>
                            <button
                              onClick={() => {
                                setGroups(groups.filter((_, idx) => idx !== i));
                                setSaveStatus(`Group "${g}" deleted.`);
                                setTimeout(() => setSaveStatus(""), 2000);
                              }}
                              className="text-rose-400 hover:text-rose-400 text-xs font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {peopleTab === "Contacts" && (
                  <div>
                    {contacts.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No contacts imported yet.</p>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {contacts.map((c, i) => (
                          <div key={i} className="py-2 text-sm text-[var(--secondary)]">
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "Account" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Account Profile</h2>
              <Field label="Full Name">
                <MotionInput value={userName} onChange={(e) => setUserName(e.target.value)} />
              </Field>
              <Field label="Email Address">
                <MotionInput value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
              </Field>
              <button
                onClick={() => {
                  setSaveStatus("Profile updated");
                  setTimeout(() => setSaveStatus(""), 2000);
                }}
                className="bg-[var(--accent)] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-[var(--accent-deep)] transition"
              >
                Save Profile
              </button>
            </div>
          )}

          {tab === "Preferences" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Preferences</h2>
              <Field label="Sidebar Position">
                <select
                  value={sidebarSide}
                  onChange={(e) => setSidebarSide(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none"
                >
                  <option>Left</option>
                  <option>Right (Simulated)</option>
                </select>
              </Field>
              <Field label="Default Typography">
                <div className="flex gap-2">
                  {["Sans-serif", "Serif", "Mono"].map((tStyle) => (
                    <button
                      key={tStyle}
                      onClick={() => setTypography(tStyle)}
                      className={`px-3 py-1.5 rounded border text-xs ${typography === tStyle ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--hover)]"}`}
                    >
                      {tStyle}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 bg-[var(--surface)]">
                <div>
                  <div className="text-sm font-semibold">Compact Mode</div>
                  <div className="text-xs text-[var(--muted)]">Use tighter spacing for document layouts.</div>
                </div>
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>
            </div>
          )}

          {tab === "Notifications" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Notifications</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div>
                    <div className="text-sm font-medium">Email Alerts</div>
                    <div className="text-xs text-[var(--muted)]">Receive daily action item updates in your inbox.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifsEmail}
                    onChange={(e) => setNotifsEmail(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div>
                    <div className="text-sm font-medium">Desktop Push Notifications</div>
                    <div className="text-xs text-[var(--muted)]">Get browser notifications for urgent reminders.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifsPush}
                    onChange={(e) => setNotifsPush(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </div>
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <div className="text-sm font-medium">Weekly Activity Digest</div>
                    <div className="text-xs text-[var(--muted)]">Summarize all tasks and highlights weekly.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifsDigest}
                    onChange={(e) => setNotifsDigest(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "Mail & Calendar" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Calendar Integrations</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center rounded-lg border border-[var(--border)] p-4 bg-[var(--surface)]">
                  <div>
                    <div className="text-sm font-bold">Google Calendar</div>
                    <div className="text-xs text-[var(--muted)]">{googleCalConnected ? `Connected as ${userEmail}` : "Not connected"}</div>
                  </div>
                  <button
                    onClick={() => setGoogleCalConnected(!googleCalConnected)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${googleCalConnected ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"}`}
                  >
                    {googleCalConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>
                <div className="flex justify-between items-center rounded-lg border border-[var(--border)] p-4 bg-[var(--surface)]">
                  <div>
                    <div className="text-sm font-bold">Outlook / Microsoft 365</div>
                    <div className="text-xs text-[var(--muted)]">{outlookConnected ? `Connected as ${userEmail}` : "Sync with corporate Exchange accounts."}</div>
                  </div>
                  <button
                    onClick={() => {
                      setOutlookConnected(!outlookConnected);
                      setSaveStatus(outlookConnected ? "Outlook Calendar disconnected" : "Outlook Calendar connected");
                      setTimeout(() => setSaveStatus(""), 2000);
                    }}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${outlookConnected ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"}`}
                  >
                    {outlookConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "Import" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Import Data</h2>
              <p className="text-sm text-[var(--secondary)]">Bring content into Noska from external formats.</p>
              <div className="grid grid-cols-2 gap-4">
                {["Notion", "Confluence", "Evernote", "Markdown Files", "CSV Data"].map((src) => (
                  <button
                    key={src}
                    onClick={() => {
                      setSaveStatus(`Mock imported data from ${src}`);
                      setTimeout(() => setSaveStatus(""), 2000);
                    }}
                    className="flex flex-col items-start p-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-left hover:bg-[var(--hover)] transition"
                  >
                    <div className="text-sm font-bold text-[var(--text)]">{src}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">Import pages and databases.</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "Connections" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Connections</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
                  <div>
                    <div className="text-sm font-bold">GitHub integration</div>
                    <div className="text-xs text-[var(--muted)]">Link issues and pull requests to your workspace.</div>
                  </div>
                  <button
                    onClick={() => setGithubConnected(!githubConnected)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${githubConnected ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"}`}
                  >
                    {githubConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>
                <div className="flex justify-between items-center p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
                  <div>
                    <div className="text-sm font-bold">Slack notification sync</div>
                    <div className="text-xs text-[var(--muted)]">Send document activity summaries to Slack channels.</div>
                  </div>
                  <button
                    onClick={() => setSlackConnected(!slackConnected)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition ${slackConnected ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white"}`}
                  >
                    {slackConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "Noska MCP" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Model Context Protocol</h2>
              <p className="text-sm text-[var(--secondary)]">
                Connect external developer servers and tools to Noska AI for local context resolution.
              </p>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--panel)] text-[var(--secondary)] font-medium">
                    <tr>
                      <th className="p-3">Server Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {mcpServers.map((srv, idx) => (
                      <tr key={idx} className="hover:bg-[var(--hover)]">
                        <td className="p-3 font-semibold">{srv.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${srv.status === "Active" ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--surface)] text-[var(--muted)]"}`}>
                            {srv.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              const list = [...mcpServers];
                              list[idx].status = list[idx].status === "Active" ? "Inactive" : "Active";
                              setMcpServers(list);
                            }}
                            className="text-xs text-[var(--accent)] hover:underline"
                          >
                            Toggle Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={async () => {
                  const sName = await window.noskaPrompt("Enter new MCP server name:", "", "Server Name");
                  if (sName) {
                    setMcpServers([...mcpServers, { name: sName, status: "Inactive" }]);
                  }
                }}
                className="bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white text-xs px-3 py-1.5 rounded font-semibold transition"
              >
                + Add MCP Server
              </button>
            </div>
          )}

          {tab === "Public pages" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Public Pages</h2>
              <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-8 text-center text-[var(--secondary)]">
                No published pages in this workspace. Open the "Share" menu on any document and toggle "Publish to web" to share it publicly.
              </div>
            </div>
          )}

          {tab === "Emoji" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Custom Emojis</h2>
              <p className="text-sm text-[var(--secondary)]">Add custom reaction emojis for comments and co-thinking sessions.</p>
              <div className="flex flex-wrap gap-3">
                {customEmojis.map((em, idx) => (
                  <div key={idx} className="h-10 w-10 text-2xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center rounded-lg select-none relative group">
                    {em}
                    <button
                      onClick={() => setCustomEmojis(customEmojis.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full h-4 w-4 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 max-w-sm mt-4">
                <MotionInput
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  placeholder="Paste single emoji character"
                  maxLength={2}
                  className="flex-1"
                />
                <button
                  onClick={() => {
                    if (newEmoji.trim()) {
                      setCustomEmojis([...customEmojis, newEmoji.trim()]);
                      setNewEmoji("");
                    }
                  }}
                  className="bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white px-3 py-1.5 rounded text-xs font-semibold shrink-0 transition"
                >
                  + Add Custom
                </button>
              </div>
            </div>
          )}

          {tab === "Offline" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Offline Settings</h2>
              <p className="text-sm text-[var(--secondary)]">Configure offline caching size constraints and status.</p>
              <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--surface)] space-y-2">
                <div className="text-sm font-semibold">Local Storage Usage</div>
                <div className="text-xs text-[var(--muted)]">342 KB used of 50 MB local storage capacity (0.6%).</div>
              </div>
              <button
                onClick={() => {
                  setSaveStatus("Local offline cache cleared successfully.");
                  setTimeout(() => setSaveStatus(""), 2500);
                }}
                className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-2 rounded text-xs font-semibold hover:bg-rose-500/30"
              >
                Clear Local Cache
              </button>
            </div>
          )}

          {tab === "Teamspaces" && (
            <div className="max-w-xl space-y-6">
              <h2 className="text-[32px] font-bold">Teamspaces</h2>
              <p className="text-sm text-[var(--secondary)]">Configure and manage directory teamspaces.</p>
              <div className="space-y-2">
                {teamspaces.map((tName, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border border-[var(--border)] rounded-lg bg-[var(--surface)]">
                    <span className="text-sm font-semibold"># {tName}</span>
                    <button
                      onClick={() => setTeamspaces(teamspaces.filter((_, idx) => idx !== i))}
                      className="text-rose-400 text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  const t = await window.noskaPrompt("Enter new teamspace name:", "", "Teamspace Name");
                  if (t) setTeamspaces([...teamspaces, t.trim()]);
                }}
                className="bg-[var(--accent)] hover:bg-[var(--accent-deep)] text-white text-xs px-3 py-1.5 rounded font-semibold transition"
              >
                + Create Teamspace
              </button>
            </div>
          )}

          {tab === "General" && (
            <div className="max-w-3xl space-y-5">
              <h2 className="text-[32px] font-bold text-[var(--text)]">General</h2>
              <Field label="Workspace">
                <MotionInput
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </Field>
              <Field label="Theme">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 outline-none"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </Field>
              <div className="rounded border border-[var(--border)] bg-[var(--panel)] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold">Theme transition</div>
                  <GripHorizontal size={16} className="text-[var(--muted)]" />
                </div>
                <OptionChips
                  label="Variant"
                  value={themeFx.variant}
                  options={["circle", "rectangle", "gif", "polygon", "circle-blur"]}
                  onChange={(variant) =>
                    updateFx({ variant, start: variant === "rectangle" ? "bottom-up" : variant === "polygon" ? "top-left" : "center" })
                  }
                />
                <OptionChips
                  label="Blur"
                  value={themeFx.blur ? "on" : "off"}
                  options={["off", "on"]}
                  onChange={(value) => updateFx({ blur: value === "on" })}
                />
                {themeFx.variant !== "gif" && <OptionChips label="Start" value={themeFx.start} options={starts} onChange={(start) => updateFx({ start })} />}
              </div>
              <div className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--panel)] p-3">
                <div>
                  <div className="text-sm font-semibold">Replay onboarding</div>
                  <div className="text-xs text-[var(--muted)]">Go through the setup flow again</div>
                </div>
                <button
                  onClick={onReplayOnboarding}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition"
                >
                  Replay
                </button>
              </div>
            </div>
          )}
          {tab === "Noska AI" && (
            <NoskaAISettings
              apiKey={apiKey}
              setApiKey={setApiKey}
              aiProvider={aiProvider}
              setAIProvider={setAIProvider}
              nvidiaKey={nvidiaKey}
              setNvidiaKey={setNvidiaKey}
              ghostWriterEnabled={ghostWriterEnabled}
              setGhostWriterEnabled={setGhostWriterEnabled}
            />
          )}
        </main>
      </motion.div>
    </motion.div>
  );
}

function SettingsNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`mb-1 flex h-9 w-full items-center gap-3 rounded-md px-3 text-left font-semibold ${
        active ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
      }`}
    >
      <Icon size={17} />
      {label}
    </button>
  );
}

function OptionChips({ label, value, options, onChange }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3 text-sm">
      <div className="w-20 shrink-0 pt-1 text-[var(--muted)]">{label}</div>
      <div className="flex flex-wrap justify-end gap-1">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded px-2 py-1 text-xs transition ${
              value === option ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Noska AI Settings Component ────────────────────────────────────────────

function NoskaAISettings({
  apiKey, setApiKey,
  aiProvider, setAIProvider,
  nvidiaKey, setNvidiaKey,
  ghostWriterEnabled, setGhostWriterEnabled
}) {
  const [providerTests, setProviderTests] = React.useState({});
  const [testingId, setTestingId] = React.useState(null);
  const providerList = getProviderList();
  const agentList = getAgentList();
  const config = aiManager.getConfig();
  const [, forceUpdate] = React.useState(0);

  // Subscribe to AIManager config changes
  React.useEffect(() => {
    return aiManager.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  // Sync legacy states → AIManager when they change
  React.useEffect(() => {
    if (apiKey) aiManager.setProviderConfig("anthropic", { apiKey, enabled: true });
  }, [apiKey]);

  React.useEffect(() => {
    if (nvidiaKey) aiManager.setProviderConfig("nvidia", { apiKey: nvidiaKey, enabled: true });
  }, [nvidiaKey]);

  const handleKeyChange = (providerId, key) => {
    aiManager.setProviderConfig(providerId, { apiKey: key, enabled: true });
    // Also sync to legacy states for backward compat
    if (providerId === "anthropic") setApiKey(key);
    if (providerId === "nvidia") setNvidiaKey(key);
  };

  const handleSetActive = (providerId) => {
    const provider = providerList.find(p => p.id === providerId);
    aiManager.setActiveProvider(providerId, provider?.defaultModel);
    // Sync to legacy
    setAIProvider(providerId);
  };

  const handleTestConnection = async (providerId) => {
    setTestingId(providerId);
    const providerConfig = config.providers[providerId] || {};
    const result = await testProviderConnection(providerId, providerConfig);
    setProviderTests(prev => ({ ...prev, [providerId]: result }));
    setTestingId(null);
  };

  const currentConfig = aiManager.getConfig();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-[32px] font-bold text-[var(--text)]">Noska AI</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Configure AI providers, models, and workspace intelligence settings.</p>
      </div>

      {/* ─── Active Model ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">Active Model</div>
            <div className="text-lg font-bold text-[var(--text)]">{aiManager.getActiveModelName()}</div>
            <div className="text-xs text-[var(--secondary)] mt-0.5">via {aiManager.getActiveProviderName()}</div>
          </div>
          <div className={`h-3 w-3 rounded-full ${aiManager.isConfigured() ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "bg-amber-400"}`} />
        </div>
      </div>

      {/* ─── Provider Cards ───────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Providers</h3>
        <div className="space-y-2">
          {providerList.map((provider) => {
            const providerConfig = currentConfig.providers[provider.id] || {};
            const isActive = currentConfig.activeProvider === provider.id;
            const hasKey = !provider.requiresKey || Boolean(providerConfig.apiKey);
            const testResult = providerTests[provider.id];
            const isTesting = testingId === provider.id;

            return (
              <div
                key={provider.id}
                className={`rounded-xl border p-4 transition ${
                  isActive
                    ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    hasKey ? "bg-emerald-400" : "bg-[var(--muted)]"
                  }`} />

                  {/* Provider info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)]">{provider.name}</span>
                      <span className="rounded-full bg-[var(--hover)] px-2 py-0.5 text-[10px] text-[var(--muted)] font-medium uppercase">
                        {provider.type}
                      </span>
                      {isActive && (
                        <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] text-[var(--accent)] font-semibold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] mt-0.5">
                      {provider.models.length > 0
                        ? provider.models.map(m => m.name).join(", ")
                        : provider.hasDiscover ? "Auto-discover models" : "No models"
                      }
                    </div>
                  </div>

                  {/* Set Active button */}
                  {!isActive && hasKey && (
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition"
                    >
                      Use
                    </button>
                  )}
                </div>

                {/* API Key input */}
                {provider.requiresKey && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="password"
                      value={providerConfig.apiKey || ""}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                      placeholder={provider.keyPlaceholder || "API key..."}
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 transition"
                    />
                    <button
                      onClick={() => handleTestConnection(provider.id)}
                      disabled={!providerConfig.apiKey || isTesting}
                      className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--secondary)] hover:bg-[var(--hover)] transition disabled:opacity-40"
                    >
                      {isTesting ? "Testing..." : "Test"}
                    </button>
                  </div>
                )}

                {/* Local provider URL */}
                {!provider.requiresKey && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={providerConfig.baseUrl || ""}
                      onChange={(e) => aiManager.setProviderConfig(provider.id, { baseUrl: e.target.value })}
                      placeholder={`Endpoint URL (default: ${provider.id === "ollama" ? "http://localhost:11434" : "http://localhost:1234/v1"})`}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]/50 transition"
                    />
                  </div>
                )}

                {/* Test result */}
                {testResult && (
                  <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                    testResult.ok
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-300"
                  }`}>
                    {testResult.ok ? "✓ Connection successful" : `✗ ${testResult.error || "Connection failed"}`}
                  </div>
                )}

                {/* Model selector for active provider */}
                {isActive && provider.models.length > 1 && (
                  <div className="mt-3">
                    <select
                      value={currentConfig.activeModel || provider.defaultModel}
                      onChange={(e) => aiManager.setActiveProvider(provider.id, e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                    >
                      {provider.models.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name} ({Math.round(model.context / 1000)}k context)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Context Settings ─────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Context Injection</h3>
        <p className="text-xs text-[var(--muted)] mb-3">Control what workspace data is sent with each AI request.</p>
        <div className="space-y-2">
          {[
            { key: "includeCurrentPage", label: "Current page content", desc: "Send the active page's blocks and metadata" },
            { key: "includeRecentPages", label: "Recent pages", desc: "Include summaries of recently edited pages" },
            { key: "includeConnections", label: "Graph connections", desc: "Include backlinks and related pages" },
            { key: "includeTags", label: "Workspace tags", desc: "Send all workspace tags for context" }
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <div>
                <div className="text-sm font-medium text-[var(--text)]">{label}</div>
                <div className="text-xs text-[var(--muted)]">{desc}</div>
              </div>
              <input
                type="checkbox"
                checked={currentConfig.context?.[key] !== false}
                onChange={(e) => aiManager.configure({ context: { [key]: e.target.checked } })}
                className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Agents ───────────────────────────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">AI Agents</h3>
        <p className="text-xs text-[var(--muted)] mb-3">Specialized personas available in the AI panel.</p>
        <div className="grid grid-cols-2 gap-2">
          {agentList.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: agent.color }}>{agent.icon}</span>
                <span className="text-sm font-semibold text-[var(--text)]">{agent.name}</span>
              </div>
              <div className="text-[11px] text-[var(--muted)]">{agent.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Ghost Writer ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]">
        <div>
          <div className="text-sm font-semibold text-[var(--text)]">AI Ghost Writer</div>
          <div className="text-xs text-[var(--muted)]">Predict and suggest text inline as you pause typing.</div>
        </div>
        <input
          type="checkbox"
          checked={!!ghostWriterEnabled}
          onChange={(e) => setGhostWriterEnabled(e.target.checked)}
          className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
        />
      </div>
    </div>
  );
}

export function TrashModal({ pages, onClose, onRestore, onDelete }) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader icon={Trash2} title="Trash" onClose={onClose} />
      <div className="space-y-2 p-4">
        {pages.length === 0 && <div className="text-sm text-[var(--muted)]">Trash is empty.</div>}
        {pages.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded border border-[var(--border)] p-2">
            <span>{p.icon}</span>
            <span className="flex-1">
              <span className="block">{p.title}</span>
              {p.purgeAfter && (
                <span className="block text-[10px] text-[var(--muted)]">
                  Purges {new Date(p.purgeAfter).toLocaleDateString()}
                </span>
              )}
            </span>
            <IconButton icon={ArchiveRestore} label="Restore" onClick={() => onRestore(p.id)} />
            <IconButton icon={Trash2} label="Delete forever" onClick={() => onDelete(p.id)} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

const SHARE_INVITES_KEY = 'noska_share_invites';

function loadInvites() {
  try { return JSON.parse(localStorage.getItem(SHARE_INVITES_KEY) || '[]'); } catch { return []; }
}
function saveInvites(invites) {
  try { localStorage.setItem(SHARE_INVITES_KEY, JSON.stringify(invites)); } catch {}
}

export function ShareModal({ page, onClose, onToast }) {
  const [tab, setTab] = useState("share");
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState("Full access");
  const [invites, setInvites] = useState(loadInvites);
  const [generalAccess, setGeneralAccess] = useState("Only people invited");
  const [generalAccessOpen, setGeneralAccessOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  React.useEffect(() => { saveInvites(invites); }, [invites]);

  const currentUser = window.realtimeCollab?.getUser?.();
  const userName = currentUser?.userName || 'Workspace User';
  const userEmail = currentUser?.userId || 'local@workspace';

  const link = `noska.local/page/${page.id}`;

  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const sendInvite = () => {
    if (!email.trim()) return;
    const newInvites = email.split(',').map(e => e.trim()).filter(Boolean).map(e => ({
      email: e, role: access, invitedAt: new Date().toISOString(), pageId: page.id
    }));
    setInvites(prev => [...newInvites, ...prev]);
    setEmail("");
    onToast?.(`Invited ${newInvites.length} user${newInvites.length > 1 ? 's' : ''}`);
  };

  const removeInvite = (idx) => {
    setInvites(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 backdrop-blur-[6px] bg-black/30"
      onMouseDown={onClose}
    >
      <div className="relative mx-auto flex h-full max-w-5xl items-start justify-end px-6 pt-16" onMouseDown={(e) => e.stopPropagation()}>
        {importOpen && (
          <div className="absolute left-6 top-24 w-[300px] rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-floating)] fade-in">
            <button onClick={() => setImportOpen(false)} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-3)] cursor-pointer">
              <X size={14} />
            </button>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded bg-[var(--surface-3)] text-xs font-bold text-[var(--text)]">S</span>
              <span className="grid h-8 w-8 place-items-center rounded bg-[var(--surface-3)] text-xs font-bold text-[var(--text)]">G</span>
              <span className="grid h-8 w-8 place-items-center rounded bg-[var(--surface-3)] text-xs font-bold text-[var(--text)]">M</span>
            </div>
            <div className="pr-6 text-sm font-semibold leading-5 text-[var(--text)]">Import contacts from Google, Slack, or Microsoft</div>
            <div className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Collaborate faster by importing contacts from your favorite tools.</div>
            <div className="mt-4 flex justify-end gap-3 text-sm">
              <button onClick={() => setImportOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer">Not now</button>
              <button onClick={() => setImportOpen(false)} className="font-semibold text-[var(--text)] hover:underline cursor-pointer">Get started</button>
            </div>
          </div>
        )}
        <motion.div
          initial={{ y: -15, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0, scale: 0.96 }}
          transition={SPRING_PRESETS.soft}
          className="w-[420px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
        >
          <div className="flex border-b border-[var(--border-strong)] px-4">
            {["share", "publish"].map((item) => (
              <button
                key={item}
                onClick={() => setTab(item)}
                className={`border-b-2 px-3 py-3 text-sm font-medium capitalize ${
                  tab === item ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-[var(--secondary)] hover:text-[var(--text)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          {tab === "share" ? (
            <div className="p-4">
              <div className="flex gap-2">
                <MotionInput
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or group, separated by commas"
                  className="min-w-0 flex-1"
                />
                <button
                  disabled={!email.trim()}
                  onClick={sendInvite}
                  className="shrink-0 rounded-md bg-[var(--accent)] text-[var(--bg)] px-4 py-2 text-sm font-semibold hover:-translate-y-px active:scale-95 disabled:opacity-40 transition cursor-pointer"
                >
                  Invite
                </button>
              </div>
              {invites.length > 0 && (
                <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                  {invites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-[var(--text)]">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface-3)] text-[9px] font-bold">
                        {inv.email[0].toUpperCase()}
                      </span>
                      <span className="flex-1 truncate">{inv.email}</span>
                      <span className="text-[var(--muted)] text-[9px]">{inv.role}</span>
                      <button onClick={() => removeInvite(i)} className="text-rose-400 hover:text-rose-400 text-[9px]">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3 rounded-md py-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--text)]">
                  {userName[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text)]">{userName} (You)</div>
                  <div className="truncate text-xs text-[var(--text-secondary)]">{userEmail}</div>
                </div>
                <select
                  value={access}
                  onChange={(e) => setAccess(e.target.value)}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-3)] px-2 py-1.5 text-xs text-[var(--text)] outline-none cursor-pointer hover:bg-[var(--surface-4)] transition"
                >
                  {["Full access", "Can edit", "Can comment", "Can view"].map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 border-t border-[var(--border-strong)] pt-4">
                <div className="mb-2 text-xs font-medium text-[var(--secondary)]">General access</div>
                <button
                  onClick={() => setGeneralAccessOpen((open) => !open)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  <Lock size={15} className="text-[var(--secondary)]" />
                  <span className="flex-1">{generalAccess}</span>
                  <ChevronDown size={14} className={`text-[var(--secondary)] transition ${generalAccessOpen ? "rotate-180" : ""}`} />
                </button>
                {generalAccessOpen && (
                  <div className="mt-1 space-y-1 rounded-md border border-[var(--border-strong)] bg-[var(--bg)] p-1">
                    {["Only people invited", "Anyone with the link", "Public"].map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setGeneralAccess(option);
                          setGeneralAccessOpen(false);
                        }}
                        className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
                          generalAccess === option ? "bg-[var(--surface)] text-[var(--text)]" : "text-[var(--secondary)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <button className="flex items-center gap-1.5 text-xs text-[var(--secondary)] hover:text-[var(--text)]">
                  <CircleHelp size={14} />
                  Learn about sharing
                </button>
                <button onClick={copyLink} className="flex items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--hover)]">
                  <Link2 size={15} />
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4 text-sm text-[var(--secondary)]">
              <div className="text-[var(--text)]">Publish this page to the web</div>
              <p>Anyone with the public link can view this page. Publishing is off by default.</p>
              <button onClick={copyLink} className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-deep)] px-3 py-2 font-medium text-white transition">
                <Globe size={15} />
                Publish to web
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function HelpModal({ onClose }) {
  const [tab, setTab] = React.useState("shortcuts");
  const [ticketType, setTicketType] = React.useState("bug");
  const [ticketTitle, setTicketTitle] = React.useState("");
  const [ticketBody, setTicketBody] = React.useState("");
  const [ticketSubmitted, setTicketSubmitted] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const tabs = [
    { id: "start", label: "Getting Started", icon: "🚀" },
    { id: "shortcuts", label: "Shortcuts", icon: "⌨️" },
    { id: "ai", label: "AI Guide", icon: "✨" },
    { id: "canvas", label: "Canvas & Graph", icon: "🎨" },
    { id: "ticket", label: "Report / Request", icon: "🎫" }
  ];

  const shortcuts = [
    { category: "Navigation", items: [
      { keys: "Ctrl+K", desc: "Open Command Palette / Universal Search" },
      { keys: "Ctrl+N", desc: "Create new page" },
      { keys: "Ctrl+\\", desc: "Toggle sidebar" },
      { keys: "Ctrl+Shift+L", desc: "Toggle dark/light theme" },
      { keys: "Alt+Click", desc: "Open page in stacked column" }
    ]},
    { category: "Editing", items: [
      { keys: "/", desc: "Open block type menu (slash commands)" },
      { keys: "Enter", desc: "Create new block below" },
      { keys: "Backspace", desc: "Delete empty block" },
      { keys: "Tab", desc: "Indent list item" },
      { keys: "Shift+Tab", desc: "Outdent list item" },
      { keys: "Ctrl+Z", desc: "Undo last action" },
      { keys: "Ctrl+Y", desc: "Redo last action" },
      { keys: "Ctrl+D", desc: "Duplicate current block" }
    ]},
    { category: "Features", items: [
      { keys: "Ctrl+Shift+E", desc: "Export current page" },
      { keys: "Ctrl+Shift+C", desc: "Open Web Clipper" },
      { keys: "Ctrl+Shift+V", desc: "Voice Capture" },
      { keys: "Ctrl+Shift+R", desc: "Rename page" },
      { keys: "Ctrl+Shift+P", desc: "Move page" }
    ]}
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 p-5 backdrop-blur-[8px] saturate-[120%] flex items-center justify-center"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="flex h-[calc(100vh-80px)] w-[820px] max-w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow-modal)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Sidebar Tabs */}
        <aside className="w-[200px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-1 overflow-y-auto scrollbar-thin">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Learning Center</div>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all duration-150 ${
                tab === t.id
                  ? "bg-[var(--surface-3)] text-[var(--text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-3)]/60 hover:text-[var(--text)]"
              }`}
            >
              <span className="text-sm">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="relative min-w-0 flex-1 overflow-y-auto p-8 scrollbar-thin bg-[var(--surface-2)] text-[var(--text)]">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--active)] transition"
          >
            <X size={15} />
          </button>

          {tab === "start" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Welcome to Noska</h2>
              <p className="text-sm leading-relaxed text-[var(--secondary)]">
                Noska is your AI-powered workspace for thinking, writing, and organizing knowledge. Here's how to get started:
              </p>
              <div className="space-y-3 stagger-reveal">
                {[
                  { step: "1", title: "Create your first page", desc: "Click the + button in the sidebar or press Ctrl+N to create a new document." },
                  { step: "2", title: "Use slash commands", desc: "Type / in any block to access headings, lists, code blocks, databases, and more." },
                  { step: "3", title: "Configure AI", desc: "Go to Settings → Noska AI and add your NVIDIA or Claude API key to unlock AI features." },
                  { step: "4", title: "Explore stacked columns", desc: "Alt+Click any page to open it side-by-side with your current document." },
                  { step: "5", title: "Use spaced repetition", desc: "Add review cards to blocks and study them with the Spaced Repetition feature." },
                  { step: "6", title: "Try the Command Palette", desc: "Press Ctrl+K to search pages, run commands, or launch any feature instantly." }
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent)] text-white text-xs font-bold">{item.step}</div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-xs text-[var(--secondary)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "shortcuts" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Keyboard Shortcuts</h2>
              <p className="text-sm text-[var(--secondary)]">Master Noska with these keyboard shortcuts for lightning-fast navigation.</p>
              {shortcuts.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{group.category}</div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <div key={item.keys} className="flex items-center justify-between rounded-lg bg-[var(--panel)] px-3 py-2.5">
                        <span className="text-sm text-[var(--text)]">{item.desc}</span>
                        <kbd>{item.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "ai" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">AI Features Guide</h2>
              <p className="text-sm leading-relaxed text-[var(--secondary)]">
                Noska integrates AI throughout your workflow. Here's everything you can do:
              </p>
              <div className="space-y-3">
                {[
                  { title: "AI Chat Panel", icon: "💬", desc: "Open the AI sidebar to have conversations with YoYo, your AI assistant. Ask questions, brainstorm, or get help writing." },
                  { title: "Ghost Writer", icon: "👻", desc: "Enable in Settings → Noska AI. As you type, AI will suggest completions inline. Press Tab to accept, Escape to dismiss." },
                  { title: "Text Selection Actions", icon: "✨", desc: "Select any text in your editor to reveal contextual AI actions: Improve, Summarize, Explain, Create Tasks, or Translate." },
                  { title: "Voice Capture", icon: "🎙️", desc: "Click the microphone icon or press Ctrl+Shift+V to transcribe voice notes directly into your documents." },
                  { title: "Web Clipper", icon: "✂️", desc: "Use Ctrl+Shift+C to extract and save content from any URL directly into your workspace." },
                  { title: "AI Meeting Notes", icon: "📋", desc: "Create AI-structured meeting notes with agendas, action items, and follow-ups from the sidebar." }
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-xs text-[var(--secondary)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "canvas" && (
            <div className="space-y-6 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Canvas & Knowledge Graph</h2>
              <p className="text-sm leading-relaxed text-[var(--secondary)]">
                Noska includes powerful visual thinking tools beyond traditional documents.
              </p>
              <div className="space-y-3">
                {[
                  { title: "Canvas Mode", icon: "🖼️", desc: "Switch any page to Canvas view to create freeform visual layouts. Drag blocks, connect ideas, and build visual maps." },
                  { title: "Knowledge Graph", icon: "🔗", desc: "The graph view shows connections between your pages based on shared tags, backlinks, and content references." },
                  { title: "Database Blocks", icon: "📊", desc: "Use /database in any document to create inline databases with custom columns, filters, and sorting." },
                  { title: "Stacked Columns", icon: "📑", desc: "Alt+Click pages to open them side-by-side. Resize columns and work across multiple documents simultaneously." },
                  { title: "Note DNA", icon: "🧬", desc: "Every page tracks its full history timeline. View creation events, edits, and metadata from the Note DNA panel." }
                ].map((item) => (
                  <div key={item.title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">{item.title}</div>
                      <div className="text-xs text-[var(--secondary)] mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "ticket" && (
            <div className="space-y-5 max-w-lg">
              <h2 className="text-2xl font-bold text-[var(--text)]">Report Bug / Request Feature</h2>
              <p className="text-sm text-[var(--secondary)]">
                Help us improve Noska by submitting bug reports or feature requests.
              </p>

              {ticketSubmitted ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm font-semibold text-emerald-400">Ticket Submitted</div>
                  <div className="text-xs text-[var(--secondary)] mt-1">Thank you for your feedback! We'll review it shortly.</div>
                  <button
                    onClick={() => { setTicketSubmitted(false); setTicketTitle(""); setTicketBody(""); }}
                    className="mt-4 text-xs text-[var(--accent)] hover:underline"
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {[
                      { id: "bug", label: "🐛 Bug Report" },
                      { id: "feature", label: "💡 Feature Request" },
                      { id: "improvement", label: "🔧 Improvement" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setTicketType(opt.id)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          ticketType === opt.id
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--secondary)] hover:bg-[var(--hover)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Title</label>
                      <input
                        value={ticketTitle}
                        onChange={(e) => setTicketTitle(e.target.value)}
                        placeholder={ticketType === "bug" ? "Describe the issue briefly..." : "What feature would you like?"}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--muted)] mb-1.5">Details</label>
                      <textarea
                        value={ticketBody}
                        onChange={(e) => setTicketBody(e.target.value)}
                        placeholder={ticketType === "bug" ? "Steps to reproduce, expected vs actual behavior..." : "Describe the feature in detail, use cases..."}
                        rows={5}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm text-[var(--text)] outline-none resize-none placeholder:text-[var(--muted)]"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[var(--muted)]">
                        {ticketType === "bug" ? "🐛 Bug Report" : ticketType === "feature" ? "💡 Feature Request" : "🔧 Improvement"} · v3.0
                      </span>
                      <button
                        disabled={!ticketTitle.trim()}
                        onClick={() => setTicketSubmitted(true)}
                        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-deep)] disabled:opacity-40 transition"
                      >
                        Submit Ticket
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </motion.div>
    </motion.div>
  );
}

export function CustomDialog({ open, type, title, placeholder, defaultValue, onClose, onConfirm }) {
  const [value, setValue] = useState(defaultValue || "");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={SPRING_PRESETS.soft}
        className="w-[420px] rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-2)] p-6 shadow-2xl glass-modal text-[var(--text)]"
      >
        <h3 className="text-base font-bold mb-3">{title}</h3>
        {type === "prompt" && (
          <input
            type="text"
            className="w-full bg-[var(--input)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] mb-6 transition"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onConfirm(value);
              if (e.key === "Escape") onClose();
            }}
            autoFocus
          />
        )}
        {type === "confirm" && (
          <p className="text-sm text-[var(--text-secondary)] mb-6">Are you sure you want to proceed?</p>
        )}
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(type === "prompt" ? value : true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)] transition cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}
