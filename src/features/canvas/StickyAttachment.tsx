import React from "react";

interface StickyAttachmentProps {
  type: "tape" | "pin";
  rotation?: number;
  offset?: number;
  tapeBg?: string;
  pinColor?: string;
  className?: string;
}

export function StickyAttachment({
  type,
  rotation = 0,
  offset = 0,
  tapeBg = "rgba(226, 232, 240, 0.65)",
  pinColor = "#64748b",
  className = ""
}: StickyAttachmentProps) {
  if (type === "pin") {
    return (
      <div
        className={`absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none ${className}`}
        style={{
          transform: `translateX(calc(-50% + ${offset}px)) rotate(${rotation}deg)`
        }}
      >
        <div className="relative flex items-center justify-center filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
          {/* Subtle Pin Head */}
          <div
            className="w-3.5 h-3.5 rounded-full border border-black/15 dark:border-white/20 shadow-xs relative flex items-center justify-center"
            style={{
              backgroundColor: pinColor,
            }}
          >
            <div className="w-1 h-1 rounded-full bg-white/60 absolute top-0.5 left-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Executive Frosted Studio Tape
  return (
    <div
      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none ${className}`}
      style={{
        transform: `translateX(calc(-50% + ${offset}px)) rotate(${rotation}deg)`
      }}
    >
      <div
        className="w-16 h-4.5 rounded-xs border-y border-black/5 dark:border-white/10 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden"
        style={{
          backgroundColor: tapeBg,
        }}
      >
        <div className="w-full h-full bg-white/20 dark:bg-black/10" />
      </div>
    </div>
  );
}

export default StickyAttachment;
