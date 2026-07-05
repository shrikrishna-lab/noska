import React, { useEffect, useId, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 200,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  className,
  ...props
}) {
  const id = useId();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState([]);

  // Monitor resize for correct coordinate grids
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute randomized cell positions
  const getSquares = useCallback(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return [];
    const cols = Math.max(1, Math.ceil(dimensions.width / width));
    const rows = Math.max(1, Math.ceil(dimensions.height / height));
    
    const generatedSquares = [];
    for (let i = 0; i < numSquares; i++) {
      const col = Math.floor(Math.random() * cols);
      const row = Math.floor(Math.random() * rows);
      generatedSquares.push({
        id: i,
        x: col * width,
        y: row * height,
        delay: Math.random() * duration,
      });
    }
    return generatedSquares;
  }, [dimensions, width, height, numSquares, duration]);

  useEffect(() => {
    setSquares(getSquares());
  }, [getSquares]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map((sq) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, maxOpacity, 0] }}
            transition={{
              duration,
              repeat: Infinity,
              repeatType: "loop",
              delay: sq.delay,
              repeatDelay,
              ease: "easeInOut",
            }}
            key={`${sq.x}-${sq.y}-${sq.id}`}
            width={width - 1}
            height={height - 1}
            x={sq.x + 1}
            y={sq.y + 1}
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}
