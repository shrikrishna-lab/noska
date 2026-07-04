import React, { useState } from "react";
import { C } from "../theme";

export default function FieldInput({ label, value, onChange, placeholder, hint, autoFocus, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>
          {label}
        </label>
      )}
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl outline-none placeholder:text-[#9a9ab0] transition-all duration-200"
        style={{
          background: "#fff",
          border: focused ? `1.5px solid ${C.purple}` : `1.5px solid ${C.border}`,
          boxShadow: focused ? "0 0 0 3px rgba(124,58,237,0.12)" : "none",
          color: C.text,
        }}
      />
      {hint && <p className="text-xs" style={{ color: C.muted }}>{hint}</p>}
    </div>
  );
}
