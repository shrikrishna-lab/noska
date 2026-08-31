"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Trash2,
  Download,
  CheckCircle2,
  X,
  Search,
  AlertTriangle,
} from "lucide-react";
import {
  getVoiceFineTuneLog,
  clearVoiceFineTuneLog,
  getVoiceLoggingConsent,
  setVoiceLoggingConsent,
  type VoiceLogEntry,
} from "../../lib/voice/dictation-cleanup";

export interface VoiceTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceTelemetryModal({
  isOpen,
  onClose,
}: VoiceTelemetryModalProps) {
  const [logs, setLogs] = useState<VoiceLogEntry[]>(getVoiceFineTuneLog);
  const [consent, setConsent] = useState<boolean>(getVoiceLoggingConsent);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

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
    link.download = `noska_voice_finetune_log_${Date.now()}.jsonl`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((l) =>
    l.input.toLowerCase().includes(search.toLowerCase()) ||
    l.output.toLowerCase().includes(search.toLowerCase()) ||
    (l.instruction || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          className="relative w-full max-w-3xl rounded-3xl bg-[#141416] border border-white/15 text-white shadow-2xl overflow-hidden z-10 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Lock size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Voice Telemetry & Fine-Tuning Log
                </h2>
                <p className="text-xs text-white/50">
                  Inspect, export, or erase all local voice instruction pairs.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Consent Banner */}
          <div className="p-4 mx-6 mt-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-semibold text-white">
                Log Instruction-Output Pairs for Quality & Fine-Tuning
              </div>
              <div className="text-xs text-white/50">
                {consent
                  ? "Active • Stored strictly on local device for dataset export."
                  : "Disabled • Zero data logged. Resting state is 100% private."}
              </div>
            </div>

            <input
              type="checkbox"
              checked={consent}
              onChange={handleToggleConsent}
              className="h-5 w-5 rounded accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Search & Actions Bar */}
          <div className="p-6 pb-2 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search logged pairs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-purple-400/50"
              />
            </div>

            <button
              onClick={handleExportJSONL}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-semibold text-white transition cursor-pointer"
            >
              <Download size={13} />
              <span>Export JSONL</span>
            </button>

            <button
              onClick={handleClear}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 disabled:opacity-40 text-xs font-semibold transition cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete All</span>
            </button>
          </div>

          {/* Log Table */}
          <div className="p-6 pt-3 max-h-80 overflow-y-auto scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/40">
                {logs.length === 0
                  ? "No voice pairs logged. Logging is disabled by default for privacy."
                  : "No matching voice pairs found."}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredLogs.map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-white/40">
                      <span className="font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                          {entry.type}
                        </span>
                        {entry.targetApp && (
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                            {entry.targetApp}
                          </span>
                        )}
                      </div>
                    </div>

                    {entry.instruction && (
                      <div className="text-purple-300 font-medium">
                        Instruction: <span className="text-white">{entry.instruction}</span>
                      </div>
                    )}

                    <div className="text-white/60">
                      Input: <span className="text-white/90">{entry.input}</span>
                    </div>

                    <div className="text-emerald-400">
                      Output: <span className="text-emerald-300 font-medium">{entry.output}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs text-white/50">
              Total Logged: {logs.length} / 500 max pairs
            </span>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
