"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Trash2,
  Download,
  CheckCircle2,
  X,
  Search,
  Activity,
  ShieldAlert,
} from "lucide-react";
import {
  getVoiceFineTuneLog,
  clearVoiceFineTuneLog,
  getVoiceLoggingConsent,
  setVoiceLoggingConsent,
  type VoiceLogEntry,
} from "../../lib/voice/dictation-cleanup";
import { cn } from "../../lib/utils";

export interface VoiceTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceTelemetryModal({
  isOpen,
  onClose,
}: VoiceTelemetryModalProps) {
  const [logs, setLogs] = useState<VoiceLogEntry[]>([]);
  const [consent, setConsent] = useState<boolean>(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLogs(getVoiceFineTuneLog());
      setConsent(getVoiceLoggingConsent());
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleConsent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setConsent(next);
    setVoiceLoggingConsent(next);
    if (!next) {
      clearVoiceFineTuneLog();
      setLogs([]);
    }
  };

  const handleClear = () => {
    clearVoiceFineTuneLog();
    setLogs([]);
  };

  const handleExportJSONL = () => {
    const dataStr = logs.map((l) => JSON.stringify(l)).join("\n");
    const blob = new Blob([dataStr], { type: "application/jsonlines" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `noska_voice_telemetry_log_${Date.now()}.jsonl`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.input.toLowerCase().includes(search.toLowerCase()) ||
      l.output.toLowerCase().includes(search.toLowerCase()) ||
      (l.instruction || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-3xl rounded-3xl bg-[#faf8f5] dark:bg-[#18191c] border border-[#ded8cc] dark:border-white/10 text-[#1c1b18] dark:text-white shadow-[0_25px_60px_rgba(0,0,0,0.35)] overflow-hidden z-10 font-sans flex flex-col max-h-[88vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#e8e4db] dark:border-white/10 bg-white/60 dark:bg-white/[0.02]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-500/20 border border-purple-300/60 dark:border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-400 shadow-xs shrink-0">
                <Activity size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-[#1c1b18] dark:text-white">
                    Voice Telemetry &amp; Quality Logs
                  </h2>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      consent
                        ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300/60"
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300/60"
                    )}
                  >
                    {consent ? "● Logging Active" : "○ Disabled (Private)"}
                  </span>
                </div>
                <p className="text-xs text-[#706c64] dark:text-white/50 mt-0.5">
                  Inspect, export, or permanently erase all local voice instruction pairs.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-[#ede8df] hover:bg-[#e4ded3] dark:bg-white/10 dark:hover:bg-white/20 text-[#706c64] hover:text-[#1c1b18] dark:text-white/70 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Consent Banner */}
          <div className="p-4 mx-6 mt-5 rounded-2xl bg-[#ede8df]/70 dark:bg-white/[0.03] border border-[#ded8cc] dark:border-white/10 flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#1c1b18] dark:text-white flex items-center gap-2">
                <span>Record Cleaned Voice Instruction Pairs</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white dark:bg-white/10 text-[#706c64] dark:text-white/70">
                  Local RAM only
                </span>
              </div>
              <div className="text-[11.5px] text-[#706c64] dark:text-white/60">
                {consent
                  ? "Active • Stored strictly on this machine for dataset inspection and JSONL export."
                  : "Disabled • Zero voice pairs are recorded. Noska operates in 100% private resting state."}
              </div>
            </div>

            <input
              type="checkbox"
              checked={consent}
              onChange={handleToggleConsent}
              className="h-5 w-5 rounded accent-purple-600 cursor-pointer"
            />
          </div>

          {/* Search & Action Bar */}
          <div className="px-6 py-3 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#706c64] dark:text-white/40"
              />
              <input
                type="text"
                placeholder="Search logged voice pairs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-[#ded8cc] dark:border-white/10 text-xs text-[#1c1b18] dark:text-white placeholder-[#8c887f] dark:placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/20 shadow-2xs font-medium"
              />
            </div>

            <button
              onClick={handleExportJSONL}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-[#ede8df] dark:hover:bg-white/15 disabled:opacity-40 text-xs font-semibold text-[#1c1b18] dark:text-white border border-[#ded8cc] dark:border-white/10 shadow-2xs transition cursor-pointer shrink-0"
            >
              <Download size={13} />
              <span>Export JSONL</span>
            </button>

            <button
              onClick={handleClear}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 disabled:opacity-40 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
            >
              <Trash2 size={13} />
              <span>Delete All</span>
            </button>
          </div>

          {/* Log Table Body */}
          <div className="px-6 pb-6 pt-1 max-h-80 overflow-y-auto scrollbar-thin space-y-2.5">
            {filteredLogs.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-[#ede8df] dark:bg-white/5 flex items-center justify-center mx-auto text-[#706c64]">
                  <Lock size={18} />
                </div>
                <p className="text-xs text-[#706c64] dark:text-white/40 font-medium">
                  {logs.length === 0
                    ? "No voice pairs logged. Logging is disabled by default for zero data retention."
                    : "No matching voice pairs found."}
                </p>
              </div>
            ) : (
              filteredLogs.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white dark:bg-white/[0.03] border border-[#e8e4db] dark:border-white/10 space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px] text-[#706c64] dark:text-white/50">
                    <span className="font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold font-mono text-[10px]">
                        {entry.type}
                      </span>
                      {entry.targetApp && (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-white/10 text-neutral-700 dark:text-white/70 font-semibold text-[10px]">
                          {entry.targetApp}
                        </span>
                      )}
                    </div>
                  </div>

                  {entry.instruction && (
                    <div className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                      Instruction: <span className="text-[#1c1b18] dark:text-white font-normal">{entry.instruction}</span>
                    </div>
                  )}

                  <div className="text-[11.5px] text-[#706c64] dark:text-white/60">
                    Input: <span className="text-[#1c1b18] dark:text-white/90 font-medium">{entry.input}</span>
                  </div>

                  <div className="text-[11.5px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-xl border border-emerald-200/50 dark:border-emerald-800/30">
                    Output: <span className="font-semibold text-emerald-900 dark:text-emerald-200">{entry.output}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#e8e4db] dark:border-white/10 bg-white/60 dark:bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs text-[#706c64] dark:text-white/50 font-medium">
              Total Logged: <strong className="text-[#1c1b18] dark:text-white">{logs.length}</strong> / 500 max pairs
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
