import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  colorById,
  stickyPaletteById,
  getCardRotation,
  getCardAttachment,
  uid,
  type CanvasElementData,
  type TaskItem,
  type TaskStatus
} from "./canvasStore";
import { StickyAttachment } from "./StickyAttachment";
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Server,
  Activity,
  AlertTriangle,
  Users,
  Shield,
  CheckSquare,
  Sparkles,
  Zap,
  Globe,
  Sliders
} from "lucide-react";

const HANDLES = [
  { id: "nw", x: 0, y: 0, cursor: "nwse-resize" },
  { id: "ne", x: 1, y: 0, cursor: "nesw-resize" },
  { id: "sw", x: 0, y: 1, cursor: "nesw-resize" },
  { id: "se", x: 1, y: 1, cursor: "nwse-resize" },
];

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  in_progress: {
    label: "In Progress",
    bg: "rgba(245, 158, 11, 0.14)",
    text: "#d97706",
    border: "rgba(245, 158, 11, 0.3)"
  },
  todo: {
    label: "To-Do",
    bg: "rgba(2, 132, 199, 0.12)",
    text: "#0284c7",
    border: "rgba(2, 132, 199, 0.3)"
  },
  client_send: {
    label: "Client send",
    bg: "rgba(147, 51, 234, 0.14)",
    text: "#9333ea",
    border: "rgba(147, 51, 234, 0.3)"
  },
  done: {
    label: "Done",
    bg: "rgba(16, 185, 129, 0.14)",
    text: "#059669",
    border: "rgba(16, 185, 129, 0.3)"
  }
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  in_progress: "todo",
  todo: "client_send",
  client_send: "done",
  done: "in_progress"
};

const TECH_ICONS: Record<string, string> = {
  slack: "💬",
  gmail: "✉️",
  asana: "⚡",
  figma: "🎨",
  jira: "📋",
  github: "🐙",
  docker: "🐳",
  aws: "☁️",
  notion: "📝",
  linear: "📐"
};

interface CanvasElementProps {
  el: CanvasElementData;
  selected: boolean;
  scale: number;
  tool: string;
  onPointerDownBody: (id: string, e: React.PointerEvent) => void;
  onPointerDownHandle: (id: string, handle: string, e: React.PointerEvent) => void;
  onStartConnector: (id: string, e: React.PointerEvent) => void;
  onChangeText: (id: string, text: string) => void;
  onUpdateElement?: (id: string, updates: Partial<CanvasElementData>) => void;
  onSelect?: () => void;
}

/**
 * CanvasElement — renders free-form sticky notes, shapes, text, frames,
 * and high-fidelity Executive nodes (Workflow Tasks, Cloud Infra, Role/Team, Client Badge).
 */
export default function CanvasElement({
  el,
  selected,
  scale,
  tool,
  onPointerDownBody,
  onPointerDownHandle,
  onStartConnector,
  onChangeText,
  onUpdateElement,
  onSelect,
}: CanvasElementProps) {
  const c = colorById(el.color);
  const palette = stickyPaletteById(el.color);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select?.();
    }
  }, [editing]);

  const isSticky = el.kind === "sticky";
  const isFrame = el.kind === "frame";
  const isText = el.kind === "text";
  const isWorkflow = el.kind === "workflow_tasks";
  const isInfra = el.kind === "infra_service";
  const isRole = el.kind === "role_team";
  const isClientBadge = el.kind === "client_badge";

  const rotation = useMemo(() => {
    if (el.rotation !== undefined && el.rotation !== 0) return el.rotation;
    if (isSticky) return getCardRotation(el.id);
    return 0;
  }, [el.rotation, el.id, isSticky]);

  const attachment = useMemo(() => {
    if (!isSticky) return null;
    return getCardAttachment(el.id);
  }, [el.id, isSticky]);

  const commonStyle: React.CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: `rotate(${rotation}deg)`,
  };

  const startBody = (e: React.PointerEvent) => {
    if (tool === "connector") {
      e.stopPropagation();
      onStartConnector?.(el.id, e);
      return;
    }
    onPointerDownBody?.(el.id, e);
  };

  // ── 1. Workflow Tasks Overview Node ───────────────────────────────────────
  if (isWorkflow) {
    const tasks = el.tasks || [];
    const handleToggleStatus = (taskId: string, currentStatus: TaskStatus) => {
      const nextStatus = NEXT_STATUS[currentStatus] || "in_progress";
      const updatedTasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: nextStatus,
              progress: nextStatus === "done" ? 100 : nextStatus === "todo" ? 0 : t.progress
            }
          : t
      );
      onUpdateElement?.(el.id, { tasks: updatedTasks });
    };

    const handleProgressChange = (taskId: string, newProgress: number) => {
      const clamped = Math.max(0, Math.min(100, newProgress));
      const updatedTasks = tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              progress: clamped,
              status: clamped === 100 ? "done" : clamped === 0 ? "todo" : "in_progress"
            }
          : t
      );
      onUpdateElement?.(el.id, { tasks: updatedTasks });
    };

    const handleAddTask = () => {
      const newTask: TaskItem = {
        id: uid("t"),
        title: "New sprint deliverable",
        progress: 25,
        status: "in_progress",
        updateTime: "Just now"
      };
      onUpdateElement?.(el.id, { tasks: [...tasks, newTask] });
    };

    const handleDeleteTask = (taskId: string) => {
      onUpdateElement?.(el.id, { tasks: tasks.filter((t) => t.id !== taskId) });
    };

    return (
      <div
        data-canvas-element={el.id}
        style={commonStyle}
        onPointerDown={startBody}
        className="group/element select-none"
      >
        <div
          className={`w-full h-full rounded-2xl border bg-white/95 dark:bg-[#161822]/95 backdrop-blur-xl p-4 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)] border-black/10 dark:border-white/10 flex flex-col justify-between transition-all duration-150 ${
            selected
              ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent shadow-xl scale-[1.01]"
              : "hover:shadow-md hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                <CheckSquare size={12} strokeWidth={2.5} />
                <span>{el.tasksSubtitle || "Tasks & Client Updates"}</span>
              </div>
              <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-0.5">
                {el.tasksTitle || "Project To-Do's Overview"}
              </h4>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddTask();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10.5px] font-semibold transition cursor-pointer"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>Add</span>
            </button>
          </div>

          {/* Task Rows */}
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2.5 pr-0.5 scrollbar-thin">
            {tasks.map((task) => {
              const cfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.in_progress;
              return (
                <div
                  key={task.id}
                  className="group/task p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200 line-clamp-1 flex-1">
                      {task.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(task.id, task.status);
                      }}
                      title="Click to cycle status"
                      style={{
                        backgroundColor: cfg.bg,
                        color: cfg.text,
                        borderColor: cfg.border
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-tight cursor-pointer hover:scale-105 transition-transform shrink-0"
                    >
                      {cfg.label}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="opacity-0 group-hover/task:opacity-70 hover:opacity-100 p-0.5 text-red-500 hover:text-red-600 cursor-pointer transition"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Progress Bar with Quick Click Step */}
                  <div className="flex items-center gap-2">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const pct = Math.round((clickX / rect.width) * 100);
                        handleProgressChange(task.id, pct);
                      }}
                      className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden cursor-pointer relative"
                    >
                      <div
                        style={{ width: `${task.progress}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          task.progress === 100
                            ? "bg-emerald-500"
                            : task.progress > 50
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 w-8 text-right">
                      {task.progress}%
                    </span>
                  </div>

                  {task.updateTime && (
                    <div className="flex items-center gap-1 text-[9.5px] text-slate-400 dark:text-slate-500">
                      <Clock size={9} />
                      <span>Updated {task.updateTime}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Meta */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10.5px] text-slate-400">
            <span>{tasks.length} live tasks</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {tasks.filter((t) => t.status === "done").length}/{tasks.length} done
            </span>
          </div>
        </div>

        {/* Selection & Connector handles */}
        {renderHandles(selected, tool, el.id, onPointerDownHandle, onStartConnector)}
      </div>
    );
  }

  // ── 2. Cloud Infrastructure Service Node ──────────────────────────────────
  if (isInfra) {
    const isUnstable = el.status === "unstable" || el.status === "degraded";
    const statusColor = el.status === "operational" ? "#10b981" : el.status === "unstable" ? "#f59e0b" : "#ef4444";

    return (
      <div
        data-canvas-element={el.id}
        style={commonStyle}
        onPointerDown={startBody}
        className="group/element select-none"
      >
        <div
          className={`w-full h-full rounded-2xl border bg-white/95 dark:bg-[#141720]/95 backdrop-blur-xl p-3.5 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)] border-black/10 dark:border-white/10 flex flex-col justify-between transition-all duration-150 ${
            selected
              ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-transparent shadow-xl scale-[1.01]"
              : "hover:shadow-md hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          {/* Header with Flag & Status */}
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/8 border border-black/5 dark:border-white/5 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
              <span>{el.regionFlag || "🇺🇸"}</span>
              <span className="font-mono">{el.region || "us-east-1"}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/8 text-[10.5px] font-medium text-slate-600 dark:text-slate-300">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: statusColor }}
              />
              <span className="capitalize">{el.status || "operational"}</span>
            </div>
          </div>

          {/* Warning Banner if Unstable */}
          {isUnstable && el.alertMessage && (
            <div className="my-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 text-[10.5px] font-medium">
              <AlertTriangle size={12} className="shrink-0 text-amber-500" />
              <span className="line-clamp-1">{el.alertMessage}</span>
            </div>
          )}

          {/* Service Title */}
          <div className="my-1">
            <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-[13.5px]">
              <Server size={14} className="text-slate-500 shrink-0" />
              <span className="truncate">{el.serviceName || "API Gateway"}</span>
            </div>
            {el.serviceSubtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {el.serviceSubtitle}
              </p>
            )}
          </div>

          {/* Metrics Footer */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 grid grid-cols-3 gap-1.5 text-center">
            <div className="p-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">
              <div className="text-[9px] uppercase font-bold text-slate-400">Traffic</div>
              <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                {el.metrics?.traffic || "1L 24"}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">
              <div className="text-[9px] uppercase font-bold text-slate-400">CPU</div>
              <div className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {el.metrics?.cpu || "16%"}
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.04]">
              <div className="text-[9px] uppercase font-bold text-slate-400">RAM</div>
              <div className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                {el.metrics?.ram || "18%"}
              </div>
            </div>
          </div>
        </div>

        {/* Selection & Connector handles */}
        {renderHandles(selected, tool, el.id, onPointerDownHandle, onStartConnector)}
      </div>
    );
  }

  // ── 3. Role & Team Node ───────────────────────────────────────────────────
  if (isRole) {
    const techStack = el.techStack || ["Slack", "Gmail", "Asana", "Figma", "Jira"];

    return (
      <div
        data-canvas-element={el.id}
        style={commonStyle}
        onPointerDown={startBody}
        className="group/element select-none"
      >
        <div
          className={`w-full h-full rounded-2xl border bg-white/95 dark:bg-[#181622]/95 backdrop-blur-xl p-3.5 shadow-[0_12px_32px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.04)] border-black/10 dark:border-white/10 flex flex-col justify-between transition-all duration-150 ${
            selected
              ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-transparent shadow-xl scale-[1.01]"
              : "hover:shadow-md hover:border-black/20 dark:hover:border-white/20"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[10.5px] font-bold uppercase tracking-wider">
              {el.roleTitle || "Role / Owner"}
            </span>
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center text-[10.5px] font-bold shadow-xs">
              {(el.assignee || "PM")[0]}
            </div>
          </div>

          {/* Member Name */}
          <div className="my-1">
            <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">
              {el.assignee || "Alex Morgan"}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {el.roleSubtitle || "Lead Strategy & Architecture"}
            </p>
          </div>

          {/* Tech Stack Chips */}
          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center gap-1.5 flex-wrap">
            {techStack.map((tech) => {
              const key = tech.toLowerCase();
              const icon = TECH_ICONS[key] || "⚡";
              return (
                <div
                  key={tech}
                  title={tech}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/5 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                >
                  <span className="text-[11px]">{icon}</span>
                  <span>{tech}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selection & Connector handles */}
        {renderHandles(selected, tool, el.id, onPointerDownHandle, onStartConnector)}
      </div>
    );
  }

  // ── 4. Client Badge Header Node ──────────────────────────────────────────
  if (isClientBadge) {
    return (
      <div
        data-canvas-element={el.id}
        style={commonStyle}
        onPointerDown={startBody}
        className="group/element select-none"
      >
        <div
          className={`w-full h-full rounded-full border bg-white/95 dark:bg-[#141d1a]/95 backdrop-blur-xl px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border-emerald-500/30 flex items-center justify-between transition-all duration-150 ${
            selected
              ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-transparent shadow-xl scale-[1.01]"
              : "hover:scale-[1.01]"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              ✨
            </div>
            <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">
              {el.badgeText || `Client: ${el.clientName || "SaaSflow"} | Onboarded: ${el.onboardDate || "25 Jun"}`}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
            Active
          </span>
        </div>

        {/* Selection & Connector handles */}
        {renderHandles(selected, tool, el.id, onPointerDownHandle, onStartConnector)}
      </div>
    );
  }

  // ── 5. Standard Sticky Notes, Rectangles, Ellipses, Text, and Frames ──────
  const bg = isText ? "transparent" : isSticky ? palette.bg : c.fill;
  const border = isText ? "none" : isSticky ? `1.5px solid ${palette.border}` : `1.5px solid ${c.stroke}`;
  const radius = el.kind === "ellipse" ? "50%" : isSticky ? "14px" : "10px";
  const textColor = isSticky ? palette.text : c.text;

  return (
    <div
      data-canvas-element={el.id}
      style={commonStyle}
      onPointerDown={startBody}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isFrame) setEditing(true);
      }}
      className="group/element select-none transition-transform duration-150"
    >
      {/* Washi Tape or Pushpin on Sticky Note */}
      {isSticky && attachment && (
        <StickyAttachment
          type={attachment.type}
          rotation={attachment.rotation}
          offset={attachment.offset}
          tapeBg={palette.tapeBg}
          pinColor={palette.pinColor}
        />
      )}

      {/* Body */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          border,
          borderRadius: radius,
          boxShadow: isSticky
            ? `0 12px 30px -8px ${palette.shadow}, 0 2px 6px rgba(0,0,0,0.04)`
            : "none",
          color: textColor,
        }}
        className={`relative flex flex-col ${
          isFrame ? "items-start justify-start p-3" : "items-center justify-between p-3.5"
        } overflow-hidden transition-all duration-150 ${
          selected
            ? "ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-transparent shadow-xl"
            : "hover:shadow-md"
        }`}
      >
        {/* Frame label */}
        {isFrame && (
          <div className="absolute -top-6 left-0 text-[11px] font-semibold text-[var(--secondary)] px-2 py-0.5 rounded-lg bg-[var(--elevated)]/90 border border-[var(--border)] shadow-xs">
            {el.text || "Frame"}
          </div>
        )}

        {/* Sticky Note Category Pill */}
        {isSticky && (
          <div className="w-full flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5 pointer-events-none select-none">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-80">
              <span>{palette.emoji}</span>
              <span>{palette.label}</span>
            </span>
          </div>
        )}

        {/* Text content / editor */}
        {!isFrame && (
          editing ? (
            <textarea
              ref={taRef}
              defaultValue={el.text}
              onBlur={(e) => {
                setEditing(false);
                onChangeText?.(el.id, e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") e.currentTarget.blur();
                if (e.key === "Enter" && isText && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                e.stopPropagation();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ fontSize: el.fontSize || 13.5 }}
              className="w-full flex-1 bg-transparent outline-none resize-none text-left p-1 leading-relaxed font-medium placeholder-black/30 dark:placeholder-white/30"
              placeholder={isSticky ? "Write note..." : "Type text..."}
            />
          ) : (
            <div
              style={{ fontSize: el.fontSize || 13.5 }}
              className={`w-full flex-1 flex items-start text-left p-1 leading-relaxed whitespace-pre-wrap break-words font-medium overflow-hidden ${
                !el.text ? "opacity-40 italic" : ""
              } ${isText ? "font-bold" : ""}`}
            >
              {el.text || (isSticky ? "Double-click to write note" : "")}
            </div>
          )
        )}
      </div>

      {/* Selection & Connector handles */}
      {renderHandles(selected, tool, el.id, onPointerDownHandle, onStartConnector)}
    </div>
  );
}

function renderHandles(
  selected: boolean,
  tool: string,
  elementId: string,
  onPointerDownHandle: (id: string, handle: string, e: React.PointerEvent) => void,
  onStartConnector: (id: string, e: React.PointerEvent) => void
) {
  if (!selected || tool !== "select") return null;

  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.id}
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDownHandle?.(elementId, h.id, e);
          }}
          style={{
            position: "absolute",
            left: `calc(${h.x * 100}% - 5px)`,
            top: `calc(${h.y * 100}% - 5px)`,
            width: 10,
            height: 10,
            cursor: h.cursor,
          }}
          className="rounded-xs bg-white border-2 border-[#d97706] shadow-sm z-30"
        />
      ))}

      {/* Connector handle nub */}
      <button
        onPointerDown={(e) => {
          e.stopPropagation();
          onStartConnector?.(elementId, e);
        }}
        style={{
          position: "absolute",
          right: -12,
          top: "50%",
          transform: "translateY(-50%)",
        }}
        title="Drag to connect"
        className="w-5 h-5 rounded-full bg-[#d97706] border-2 border-white shadow-md cursor-crosshair opacity-0 group-hover/element:opacity-100 transition-all hover:scale-125 z-30 flex items-center justify-center text-white text-[9px] font-bold"
      >
        +
      </button>
    </>
  );
}
