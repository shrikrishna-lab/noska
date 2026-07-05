import React, { useEffect, useState } from "react";
import { motion, useMotionValue, animate } from "framer-motion";
import RingLoader from "./RingLoader";

export default function FramerLoader({
  brandName = "Noska®",
  message = "",
  counterDuration = 3,
  textColor = "#0f172a",
  background = "#f8fafc",
  onComplete,
  autoStart = true,
}) {
  const [variant, setVariant] = useState("variant1");
  const [count, setCount] = useState(0);
  const countMotion = useMotionValue(0);

  useEffect(() => {
    if (!autoStart) return;

    setVariant("variant2");

    const controls = animate(countMotion, 100, {
      duration: counterDuration,
      ease: [0.16, 1, 0.3, 1], // Premium custom ease-out curve
      onUpdate: (latest) => {
        setCount(Math.round(latest));
      },
      onComplete: () => {
        setVariant("variant3");
      },
    });

    return () => controls.stop();
  }, [autoStart, counterDuration, countMotion]);

  const handleVariantComplete = (definition) => {
    if (definition === "variant3" && onComplete) {
      onComplete();
    }
  };

  const maskVariants = {
    variant1: {
      borderRadius: "0%",
      scale: 1,
      opacity: 1,
    },
    variant2: {
      borderRadius: "0%",
      scale: 1,
      opacity: 1,
    },
    variant3: {
      borderRadius: "100%",
      scale: 0,
      opacity: 0,
      transition: {
        duration: 0.75,
        ease: [0.77, 0, 0.175, 1], // Smooth morphing exit transition
      },
    },
  };

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden"
      style={{ pointerEvents: "none" }}
    >
      <motion.div
        initial="variant1"
        animate={variant}
        variants={maskVariants}
        onAnimationComplete={handleVariantComplete}
        className="absolute inset-0 flex items-center justify-center backdrop-blur-md"
        style={{ backgroundColor: background, pointerEvents: "auto" }}
      >
        {/* Inner Content Area */}
        <div
          className="flex flex-col justify-between py-16 px-12 h-[80%] w-full max-w-[800px] select-none"
          style={{ color: textColor }}
        >
          {/* Top Block: Brand Name & Message */}
          <div className="flex flex-col gap-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-2xl font-bold tracking-tight uppercase"
              style={{
                fontFamily: '"Inter Display", "Inter", sans-serif',
                letterSpacing: "-0.05em",
                color: textColor,
              }}
            >
              {brandName}
            </motion.div>
            <div className="flex items-center gap-2 mt-1">
              {count < 100 && (
                <RingLoader size={14} color={textColor} />
              )}
              {message ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className="text-[11px] font-mono tracking-wider uppercase font-medium"
                >
                  {message}
                </motion.div>
              ) : (
                count < 100 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    className="text-[11px] font-mono tracking-wider uppercase font-medium"
                  >
                    Loading...
                  </motion.div>
                )
              )}
            </div>
          </div>

          {/* Middle Block: Progress Line */}
          <div className="w-full py-4">
            <div className="w-full h-[4px] bg-slate-200/20 relative overflow-hidden rounded-full">
              <motion.div
                className="absolute left-0 top-0 bottom-0 rounded-full"
                style={{
                  backgroundColor: textColor,
                  width: `${count}%`,
                }}
              />
            </div>
          </div>

          {/* Bottom Block: Counter */}
          <div className="flex justify-end items-baseline w-full">
            <span
              className="font-extralight select-none flex items-baseline tracking-tighter"
              style={{
                fontSize: "clamp(5rem, 16vw, 15rem)",
                lineHeight: 0.8,
                fontFamily: '"Inter Display", "Inter", sans-serif',
                color: textColor,
              }}
            >
              {count}
              <span
                className="font-light tracking-tighter"
                style={{
                  fontSize: "0.4em",
                  marginLeft: "0.05em",
                  color: textColor,
                }}
              >
                %
              </span>
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
