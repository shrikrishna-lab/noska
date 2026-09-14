import React from "react";
import { SiriWave } from "./siri-wave";

export default function SiriWaveDemo() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0a0a0c] p-8">
      <SiriWave
        variant="wave"
        size={360}
        className="shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
      />
    </div>
  );
}
