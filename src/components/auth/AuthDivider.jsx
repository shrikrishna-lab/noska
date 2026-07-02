import React from "react";

export default function AuthDivider({ text = "or" }) {
  return (
    <div className="relative flex items-center justify-center my-6 select-none">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <span className="relative px-3 bg-[#f8fafc] text-xxs font-mono tracking-widest text-slate-400 uppercase">
        {text}
      </span>
    </div>
  );
}
