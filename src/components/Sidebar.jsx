import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { SPRING_PRESETS, StaggerContainer, StaggerItem } from "../features/motion/MotionSystem";
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Terminal,
  Star,
  Users,
  X,
  LogOut,
  Settings
} from "lucide-react";
import {
  AnimatedMenu,
  AnimatedSidebar,
  AnimatedBack,
  AnimatedForward,
  AnimatedCanvas,
  AnimatedPlus,
  AnimatedSearch,
  AnimatedFolder,
  AnimatedAI,
  AnimatedHistory,
  AnimatedBell,
  AnimatedVoice,
  AnimatedCheck,
  AnimatedSparkle,
  AnimatedBookmark,
  AnimatedTrash,
  AnimatedSend,
  AnimatedUpload,
  AnimatedDownload
} from "./ui/icons";
import { IconButton, FloatingMenu, useOutsideDismiss } from "./ui";
import { timeAgo, plainText } from "../utils/helpers";
import PageTree from "./PageTree";

export default function Sidebar({
  open,
  pages,
  trashCount,
  activeId,
  workspaceName,
  setWorkspaceName,
  onToggle,
  onSelect,
  onNew,
  onSearch,
  onTrash,
  onSettings,
  onAI,
  onAIFull,
  onHelp,
  onView,
  onPrev,
  onNext,
  onPatchPage,
  onMovePage,
  onDuplicatePage,
  onAddInside,
  onRenamePage,
  onRemoveFromRecents,
  onToggleOffline,
  onCopyLink,
  onTrashPage,
  collapsedPages,
  onToggleCollapse,
  onReview,
  onAPI,
  theme,
  onThemeChange,
  appView,
  // Upgraded click interaction props
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  pageMode,
  onPageModeChange,
  onExport,
  onShare,
  onToast,
  onLogout
}) {
  const recents = [...pages]
    .filter((p) => !p.hiddenFromRecents)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const SIDEBAR_STORAGE_KEY = 'noska_sidebar_data';
  const loadSidebarData = () => {
    try {
      const data = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  };
  const saveSidebarData = (data) => {
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(data)); } catch {}
  };

  const defaultUser = () => {
    const u = window.realtimeCollab?.getUser?.();
    return u?.userName || 'Workspace User';
  };
  const defaultEmail = () => {
    const u = window.realtimeCollab?.getUser?.();
    return u?.userId || 'user@workspace';
  };
  const defaultAvatar = () => {
    const u = window.realtimeCollab?.getUser?.();
    return u?.userAvatar || '👤';
  };
  const defaultData = {
    workspaces: [`${defaultUser()}'s Workspace`],
    accounts: [{ name: defaultUser(), email: defaultEmail(), avatar: defaultAvatar(), active: true }]
  };

  const initialData = loadSidebarData() || defaultData;
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [workspaces, setWorkspaces] = useState(initialData.workspaces);
  const [accounts, setAccounts] = useState(initialData.accounts);
  const activeAccount = accounts.find(a => a.active) || accounts[0];

  // Click-outside references
  const logoRef = useRef(null);
  const switcherRef = useRef(null);
  const userRef = useRef(null);
  const appMenuRef = useOutsideDismiss(appMenuOpen, () => setAppMenuOpen(false));
  const switcherMenuRef = useOutsideDismiss(switcherOpen, () => setSwitcherOpen(false));

  // Anchor and Beam Coordinate states
  const [logoCoords, setLogoCoords] = useState({ top: 0, left: 0 });
  const [switcherCoords, setSwitcherCoords] = useState({ top: 0, left: 0 });
  const [beamCoords, setBeamCoords] = useState(null);

  // Keyboard navigation items and states
  const menuCategories = ["File", "Edit", "View", "History", "Window", "Help"];
  const [focusedCatIndex, setFocusedCatIndex] = useState(0);
  const [focusedSubIndex, setFocusedSubIndex] = useState(-1);
  const [keyboardActive, setKeyboardActive] = useState(false);

  // App menu actions mapping
  const appMenuItems = {
    File: [
      { label: "New Page", shortcut: "Ctrl+N", action: () => onNew("blank") },
      { label: "Import...", action: () => onSettings("Import") },
      { label: "Export Page...", action: () => onExport?.() },
      { label: "Settings...", action: () => onSettings("General") }
    ],
    Edit: [
      { label: "Undo", shortcut: "Ctrl+Z", action: () => onUndo?.(), disabled: !canUndo },
      { label: "Redo", shortcut: "Ctrl+Y", action: () => onRedo?.(), disabled: !canRedo }
    ],
    View: [
      { label: "Toggle Sidebar", shortcut: "Ctrl+\\", action: () => onToggle() },
      { label: "Document Mode", action: () => onPageModeChange?.("doc"), checked: pageMode === "doc" },
      { label: "Canvas Mode", action: () => onPageModeChange?.("canvas"), checked: pageMode === "canvas" },
      { label: "Graph Mode", action: () => onPageModeChange?.("graph"), checked: pageMode === "graph" },
      { label: "Toggle AI Panel", action: () => onAI() }
    ],
    History: [
      { label: "Go Back", shortcut: "Alt+Left", action: () => onPrev() },
      { label: "Go Forward", shortcut: "Alt+Right", action: () => onNext() },
      { label: "Search Workspace", shortcut: "Ctrl+K", action: () => onSearch() }
    ],
    Window: [
      { label: "Minimize", action: () => onToast?.("Minimized window (simulated). Add to home screen for desktop integration.") },
      { label: "Close Tab", action: async () => { if (await window.noskaConfirm("Close this workspace tab?")) window.close(); } }
    ],
    Help: [
      { label: "Help Center", action: () => onHelp() },
      { label: "Developer API Console", action: () => onAPI() }
    ]
  };

  // Coords and Beam coordinates hooks
  useEffect(() => {
    if (appMenuOpen && logoRef.current) {
      const rect = logoRef.current.getBoundingClientRect();
      setLogoCoords({
        top: rect.bottom + 6,
        left: rect.left
      });
      setBeamCoords({
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        endX: rect.left,
        endY: rect.bottom + 6
      });
    }
  }, [appMenuOpen]);

  useEffect(() => {
    if (switcherOpen && switcherRef.current) {
      const rect = switcherRef.current.getBoundingClientRect();
      setSwitcherCoords({
        top: rect.bottom + 6,
        left: rect.left
      });
      setBeamCoords({
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
        endX: rect.left,
        endY: rect.bottom + 6
      });
    }
  }, [switcherOpen]);

  useEffect(() => {
    if (!appMenuOpen && !switcherOpen) {
      setBeamCoords(null);
    }
  }, [appMenuOpen, switcherOpen]);

  // Hybrid mouse-keyboard menu navigation handler
  useEffect(() => {
    const handleMouseMove = () => {
      setKeyboardActive(false);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Keyboard navigation listener for Logo dropdown menu
  useEffect(() => {
    if (!appMenuOpen) {
      setFocusedCatIndex(0);
      setFocusedSubIndex(-1);
      setActiveSubmenu(null);
      return;
    }

    const handleKeyDown = (e) => {
      setKeyboardActive(true);
      const activeCat = menuCategories[focusedCatIndex];
      const subItems = appMenuItems[activeCat] || [];

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeSubmenu) {
          setFocusedSubIndex((prev) => (prev + 1) % subItems.length);
        } else {
          setFocusedCatIndex((prev) => (prev + 1) % menuCategories.length);
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeSubmenu) {
          setFocusedSubIndex((prev) => (prev - 1 + subItems.length) % subItems.length);
        } else {
          setFocusedCatIndex((prev) => (prev - 1 + menuCategories.length) % menuCategories.length);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!activeSubmenu) {
          setActiveSubmenu(activeCat);
          setFocusedSubIndex(0);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeSubmenu) {
          setActiveSubmenu(null);
          setFocusedSubIndex(-1);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setAppMenuOpen(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeSubmenu && focusedSubIndex >= 0) {
          const item = subItems[focusedSubIndex];
          if (item && !item.disabled) {
            item.action();
            setAppMenuOpen(false);
          }
        } else {
          setActiveSubmenu(activeCat);
          setFocusedSubIndex(0);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appMenuOpen, focusedCatIndex, focusedSubIndex, activeSubmenu]);

  // Persist workspaces and accounts to localStorage
  useEffect(() => { saveSidebarData({ workspaces, accounts }); }, [workspaces, accounts]);

  // Escape key global hook
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.key === "Escape") {
        setAppMenuOpen(false);
        setSwitcherOpen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  const handleCategoryHover = (cat, index) => {
    if (!keyboardActive) {
      setFocusedCatIndex(index);
      setActiveSubmenu(cat);
      setFocusedSubIndex(-1);
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{
        width: open ? 240 : 0,
        opacity: open ? 1 : 0
      }}
      transition={SPRING_PRESETS.soft}
      className="flex h-full shrink-0 flex-col bg-[var(--sidebar)] border-r border-[var(--border)] text-[var(--text)] overflow-hidden"
    >
      <div style={{ width: 240 }} className="flex h-full flex-col">
        
        {/* Workspace Title Header (Unified Selector) */}
        <div className="flex h-14 items-center justify-between gap-1 px-3 border-b border-[var(--border)] select-none shrink-0 bg-[var(--sidebar)]">
          <button
            ref={switcherRef}
            onClick={() => {
              if (switcherRef.current) {
                const r = switcherRef.current.getBoundingClientRect();
                setSwitcherCoords({ top: r.bottom + 6, left: r.left });
              }
              setSwitcherOpen(o => !o);
              setAppMenuOpen(false);
            }}
            className="flex-grow min-w-0 flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-[var(--hover)] transition duration-150 outline-none cursor-pointer text-left focus-visible:ring-1 focus-visible:ring-noska-blue"
            title="Switch Workspace"
          >
            {/* Framer-style Icon Box */}
            <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center p-1.5 shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <img src="/logo.png" className="w-full h-full object-contain pointer-events-none" alt="Noska Logo" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[var(--text)] text-[13.5px] truncate leading-tight tracking-wide">{workspaceName}</div>
              <div className="text-[10px] text-[var(--text-secondary)] font-medium leading-none mt-0.5">Noska Workspace</div>
            </div>
            <ChevronDown size={11} className="text-[var(--muted)] shrink-0 ml-1" />
          </button>

          {/* Settings Menu Launcher */}
          <button
            ref={logoRef}
            onClick={() => {
              if (logoRef.current) {
                const r = logoRef.current.getBoundingClientRect();
                setLogoCoords({ top: r.bottom + 4, left: r.left - 10 });
              }
              setAppMenuOpen(o => !o);
              setSwitcherOpen(false);
            }}
            className="w-8 h-8 rounded-lg hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] transition duration-150 outline-none flex items-center justify-center cursor-pointer shrink-0 focus-visible:ring-1 focus-visible:ring-noska-blue"
            title="Application Menu"
          >
            <AnimatedMenu size={14} />
          </button>
        </div>

        {/* Portal overlays for menus and connecting visual beam */}
        {beamCoords && (
          createPortal(
            <svg className="pointer-events-none fixed inset-0 z-[110] h-full w-full">
              <motion.path
                d={`M ${beamCoords.startX} ${beamCoords.startY} Q ${(beamCoords.startX + beamCoords.endX) / 2} ${(beamCoords.startY + beamCoords.endY) / 2 - 12}, ${beamCoords.endX} ${beamCoords.endY}`}
                fill="none"
                stroke="url(#beam-grad)"
                strokeWidth="1.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="beam-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--noska-blue)" />
                  <stop offset="100%" stopColor="var(--noska-blue-light)" />
                </linearGradient>
              </defs>
            </svg>,
            document.body
          )
        )}

        {/* macOS Desktop application menu */}
        <AnimatePresence>
          {appMenuOpen && (
            createPortal(
              <motion.div
                ref={appMenuRef}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                style={{ top: logoCoords.top, left: logoCoords.left }}
                className="fixed z-[100] w-[145px] rounded-lg border border-[var(--border)] bg-[var(--surface-1)] backdrop-blur-xl p-1 shadow-2xl text-[11.5px] outline-none select-none text-[var(--text-secondary)]"
              >
                {menuCategories.map((cat, idx) => {
                  const isFocused = idx === focusedCatIndex;
                  const isSubOpen = activeSubmenu === cat;
                  return (
                    <div
                      key={cat}
                      onMouseEnter={() => handleCategoryHover(cat, idx)}
                      className={`relative flex items-center justify-between rounded px-2 py-1.5 cursor-pointer transition-colors duration-100 ${
                        isFocused || isSubOpen ? "bg-[var(--hover)] text-[var(--text)] font-medium" : "text-[var(--text-secondary)]"
                      }`}
                    >
                      <span>{cat}</span>
                      <ChevronRight size={10} className="text-[var(--muted)]" />
                      
                      {/* Submenu Dropdown popout */}
                      <AnimatePresence>
                        {isSubOpen && (
                          <motion.div
                            initial={{ opacity: 0, x: -6, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -3, scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 420, damping: 30 }}
                            className="absolute left-[100%] top-0 ml-1.5 w-[165px] rounded-lg border border-[var(--border)] bg-[var(--surface-1)] backdrop-blur-xl p-1 shadow-2xl text-[11.5px] z-50 flex flex-col space-y-px"
                          >
                            {(appMenuItems[cat] || []).map((subItem, subIdx) => {
                              const isSubFocused = subIdx === focusedSubIndex;
                              return (
                                <button
                                  key={subItem.label}
                                  disabled={subItem.disabled}
                                  onMouseEnter={() => !keyboardActive && setFocusedSubIndex(subIdx)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    subItem.action();
                                    setAppMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between rounded px-2 py-1.5 text-left select-none transition-colors duration-100 outline-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer ${
                                    isSubFocused ? "bg-[var(--hover)] text-[var(--text)]" : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    {subItem.checked && <span className="text-noska-blue font-bold shrink-0">✓</span>}
                                    <span className="truncate">{subItem.label}</span>
                                  </span>
                                  {subItem.shortcut && (
                                    <span className="text-[9px] text-[var(--muted)] font-mono shrink-0 ml-2">{subItem.shortcut}</span>
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>,
              document.body
            )
          )}
        </AnimatePresence>

        {/* Workspace popover Switcher */}
        <AnimatePresence>
          {switcherOpen && (
            createPortal(
              <motion.div
                ref={switcherMenuRef}
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                style={{ top: switcherCoords.top, left: switcherCoords.left }}
                className="fixed z-[100] w-[260px] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] backdrop-blur-xl p-3 shadow-2xl text-[12px] outline-none select-none flex flex-col gap-2"
              >
                {/* Current Workspace Info */}
                <div className="flex items-center gap-2.5 px-1">
                  <div className="h-8.5 w-8.5 rounded-lg bg-gradient-to-tr from-noska-blue to-cyan-500 flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0">
                    {workspaceName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--text)] truncate leading-none text-[12.5px]">{workspaceName}</div>
                    <div className="text-[9.5px] text-[var(--text-secondary)] truncate mt-1">Free Plan · 1 member</div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => { setSwitcherOpen(false); onSettings(); }}
                      className="h-6.5 w-6.5 rounded-md hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center transition duration-150 cursor-pointer outline-none focus:ring-1 focus:ring-noska-blue"
                      title="Workspace Settings"
                    >
                      <AnimatedMenu size={12} />
                    </button>
                    <button
                      onClick={() => { setSwitcherOpen(false); onShare?.(); }}
                      className="h-6.5 w-6.5 rounded-md hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text)] grid place-items-center transition duration-150 cursor-pointer outline-none focus:ring-1 focus:ring-noska-blue"
                      title="Invite Members / Share"
                    >
                      <Users size={12} />
                    </button>
                  </div>
                </div>

                <div className="h-px bg-[var(--hover)] my-0.5" />

                {/* Workspace list */}
                <div className="flex flex-col space-y-0.5">
                  <div className="px-1 py-0.5 text-[9px] font-bold text-[var(--muted)] uppercase tracking-wider">Workspaces</div>
                  {workspaces.map((ws) => {
                    const isActive = ws === workspaceName;
                    return (
                      <button
                        key={ws}
                        onClick={() => {
                          setWorkspaceName(ws);
                          setSwitcherOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition duration-100 cursor-pointer outline-none focus:ring-1 focus:ring-noska-blue ${
                          isActive ? "bg-[var(--hover)] text-[var(--text)] font-semibold" : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold text-[var(--text)] shrink-0 ${
                            isActive ? "bg-noska-blue" : "bg-[var(--surface-3)]"
                          }`}>
                            {ws.charAt(0)}
                          </div>
                          <span className="truncate text-[12px]">{ws}</span>
                        </div>
                        {isActive && <span className="text-noska-blue font-bold shrink-0">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="h-px bg-[var(--hover)] my-0.5" />

                {/* Switcher popover actions */}
                <div className="flex flex-col space-y-0.5">
                  <button
                    onClick={async () => {
                      const name = await window.noskaPrompt("Enter new workspace name:", "", "Workspace Name");
                      if (name && name.trim()) {
                        setWorkspaces(prev => [...prev, name.trim()]);
                        setWorkspaceName(name.trim());
                      }
                      setSwitcherOpen(false);
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] text-left transition duration-100 cursor-pointer outline-none focus:ring-1 focus:ring-noska-blue text-[11.5px]"
                  >
                    <AnimatedPlus size={11} className="text-[var(--text-secondary)]" />
                    <span>New workspace</span>
                  </button>
                  <button
                    onClick={async () => {
                      const email = await window.noskaPrompt("Enter email for new account:", "", "user@example.com");
                      if (email && email.trim() && email.includes("@")) {
                        const namePart = email.split("@")[0];
                        const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
                        const newAcc = { name: formattedName, email: email.trim(), avatar: '👤', active: true };
                        setAccounts(prev => prev.map(a => ({ ...a, active: false })).concat(newAcc));
                        onToast?.(`Successfully signed into ${email.trim()}`);
                      } else if (email) {
                        onToast?.("Invalid email format");
                      }
                      setSwitcherOpen(false);
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)] text-left transition duration-100 cursor-pointer outline-none focus:ring-1 focus:ring-noska-blue text-[11.5px]"
                  >
                    <Users size={11} className="text-[var(--muted)]" />
                    <span>Add new account</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (await window.noskaConfirm("Are you sure you want to log out?")) {
                        onLogout?.();
                      }
                      setSwitcherOpen(false);
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-rose-400 hover:bg-rose-500/10 text-left transition duration-100 font-semibold cursor-pointer outline-none focus:ring-1 focus:ring-rose-400 text-[11.5px]"
                  >
                    <X size={11} className="text-rose-400 shrink-0" />
                    <span>Log out</span>
                  </button>
                </div>

                <div className="h-px bg-[var(--hover)] my-0.5" />

                {/* Switcher Signed-in User Row */}
                <div className="flex flex-col space-y-1 px-1 py-0.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs shadow-inner select-none pointer-events-none text-[var(--text)]">
                      {activeAccount.avatar || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[var(--text)] truncate leading-none text-[11.5px]">{activeAccount.name}</div>
                      <div className="text-[9px] text-[var(--muted)] truncate mt-1">{activeAccount.email}</div>
                    </div>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5 rounded-md shrink-0 font-bold leading-none">Active</span>
                  </div>

                  {accounts.filter(a => !a.active).map((acc, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAccounts(accounts.map(a => ({ ...a, active: a.email === acc.email })));
                        onToast?.(`Switched to account: ${acc.email}`);
                        setSwitcherOpen(false);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg p-1.5 hover:bg-[var(--hover)] transition text-left cursor-pointer outline-none border border-transparent hover:border-[var(--border)]"
                    >
                      <div className="h-6 w-6 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[10px]">
                        {acc.avatar || '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[var(--text)] text-[11px] truncate leading-none">{acc.name}</div>
                        <div className="text-[8px] text-[var(--muted)] truncate mt-0.5">{acc.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>,
              document.body
            )
          )}
        </AnimatePresence>

        {/* Search Bar - Framer Layout */}
        <div className="px-3 pt-3 pb-2 select-none shrink-0 bg-[var(--sidebar)]">
          <button
            onClick={onSearch}
            className="flex h-[34px] w-full items-center gap-2 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] px-3 text-left hover:bg-[var(--hover)] hover:border-[var(--border)] transition duration-150 outline-none cursor-pointer group focus-visible:ring-1 focus-visible:ring-noska-blue"
          >
            <AnimatedSearch size={13} className="text-[var(--text-secondary)] group-hover:text-[var(--text)] shrink-0" />
            <span className="flex-1 text-[12.5px] text-[var(--text-secondary)] group-hover:text-[var(--text)] font-medium leading-none">Search workspace...</span>
            <kbd className="text-[9px] text-[var(--muted)] font-mono bg-[var(--surface-1)] border border-[var(--border)] px-1 py-0.5 rounded leading-none shrink-0 uppercase">Ctrl+K</kbd>
          </button>
        </div>

        {/* Scrollable Sidebar Content */}
        <div className="flex-1 overflow-y-auto pb-2 scrollbar-thin fade-edges-y">
          {/* 1. Core Workspace Links */}
          <NoskaSection title="Workspace" defaultExpanded={true}>
            <NoskaNavItem icon={AnimatedFolder} label="Home" active={appView === "home"} onClick={() => onView("home")} />
            <NoskaNavItem icon={AnimatedAI} label="AI Workspace" active={false} onClick={onAIFull} />
            <NoskaNavItem icon={AnimatedHistory} label="Calendar" active={appView === "calendar"} onClick={() => onView("calendar")} />
            <NoskaNavItem icon={AnimatedBell} label="Inbox" active={appView === "inbox"} onClick={() => onView("inbox")} />
          </NoskaSection>

          {/* 2. Starred Favorites */}
          <NoskaSection title="Favorites" defaultExpanded={true}>
            {pages.filter(p => p.favorite && !p.trashed).length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] px-3.5 py-1.5 italic">Starred pages appear here</div>
            ) : (
              pages.filter(p => p.favorite && !p.trashed).map(p => (
                <NoskaNavItem key={p.id} icon={(props) => <Star {...props} size={11} className="fill-yellow-500 text-yellow-500" />} label={p.title || "Untitled"} onClick={() => onSelect(p.id)} active={p.id === activeId} compact={true} />
              ))
            )}
          </NoskaSection>

          {/* 3. Recently Edited */}
          <NoskaSection title="Recents" defaultExpanded={true}>
            {recents.length === 0 ? (
              <div className="text-[10px] text-[var(--muted)] px-3.5 py-1.5 italic">No recently edited pages</div>
            ) : (
              <StaggerContainer className="space-y-0.5">
                {recents.map((p) => (
                  <StaggerItem key={p.id}>
                    <RecentsPageItem
                      page={p}
                      active={p.id === activeId}
                      onSelect={onSelect}
                      onRemove={onRemoveFromRecents}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </NoskaSection>

          {/* 4. AI & Agents */}
          <NoskaSection title="AI Agents" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedSparkle} label="Personal Agent" onClick={() => onView("agents")} active={appView === "agents"} />
            <NoskaNavItem icon={AnimatedVoice} label="AI Meeting Capture" onClick={() => onView("meetingNote")} active={appView === "meetingNote"} />
            <NoskaNavItem icon={AnimatedPlus} label="Deploy New Agent" onClick={onAI} />
          </NoskaSection>

          {/* 5. Marketplace */}
          <NoskaSection title="Marketplace" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedSparkle} label="Browse Templates" onClick={() => onView("marketplace")} active={appView === "marketplace"} />
            <NoskaNavItem icon={AnimatedUpload} label="Creator Studio" onClick={() => onView("creator")} active={appView === "creator"} />
            <NoskaNavItem icon={AnimatedBookmark} label="Agent Directory" onClick={() => onView("agents")} active={appView === "agents"} />
          </NoskaSection>

          {/* 6. Page Tree Documents */}
          <NoskaSection title="Private Documents" defaultExpanded={true}>
            <PageTree
              content={pages.filter(p => !p.parentId).map(p => p.id)}
              allBlocks={pages}
              activeId={activeId}
              collapsedPages={collapsedPages}
              onToggleCollapse={onToggleCollapse}
              onSelect={onSelect}
              onPatchPage={onPatchPage}
              onMovePage={onMovePage}
              onDuplicatePage={onDuplicatePage}
              onAddInside={onAddInside}
              onRenamePage={onRenamePage}
              onRemoveFromRecents={onRemoveFromRecents}
              onToggleOffline={onToggleOffline}
              onCopyLink={onCopyLink}
              onTrashPage={onTrashPage}
              onToast={onToast}
            />
            <NoskaNavItem icon={AnimatedPlus} label="Add new document" onClick={() => onNew("blank")} muted compact />
          </NoskaSection>

          {/* 6. Teamspaces HQ */}
          <NoskaSection title="Teamspaces" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedFolder} label={workspaceName} onClick={() => onView("teamspace")} active={appView === "teamspace"} />
            <NoskaNavItem icon={AnimatedPlus} label="New teamspace" onClick={() => onNew("blank")} muted compact />
          </NoskaSection>

          {/* 7. Collaboration Space */}
          <NoskaSection title="Shared Space" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedPlus} label="Start collaboration" onClick={() => onView("shared")} active={appView === "shared"} muted compact />
          </NoskaSection>

          {/* 9. Spaced Recall & Console */}
          <NoskaSection title="Tools" defaultExpanded={false}>
            <NoskaNavItem icon={Brain} label="Spaced Repetition" onClick={onReview} />
            <NoskaNavItem icon={Terminal} label="API Console" onClick={onAPI} />
          </NoskaSection>

          {/* 10. Support & Document Actions */}
          <NoskaSection title="Support" defaultExpanded={false}>
            <NoskaNavItem icon={AnimatedBookmark} label="Help Center" onClick={onHelp} />
            <NoskaNavItem icon={AnimatedTrash} label={`Trash${trashCount ? ` (${trashCount})` : ""}`} ariaLabel="Open trash" onClick={onTrash} />
          </NoskaSection>
        </div>

        {/* Footer Area with Toolbar Navigation & Primary Button */}
        <div className="space-y-2.5 border-t border-[var(--border)] px-3 py-3.5 bg-[var(--sidebar)] shrink-0">
          
          {/* Navigation Toolbar */}
          <div className="flex items-center justify-between gap-1 select-none">
            <IconButton icon={AnimatedSidebar} label="Toggle sidebar" tone="dark" onClick={onToggle} />
            <IconButton icon={AnimatedBack} label="Back" tone="dark" onClick={onPrev} />
            <IconButton icon={AnimatedForward} label="Forward" tone="dark" onClick={onNext} />
            <IconButton icon={AnimatedCanvas} label="Tabs" tone="dark" onClick={() => onView("library")} />
            <IconButton icon={AnimatedPlus} label="New tab" tone="dark" onClick={() => onNew("blank")} />
          </div>

          <div className="h-px bg-[var(--border)] my-1" />
          
          {/* Library and Tasks Footers */}
          <div className="flex flex-col space-y-0.5">
            <NoskaNavItem icon={AnimatedCanvas} label="Library" onClick={() => onView("library")} active={appView === "library"} compact />
            <NoskaNavItem icon={AnimatedCheck} label="My Tasks" onClick={() => onView("tasks")} active={appView === "tasks"} compact />
          </div>

          {/* Premium "New Creation" Action Button */}
          <button
            onClick={() => onNew("blank")}
            className="flex h-[32px] w-full items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white border border-[var(--border)] px-2.5 text-left text-[11.5px] hover:-translate-y-px hover:shadow-md active:scale-[0.98] transition-all duration-150 shadow-sm outline-none focus:ring-2 focus:ring-noska-blue cursor-pointer font-semibold"
          >
            <AnimatedPlus size={11} className="shrink-0 text-white" />
            <span className="flex-1 text-white font-medium truncate">New Creation</span>
            <kbd className="text-[8px] text-white/80 font-mono bg-[var(--hover)] px-1 py-0.5 rounded leading-none shrink-0 border border-[var(--border)] tracking-wider uppercase select-none">Ctrl+N</kbd>
          </button>
        </div>
      </div>

      {/* User Avatar & Name - Bottom of Sidebar */}
      <div className="shrink-0 border-t border-[var(--border)] px-2 py-2">
        <button
          ref={userRef}
          onClick={() => {
            if (userRef.current) {
              const r = userRef.current.getBoundingClientRect();
              setSwitcherCoords({ top: r.top - 420, left: r.left });
            }
            setSwitcherOpen(o => !o);
            setAppMenuOpen(false);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--hover)] transition text-left"
        >
          <div className="h-7 w-7 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text)] shrink-0">
            {activeAccount.avatar || '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold text-[var(--text)] truncate leading-none">{activeAccount.name}</div>
            <div className="text-[9px] text-[var(--muted)] truncate mt-0.5">{activeAccount.email}</div>
          </div>
          <ChevronDown size={12} className="text-[var(--muted)] shrink-0" />
        </button>
      </div>
    </motion.aside>
  );
}

function RecentsPageItem({ page, active, onSelect, onRemove }) {
  const wordCount = page.blocks ? page.blocks.reduce((acc, b) => acc + (b.text ? b.text.split(/\s+/).filter(Boolean).length : 0), 0) : 0;
  return (
    <div className={`group relative flex min-h-[26px] items-center rounded-lg transition-all duration-150 text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]`}>
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute inset-0 bg-[var(--active)] border border-[var(--border)] shadow-sm rounded-lg z-0"
        />
      )}
      <button
        onClick={() => onSelect(page.id)}
        className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1 text-left z-10 outline-none cursor-pointer"
      >
        <span className="text-[12px] shrink-0 leading-none">{page.icon || "📄"}</span>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[12px] ${active ? "text-[var(--text)] font-semibold" : "font-normal text-[var(--text-secondary)] group-hover:text-[var(--text)]"}`}>
            {page.title || "Untitled"}
          </div>
          <div className="text-[9px] text-[var(--muted)] truncate leading-none mt-0.5 font-normal">
            {wordCount}w · {timeAgo(page.updatedAt)}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(page.id);
        }}
        className="mr-1.5 grid h-5 w-5 place-items-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--hover)] text-[var(--muted)] hover:text-rose-400 z-10 transition-all outline-none cursor-pointer"
        title="Remove from recents"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function NoskaSection({ title, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="mt-4.5 first:mt-1 select-none">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3.5 py-1.5 text-left text-[11px] font-bold text-[var(--muted)] tracking-wide transition duration-150 cursor-pointer select-none group outline-none"
      >
        <span>{title}</span>
        <motion.span
          animate={{ rotate: expanded ? 0 : -90 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="text-[var(--muted)] group-hover:text-[var(--text)] transition-colors shrink-0 ml-1 opacity-0 group-hover:opacity-100"
        >
          <ChevronDown size={10} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="overflow-hidden px-1.5 mt-0.5 space-y-0.5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NoskaNavItem({ icon: Icon, label, subtitle, active, muted, onClick, ariaLabel, compact }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseUp={(e) => e.currentTarget.blur()}
      className={`flex ${compact ? "min-h-[22px] text-[11px] py-0.5" : "min-h-[26px] text-[12px] py-1"} w-full items-center gap-2 rounded-lg px-2.5 text-left outline-none relative transition-all duration-150 cursor-pointer ${
        active
          ? "text-[var(--text)] font-semibold"
          : muted
          ? "text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-bg"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute inset-0 bg-[var(--active)] border border-[var(--border)] shadow-sm rounded-lg z-0"
        />
      )}
      <Icon size={compact ? 11 : 13} className={`shrink-0 z-10 transition-colors ${active ? "text-noska-blue" : "text-[var(--text-secondary)]"}`} />
      <span className="min-w-0 flex-1 z-10 relative">
        <span className={`block truncate ${active ? "font-semibold" : "font-normal"}`}>{label}</span>
        {subtitle && <span className="block truncate text-[9px] text-[var(--muted)] leading-none mt-0.5">{subtitle}</span>}
      </span>
    </button>
  );
}

export function PageRow({ page, active, onSelect, onPatchPage, collapsed, onCollapse }) {
  const words = plainText(page).trim().split(/\s+/).filter(Boolean).length;
  return (
    <div
      className={`group flex items-center gap-1 rounded px-1 py-1 text-sm ${active ? "bg-[var(--active)]" : "hover:bg-[var(--hover)]"}`}
    >
      <button className="grid h-5 w-5 place-items-center rounded hover:bg-[var(--hover)]" onClick={onCollapse} title="Collapse">
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      <button
        className="grid h-6 w-6 place-items-center rounded hover:bg-[var(--hover)]"
        onClick={() => onPatchPage(page.id, { icon: emojis[(emojis.indexOf(page.icon) + 1) % emojis.length] })}
        title="Change icon"
      >
        {page.icon}
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={(e) => onSelect(page.id, { altKey: e.altKey || e.metaKey })}>
        <div className="truncate">{page.title || "Untitled"}</div>
        <div className="truncate text-[10px] text-[var(--text)]/45">
          {words} words · {timeAgo(page.updatedAt)}
        </div>
      </button>
      <button
        className="opacity-0 transition group-hover:opacity-100"
        title="Favorite"
        onClick={() => onPatchPage(page.id, { favorite: !page.favorite })}
      >
        <Star size={14} className={page.favorite ? "fill-yellow-400 text-yellow-400" : ""} />
      </button>
    </div>
  );
}

export function SectionTitle({ icon: Icon, text }) {
  return (
    <div className="mt-3 flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
      <Icon size={13} />
      {text}
    </div>
  );
}

export function SidebarAction({ icon: Icon, label, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      <Icon size={16} />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>}
    </button>
  );
}
