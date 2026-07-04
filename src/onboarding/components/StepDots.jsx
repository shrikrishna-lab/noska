import React from "react";
import { C } from "../theme";

export default function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="transition-all duration-500"
          style={{
            width: i === current ? "22px" : "6px",
            height: "6px",
            borderRadius: "3px",
            background: i <= current ? C.purple : "#d0cfe8",
            opacity: i < current ? 0.4 : 1,
          }}
        />
      ))}
    </div>
  );
}
