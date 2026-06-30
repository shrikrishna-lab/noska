import React from "react";

export default function AuthDivider({ text = "or" }) {
  return (
    <div className="relative flex items-center justify-center my-6 select-none">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/[0.05]" />
      </div>
      <span className="relative px-3 bg-[#0c0c12] text-xxs font-mono tracking-widest text-[var(--text-muted)] uppercase">
        {text}
      </span>
    </div>
  );
}
