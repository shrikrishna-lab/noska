import React, { type MouseEventHandler, type ReactNode } from "react";
import { C } from "../theme";

interface PrimaryBtnProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  children: ReactNode;
  fullWidth?: boolean;
}

export function PrimaryBtn({ onClick, disabled, children, fullWidth }: PrimaryBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? "w-full" : ""} group relative flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed`}
      style={{ background: `linear-gradient(135deg, ${C.purple} 0%, #4f46e5 100%)`, color: "#fff" }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "linear-gradient(135deg,#6d28d9,#4338ca)" }}
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

interface SecondaryBtnProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
}

export function SecondaryBtn({ onClick, children }: SecondaryBtnProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 hover:bg-black/5"
      style={{ color: C.muted }}
    >
      {children}
    </button>
  );
}
