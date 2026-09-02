import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Shield, Flame, Bell, Check } from 'lucide-react';
import { DailySettings } from '../types';
import { getDailySettings, saveDailySettings } from '../dailyStorage';

interface DailySettingsModalProps {
  open: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export default function DailySettingsModal({
  open,
  onClose,
  onToast
}: DailySettingsModalProps) {
  const [settings, setSettings] = useState<DailySettings>(getDailySettings());

  if (!open) return null;

  const handleToggleGracePeriod = () => {
    const updated = saveDailySettings({ gracePeriodEnabled: !settings.gracePeriodEnabled });
    setSettings(updated);
    onToast(updated.gracePeriodEnabled ? 'Grace period lock enabled' : 'Retroactive editing enabled');
  };

  const handleQualifyingActivityChange = (val: 'flexible' | 'reflection_only' | 'tasks_only') => {
    const updated = saveDailySettings({ qualifyingActivity: val });
    setSettings(updated);
    onToast('Streak criteria updated');
  };

  const handleToggleRecap = () => {
    const updated = saveDailySettings({ showNextMorningRecap: !settings.showNextMorningRecap });
    setSettings(updated);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Settings size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Daily Page Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Tune streak rules, lock grace periods, and recap preferences.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. Grace Period / Lock past days */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  <Shield size={14} className="text-blue-500" />
                  <span>Lock Past Entries (Grace Period)</span>
                </div>
                <button
                  onClick={handleToggleGracePeriod}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                    settings.gracePeriodEnabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      settings.gracePeriodEnabled ? 'translate-x-4.5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {settings.gracePeriodEnabled
                  ? 'Past days become read-only after the grace period (today + next morning) to keep habit records honest.'
                  : 'Past days can be freely edited retroactively at any time.'}
              </p>
            </div>

            {/* 2. Qualifying Activity */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <Flame size={14} className="text-orange-500" />
                <span>Streak Qualifying Activity</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { id: 'flexible', label: 'Flexible: Writing reflection OR completing a task (Recommended)' },
                  { id: 'reflection_only', label: 'Reflection only: Writing in reflection zone' },
                  { id: 'tasks_only', label: 'Action only: Completing at least 1 task' }
                ].map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => handleQualifyingActivityChange(opt.id as any)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer ${
                      settings.qualifyingActivity === opt.id
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-700/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qualifying"
                      checked={settings.qualifyingActivity === opt.id}
                      onChange={() => {}}
                      className="hidden"
                    />
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      settings.qualifyingActivity === opt.id ? 'border-blue-500 bg-blue-500' : 'border-zinc-400'
                    }`}>
                      {settings.qualifyingActivity === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-[11px] leading-tight">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 3. Next-Morning Recap */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Next-Morning Recap Banner
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Display a quick summary of yesterday's wins upon opening.
                </div>
              </div>
              <button
                onClick={handleToggleRecap}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                  settings.showNextMorningRecap ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    settings.showNextMorningRecap ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-md shadow-blue-500/20"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
