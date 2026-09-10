import React from "react";
import { motion } from "framer-motion";
import { C } from "../theme";

interface StepDotsProps {
  current: number;
  total: number;
}

export default function StepDots({ current, total }: StepDotsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 22 : 6,
            backgroundColor: i <= current ? C.purple : "#d0cfe8",
            opacity: i < current ? 0.45 : 1,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}
