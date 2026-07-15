import React, { useEffect, useState, startTransition } from "react";

const DOTS_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const DOTS_INTERVAL = 80;

export default function RingLoader({
  size = 24,
  color = "currentColor",
  className = "",
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      startTransition(() => {
        setFrame((i) => (i + 1) % DOTS_FRAMES.length);
      });
    }, DOTS_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`inline-flex items-center justify-center select-none font-mono ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <span
        style={{
          fontSize: size,
          color,
          lineHeight: `${size}px`,
          display: "block",
        }}
      >
        {DOTS_FRAMES[frame]}
      </span>
    </div>
  );
}
