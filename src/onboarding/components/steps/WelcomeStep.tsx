import React from "react";
import { ChevronRight } from "lucide-react";
import { C } from "../../theme";
import { useOnboarding } from "../../hooks/useOnboarding";
import { PrimaryBtn } from "../Buttons";

const NoskaLogo = "/logo.png";

export default function WelcomeStep() {
  const { next } = useOnboarding();

  return (
    <div className="flex flex-col items-center text-center gap-9">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div
            className="absolute -inset-4 rounded-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)" }}
          />
          <img
            src={NoskaLogo}
            alt="Noska"
            className="w-[80px] h-[80px] rounded-2xl object-contain relative"
            style={{ filter: "drop-shadow(0 8px 28px rgba(124,58,237,0.35))" }}
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] font-bold tracking-[-0.6px]" style={{ color: C.text }}>
            Welcome to Noska
          </h1>
          <p className="text-sm leading-relaxed max-w-[300px]" style={{ color: C.muted }}>
            The connected workspace where better, faster work happens. Let's get you set up in minutes.
          </p>
        </div>
      </div>
      <div className="w-full max-w-[320px] flex flex-col gap-3">
        <PrimaryBtn onClick={next} fullWidth>
          Get started <ChevronRight size={15} />
        </PrimaryBtn>
      </div>
    </div>
  );
}
