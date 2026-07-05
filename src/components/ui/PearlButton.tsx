import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";

export default function PearlButton({
  label = "New AI chat",
  icon1,
  icon2,
  onClick,
  className = "",
  background = "var(--surface-3)",
  textColor = "var(--text-secondary)"
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const handleMouseEnter = useCallback(() => setHover(true), []);
  const handleMouseLeave = useCallback(() => {
    setHover(false);
    setActive(false);
  }, []);
  const handleMouseDown = useCallback(() => setActive(true), []);
  const handleMouseUp = useCallback(() => setActive(false), []);

  // Pearl 3D shadows logic
  const baseShadow =
    "inset 0 0.15rem 0.45rem rgba(255, 255, 255, 0.25), " +
    "inset 0 -0.05rem 0.15rem rgba(0, 0, 0, 0.6), " +
    "inset 0 -0.2rem 0.45rem rgba(255, 255, 255, 0.3), " +
    "0 0.5rem 1rem rgba(0, 0, 0, 0.15), " +
    "0 0.2rem 0.4rem -0.2rem rgba(0, 0, 0, 0.4)";

  const hoverShadow =
    "inset 0 0.15rem 0.25rem rgba(255, 255, 255, 0.35), " +
    "inset 0 -0.05rem 0.15rem rgba(0, 0, 0, 0.6), " +
    "inset 0 -0.2rem 0.45rem rgba(255, 255, 255, 0.5), " +
    "0 0.5rem 1rem rgba(0, 0, 0, 0.2), " +
    "0 0.2rem 0.4rem -0.2rem rgba(0, 0, 0, 0.4)";

  const activeShadow =
    "inset 0 0.15rem 0.25rem rgba(255, 255, 255, 0.45), " +
    "inset 0 -0.05rem 0.15rem rgba(0, 0, 0, 0.8), " +
    "inset 0 -0.2rem 0.45rem rgba(255, 255, 255, 0.2), " +
    "0 0.4rem 0.8rem rgba(0, 0, 0, 0.2), " +
    "0 0.2rem 0.4rem -0.2rem rgba(0, 0, 0, 0.4)";

  const buttonShadow = active ? activeShadow : hover ? hoverShadow : baseShadow;

  return (
    <button
      type="button"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={onClick}
      className={`relative border-0 outline-none select-none text-[12px] font-semibold text-center align-middle cursor-pointer flex items-center justify-center rounded-lg px-3.5 h-[28px] shrink-0 transition-all duration-200 overflow-hidden ${className}`}
      style={{
        backgroundColor: background,
        boxShadow: buttonShadow,
        color: textColor,
        WebkitTapHighlightColor: "transparent",
        fontFamily: "Inter, sans-serif"
      }}
    >
      {/* Gloss overlay shape 1 */}
      <div
        aria-hidden="true"
        className="absolute left-[-15%] right-[-15%] bottom-[25%] top-[-100%] rounded-[50%] transition-transform duration-300 pointer-events-none"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          transform: hover ? "translateY(-5%)" : "none",
          zIndex: 0
        }}
      />

      {/* Gloss overlay shape 2 (reflection highlight) */}
      <div
        aria-hidden="true"
        className="absolute left-[6%] right-[6%] top-[10%] bottom-[40%] rounded-t-md transition-all duration-300 pointer-events-none"
        style={{
          boxShadow: "inset 0 5px 4px -5px rgba(255, 255, 255, 0.85)",
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(0, 0, 0, 0) 50%)",
          opacity: hover ? 0.5 : 1,
          transform: hover ? "translateY(0.5px)" : "none",
          zIndex: 1
        }}
      />

      {/* Button content (Icons + Text) */}
      <span
        className="flex items-center gap-1.5 transition-all duration-200"
        style={{
          transform: hover ? "translateY(-1.2px)" : "translateY(0.6px)",
          zIndex: 2,
          position: "relative"
        }}
      >
        {/* Animated Icon toggle switcher */}
        <span className="flex items-center shrink-0">
          {!hover && icon1 && <span className="inline-block transition-opacity duration-150">{icon1}</span>}
          {hover && icon2 && <span className="inline-block transition-opacity duration-150">{icon2}</span>}
        </span>
        <span className="leading-none select-none">{label}</span>
      </span>
    </button>
  );
}
