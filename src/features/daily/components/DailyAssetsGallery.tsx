import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Grid,
  Calendar,
  Filter,
  Image as ImageIcon,
  ExternalLink,
  Search,
  X,
  Trash2,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { DailyAssetItem, DailyMode, DailyMood } from '../types';
import { getAllAssets, deleteAssetItem, parseDayKey } from '../dailyStorage';
import { MOOD_OPTIONS } from '../promptPool';

interface DailyAssetsGalleryProps {
  onJumpToDate: (dayKey: string) => void;
  onToast: (msg: string) => void;
}

export default function DailyAssetsGallery({
  onJumpToDate,
  onToast
}: DailyAssetsGalleryProps) {
  const [layoutMode, setLayoutMode] = useState<'grid' | 'timeline'>('grid');
  const [filterMode, setFilterMode] = useState<'all' | 'personal' | 'team'>('all');
  const [filterMood, setFilterMood] = useState<string>('all');
  const [activeLightboxAsset, setActiveLightboxAsset] = useState<DailyAssetItem | null>(null);

  const allAssets = getAllAssets();

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return allAssets
      .filter((a) => {
        if (filterMode !== 'all' && a.mode !== filterMode) return false;
        if (filterMood !== 'all' && a.mood !== filterMood) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allAssets, filterMode, filterMood]);

  // Grouped by Month for Timeline View
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, DailyAssetItem[]>();
    filteredAssets.forEach((asset) => {
      const date = parseDayKey(asset.date);
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const currentList = map.get(monthYear) || [];
      currentList.push(asset);
      map.set(monthYear, currentList);
    });
    return Array.from(map.entries());
  }, [filteredAssets]);

  const handleDelete = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteAssetItem(assetId);
    if (activeLightboxAsset?.id === assetId) {
      setActiveLightboxAsset(null);
    }
    onToast('Asset deleted from gallery');
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-6 space-y-6">
      
      {/* ─── HEADER & CONTROLS TOOLBAR ─── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <ImageIcon size={16} />
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Global Daily Assets Gallery
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Browse illustrations and uploads attached across all your daily journal and team entries.
          </p>
        </div>

        {/* Filters and Layout Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Origin filter */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setFilterMode('personal')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterMode === 'personal'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setFilterMode('team')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                filterMode === 'team'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Team
            </button>
          </div>

          {/* Mood Filter */}
          <select
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer"
          >
            <option value="all">All Moods</option>
            {MOOD_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icon} {m.label}
              </option>
            ))}
          </select>

          {/* Layout Grid / Timeline Toggle */}
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                layoutMode === 'grid'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Grid view"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setLayoutMode('timeline')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                layoutMode === 'timeline'
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Timeline/Month view"
            >
              <Calendar size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── GALLERY BODY ─── */}
      {filteredAssets.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#1E222B] border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto text-xl font-bold">
            🖼️
          </div>
          <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            No assets match current filters
          </div>
          <p className="text-xs text-zinc-500">
            Images attached to daily pages and illustrations will appear here automatically.
          </p>
        </div>
      ) : layoutMode === 'grid' ? (
        /* Grid Layout */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <motion.div
              key={asset.id}
              whileHover={{ y: -3 }}
              onClick={() => setActiveLightboxAsset(asset)}
              className="group relative rounded-2xl overflow-hidden bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
                <img
                  src={asset.url}
                  alt={asset.caption || 'Asset'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono backdrop-blur-xs">
                  {asset.date}
                </span>
              </div>
              <div className="p-2.5 flex items-center justify-between gap-1 text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {asset.caption || 'Daily Image'}
                </span>
                <span className="text-[10px] text-zinc-400 capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  {asset.mode}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Timeline / Month View */
        <div className="space-y-8">
          {groupedByMonth.map(([monthYear, assets]) => (
            <div key={monthYear} className="space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{monthYear}</h3>
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800" />
                <span className="text-xs text-zinc-400">{assets.length} photos</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => setActiveLightboxAsset(asset)}
                    className="group relative rounded-2xl overflow-hidden bg-white dark:bg-[#1E222B] border border-zinc-200 dark:border-zinc-800 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
                      <img
                        src={asset.url}
                        alt={asset.caption || 'Asset'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-mono backdrop-blur-xs">
                        {asset.date}
                      </span>
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-1 text-xs">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate">
                        {asset.caption || 'Daily Image'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: FULL LIGHTBOX WITH 'JUMP TO DAY' ─── */}
      <AnimatePresence>
        {activeLightboxAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLightboxAsset(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[90vh] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-800 cursor-default"
            >
              {/* Top controls */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <button
                  onClick={() => {
                    const targetDate = activeLightboxAsset.date;
                    setActiveLightboxAsset(null);
                    onJumpToDate(targetDate);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg"
                >
                  <ExternalLink size={13} />
                  Jump to {activeLightboxAsset.date} Page
                </button>
                <button
                  onClick={() => setActiveLightboxAsset(null)}
                  className="p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition cursor-pointer backdrop-blur-xs"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Image preview */}
              <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-black/40">
                <img
                  src={activeLightboxAsset.url}
                  alt={activeLightboxAsset.caption || 'Lightbox asset'}
                  className="max-h-[72vh] w-auto object-contain rounded-2xl"
                />
              </div>

              {/* Bottom bar */}
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
                <div>
                  <div className="font-semibold">{activeLightboxAsset.caption || 'Daily Image Asset'}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Origin: {activeLightboxAsset.mode} mode · {activeLightboxAsset.date}</div>
                </div>
                <button
                  onClick={(e) => handleDelete(activeLightboxAsset.id, e)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
                  title="Delete asset"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
