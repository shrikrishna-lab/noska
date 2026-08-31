import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Star, Sparkles, ShieldCheck, Check } from "lucide-react";
import { NoskaTemplate } from "./templateTypes";

interface TemplateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: NoskaTemplate | null;
  onSubmitReview: (rating: number, comment: string) => void;
}

export default function TemplateReviewModal({
  isOpen,
  onClose,
  template,
  onSubmitReview
}: TemplateReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !template) return null;

  const handleSubmit = () => {
    if (!comment.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      onSubmitReview(rating, comment.trim());
      setSubmitted(false);
      onClose();
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 select-none"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 15 }}
        className="w-full max-w-md bg-white dark:bg-[#181a22] rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{template.icon}</span>
            <h3 className="text-sm font-bold">Review {template.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {/* Quality Verified Badge Notice */}
        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-[11.5px] text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>Your review will appear with a <strong>Verified Board User</strong> badge.</span>
        </div>

        {/* Star Rating Selector */}
        <div className="flex flex-col items-center justify-center py-2 space-y-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating !== null ? hoverRating : rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition transform hover:scale-110 cursor-pointer text-amber-500"
                >
                  <Star size={26} fill={active ? "currentColor" : "none"} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {rating === 5 ? "Loved it! Excellent workflow" : rating === 4 ? "Great template" : "Helpful structure"}
          </span>
        </div>

        {/* Comment Box */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Written Feedback
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="How did this template help your team? What could make it even better?"
            className="w-full p-3 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-xs font-medium outline-none resize-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Action button */}
        <button
          type="button"
          disabled={!comment.trim() || submitted}
          onClick={handleSubmit}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-md"
        >
          {submitted ? "✓ Review Published!" : "Submit Verified Review"}
        </button>
      </motion.div>
    </div>
  );
}
