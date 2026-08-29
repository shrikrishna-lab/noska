import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Check, Play, Square, RotateCcw, ExternalLink, RotateCw, Search, Volume2 } from "lucide-react";
import {
  ELEVENLABS_VOICES,
  getElevenLabsApiKey,
  setElevenLabsApiKey,
  getSelectedVoiceId,
  setSelectedVoiceId,
  getCustomVoices,
  removeCustomVoice,
  getAllVoices,
  fetchLiveElevenLabsVoices,
  playVoicePreview,
  stopVoicePreview,
  type ElevenLabsVoice,
} from "../../lib/voice/elevenlabs";
import CustomVoiceModal from "./CustomVoiceModal";

interface ElevenLabsVoiceSettingsProps {
  onToast?: (msg: string) => void;
}

export default function ElevenLabsVoiceSettings({ onToast }: ElevenLabsVoiceSettingsProps) {
  const [elevenKey, setElevenKey] = useState(getElevenLabsApiKey());
  const [selectedVoice, setSelectedVoice] = useState(getSelectedVoiceId());
  const [voices, setVoices] = useState<ElevenLabsVoice[]>(getAllVoices());
  const [activeCategory, setActiveCategory] = useState<"all" | "popular" | "paid" | "free" | "custom">("all");
  const [search, setSearch] = useState("");
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync live voices on mount or key change
  const syncVoices = async (key?: string) => {
    setIsSyncing(true);
    try {
      const live = await fetchLiveElevenLabsVoices(key || elevenKey);
      const custom = getCustomVoices();
      const merged = [...custom, ...live];
      setVoices(merged);
      onToast?.(`Synced ${merged.length} live voice models in real time!`);
    } catch (err: any) {
      console.warn("Live voice sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncVoices();
    return () => {
      stopVoicePreview();
    };
  }, []);

  const handleSaveKey = async () => {
    setElevenLabsApiKey(elevenKey);
    setKeySaved(true);
    onToast?.("ElevenLabs API Key saved successfully!");
    setTimeout(() => setKeySaved(false), 2200);
    await syncVoices(elevenKey);
  };

  const handleSelectVoice = (id: string, name: string) => {
    setSelectedVoice(id);
    setSelectedVoiceId(id);
    onToast?.(`Active voice set to “${name}”`);
  };

  const handleRemoveCustom = (id: string, name: string) => {
    const updated = removeCustomVoice(id);
    setVoices((prev) => prev.filter((v) => v.id !== id));
    if (selectedVoice === id) {
      handleSelectVoice(ELEVENLABS_VOICES[0].id, ELEVENLABS_VOICES[0].name);
    }
    onToast?.(`Removed custom voice “${name}”`);
  };

  const handleTogglePreview = async (v: ElevenLabsVoice) => {
    if (previewingVoice === v.id) {
      stopVoicePreview();
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(v.id);
    try {
      await playVoicePreview(v, () => {
        setPreviewingVoice(null);
      });
    } catch (err: any) {
      setPreviewingVoice(null);
      onToast?.(err.message || "Failed to preview audio");
    }
  };

  // Filtered voice list
  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      const matchSearch =
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        (v.accent && v.accent.toLowerCase().includes(search.toLowerCase())) ||
        (v.category && v.category.toLowerCase().includes(search.toLowerCase())) ||
        (v.useCase && v.useCase.toLowerCase().includes(search.toLowerCase()));

      if (!matchSearch) return false;

      if (activeCategory === "popular") return v.tier === "popular";
      if (activeCategory === "paid") return v.tier === "paid" || v.isCustom;
      if (activeCategory === "free") return v.tier === "free";
      if (activeCategory === "custom") return v.isCustom;

      return true;
    });
  }, [voices, search, activeCategory]);

  return (
    <div className="pt-6 border-t border-[#e8e4db] space-y-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-[#1c1b18] flex items-center gap-1.5">
            <Sparkles size={15} className="text-purple-600" />
            <span>ElevenLabs Studio & Real-time Voice AI</span>
          </div>
          <div className="text-xs text-[#706c64] mt-0.5">
            Ultra-realistic studio voice models with real-time audio playback.
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => syncVoices()}
            className="p-1.5 rounded-xl border border-[#e8e4db] bg-white hover:bg-[#ede8df]/60 text-[#706c64] hover:text-[#1c1b18] transition cursor-pointer"
            title="Fetch latest real-time voices from ElevenLabs"
          >
            <RotateCw size={13} className={isSyncing ? "animate-spin text-purple-600" : ""} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <span>+ Add Cloned Voice</span>
          </button>
        </div>
      </div>

      {/* ElevenLabs API Key Card */}
      <div className="p-4 rounded-2xl bg-[#ede8df]/60 border border-[#e8e4db] space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[#1c1b18]">ElevenLabs API Key</label>
          <a
            href="https://elevenlabs.io"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-purple-600 hover:underline font-medium flex items-center gap-1"
          >
            <span>Get API Key</span>
            <ExternalLink size={10} />
          </a>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="password"
            value={elevenKey}
            onChange={(e) => setElevenKey(e.target.value)}
            placeholder="sk_..."
            className="flex-1 px-3 py-2 rounded-xl bg-white border border-[#e8e4db] text-xs text-[#1c1b18] outline-none focus:border-purple-600 placeholder:text-[#a09c94] font-mono"
          />
          <button
            type="button"
            onClick={handleSaveKey}
            className="px-4 py-2 rounded-xl bg-[#1c1b18] hover:bg-black text-white text-xs font-semibold transition shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {keySaved ? <Check size={14} className="text-emerald-400" /> : null}
            <span>{keySaved ? "Saved" : "Save Key"}</span>
          </button>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
            {[
              { id: "all", label: "All Voices" },
              { id: "popular", label: "⭐ Popular" },
              { id: "paid", label: "✨ Studio (Paid)" },
              { id: "free", label: "🟢 Free Tier" },
              { id: "custom", label: "🎙️ Custom Cloned" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer font-medium ${
                  activeCategory === cat.id
                    ? "bg-[#1c1b18] text-white font-semibold shadow-xs"
                    : "bg-[#ede8df]/50 text-[#706c64] hover:text-[#1c1b18] border border-[#e8e4db]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative flex items-center sm:w-48">
            <Search size={11} className="absolute left-2.5 text-[#706c64]" />
            <input
              type="text"
              placeholder="Search voices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1 rounded-xl bg-white border border-[#e8e4db] text-xs text-[#1c1b18] outline-none focus:border-purple-600 placeholder:text-[#a09c94]"
            />
          </div>
        </div>

        {/* Voice Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {filteredVoices.map((v) => {
            const isSelected = selectedVoice === v.id;
            const isPlaying = previewingVoice === v.id;

            return (
              <div
                key={v.id}
                onClick={() => handleSelectVoice(v.id, v.name)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer text-left flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-purple-600 shadow-sm ring-1 ring-purple-600/30"
                    : "bg-[#ede8df]/40 hover:bg-[#ede8df] border-[#e8e4db]"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1c1b18] truncate">{v.name}</span>
                        {/* Tier Badge */}
                        {v.isCustom ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 shrink-0">
                            Cloned
                          </span>
                        ) : v.tier === "popular" ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                            Popular ⭐
                          </span>
                        ) : v.tier === "paid" ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 shrink-0">
                            Studio
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                            Free
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#706c64] font-medium mt-0.5 truncate">{v.accent}</div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Real Audio Preview Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePreview(v);
                        }}
                        className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                          isPlaying
                            ? "bg-purple-600 text-white shadow-xs"
                            : "hover:bg-white text-[#706c64] hover:text-[#1c1b18]"
                        }`}
                        title={isPlaying ? "Stop audio preview" : "Play real MP3 sample preview"}
                      >
                        {isPlaying ? (
                          <Square size={11} className="fill-white" />
                        ) : (
                          <Play size={11} className="fill-current" />
                        )}
                        {isPlaying && (
                          <span className="flex items-center gap-0.5 px-0.5">
                            <span className="w-0.5 h-2 bg-white animate-pulse" />
                            <span className="w-0.5 h-3 bg-white animate-pulse delay-75" />
                            <span className="w-0.5 h-1.5 bg-white animate-pulse delay-150" />
                          </span>
                        )}
                      </button>

                      {v.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustom(v.id, v.name);
                          }}
                          className="p-1.5 rounded-xl hover:bg-rose-100 text-rose-500 transition cursor-pointer"
                          title="Delete custom voice"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {v.description && (
                    <p className="text-[10px] text-[#706c64] mt-1.5 leading-relaxed line-clamp-2">
                      {v.description}
                    </p>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-[#e8e4db]/60 text-[10px]">
                  <span className="text-[#706c64] font-medium truncate max-w-[150px]">
                    {v.useCase || v.category}
                  </span>
                  {isSelected && (
                    <span className="text-purple-700 font-bold flex items-center gap-1">
                      <Check size={11} /> Active Voice
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Voice Creator Modal */}
      <CustomVoiceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onVoiceAdded={(updated, newId) => {
          setVoices(getAllVoices());
          setSelectedVoice(newId);
          setSelectedVoiceId(newId);
        }}
        onToast={onToast}
      />
    </div>
  );
}
