"use client";

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { Sparkles } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface LiquidMetalButtonProps {
  label?: string;
  onClick?: () => void;
  viewMode?: "text" | "icon";
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  title?: string;
  type?: "button" | "submit" | "reset";
}

export function LiquidMetalButton({
  label = "Get Started",
  onClick,
  viewMode = "text",
  icon,
  className = "",
  disabled = false,
  size = "md",
  title,
  type = "button",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<
    Array<{ x: number; y: number; id: number }>
  >([]);
  const nextRippleId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const shaderRef = useRef<HTMLDivElement>(null);
  const shaderMount = useRef<ShaderMount | null>(null);

  const dimensions = useMemo(() => {
    if (viewMode === "icon") {
      if (size === "sm") return { width: 30, height: 30, textPad: "p-0" };
      if (size === "lg") return { width: 44, height: 44, textPad: "p-0" };
      return { width: 36, height: 36, textPad: "p-0" };
    }
    return { width: 140, height: 40, textPad: "px-4" };
  }, [viewMode, size]);

  useEffect(() => {
    const styleId = "shader-canvas-style-exploded";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .shader-container-exploded canvas {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          border-radius: 100px !important;
        }
        @keyframes liquidRipple {
          0% {
            width: 0px;
            height: 0px;
            opacity: 0.8;
          }
          100% {
            width: 120px;
            height: 120px;
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const loadShader = async () => {
      try {
        if (shaderRef.current) {
          if (shaderMount.current?.dispose) {
            shaderMount.current.dispose();
          }

          shaderMount.current = new ShaderMount(
            shaderRef.current,
            liquidMetalFragmentShader,
            {
              u_repetition: 4,
              u_softness: 0.5,
              u_shiftRed: 0.3,
              u_shiftBlue: 0.3,
              u_distortion: 0,
              u_contour: 0,
              u_angle: 45,
              u_scale: 8,
              u_shape: 1,
              u_offsetX: 0.1,
              u_offsetY: -0.1,
            },
            undefined,
            0.6
          );
        }
      } catch (error) {
        console.error("[LiquidMetalButton] Shader mount error:", error);
      }
    };

    loadShader();

    return () => {
      if (shaderMount.current?.dispose) {
        shaderMount.current.dispose();
        shaderMount.current = null;
      }
    };

  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;
    setIsHovered(true);
    shaderMount.current?.setSpeed?.(1.4);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    shaderMount.current?.setSpeed?.(0.6);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = nextRippleId.current++;
      setRipples((prev) => [...prev, { x, y, id }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    }

    if (shaderMount.current?.setSpeed) {
      shaderMount.current.setSpeed(2.6);
      setTimeout(() => {
        if (isHovered) {
          shaderMount.current?.setSpeed?.(1.4);
        } else {
          shaderMount.current?.setSpeed?.(0.6);
        }
      }, 350);
    }

    onClick?.();
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: viewMode === "icon" ? `${dimensions.width}px` : "auto",
        height: `${dimensions.height}px`,
      }}
    >
      <div
        style={{
          perspective: "1000px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          style={{
            position: "relative",
            width: viewMode === "icon" ? `${dimensions.width}px` : "100%",
            minWidth: viewMode === "icon" ? `${dimensions.width}px` : "120px",
            height: `${dimensions.height}px`,
            transformStyle: "preserve-3d",
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Layer 1: Foreground Content */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transformStyle: "preserve-3d",
              transform: "translateZ(20px)",
              zIndex: 30,
              pointerEvents: "none",
            }}
            className={dimensions.textPad}
          >
            {viewMode === "icon" ? (
              icon || <Sparkles className="size-4 text-white" />
            ) : (
              <div className="flex items-center gap-2 text-white font-medium text-xs tracking-tight">
                {icon || <Sparkles className="size-3.5" />}
                <span>{label}</span>
              </div>
            )}
          </div>

          {/* Layer 2: Dark Metallic Core */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transformStyle: "preserve-3d",
              transform: `translateZ(10px) ${isPressed ? "translateY(1px) scale(0.96)" : "translateY(0) scale(1)"}`,
              zIndex: 20,
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                right: "2px",
                bottom: "2px",
                borderRadius: "100px",
                background: "linear-gradient(180deg, #24252a 0%, #000000 100%)",
                boxShadow: isPressed
                  ? "inset 0px 2px 4px rgba(0, 0, 0, 0.6)"
                  : "inset 0px 1px 1.5px rgba(255, 255, 255, 0.4)",
              }}
            />
          </div>

          {/* Layer 3: WebGL Liquid Metal Shader Ring & Backing */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transformStyle: "preserve-3d",
              transform: `translateZ(0px) ${isPressed ? "translateY(1px) scale(0.96)" : "translateY(0) scale(1)"}`,
              zIndex: 10,
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "100px",
                boxShadow: isPressed
                  ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5)"
                  : isHovered
                    ? "0px 0px 0px 1px rgba(255, 255, 255, 0.3), 0px 8px 16px rgba(0, 0, 0, 0.4)"
                    : "0px 0px 0px 1px rgba(255, 255, 255, 0.15), 0px 4px 10px rgba(0, 0, 0, 0.3)",
                background: "rgb(0 0 0 / 0)",
              }}
            >
              <div
                ref={shaderRef}
                className="shader-container-exploded"
                style={{
                  borderRadius: "100px",
                  overflow: "hidden",
                  position: "relative",
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </div>

          {/* Layer 4: Interactive Click & Ripple Surface */}
          <button
            type={type}
            disabled={disabled}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={() => !disabled && setIsPressed(true)}
            onMouseUp={() => !disabled && setIsPressed(false)}
            aria-label={label || title || "Liquid metal button"}
            title={title || label}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "transparent",
              border: "none",
              cursor: disabled ? "not-allowed" : "pointer",
              outline: "none",
              zIndex: 40,
              transformStyle: "preserve-3d",
              transform: "translateZ(25px)",
              borderRadius: "100px",
              opacity: disabled ? 0.4 : 1,
            }}
          >
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                style={{
                  position: "absolute",
                  left: ripple.x,
                  top: ripple.y,
                  width: "10px",
                  height: "10px",
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  pointerEvents: "none",
                  animation: "liquidRipple 0.6s cubic-bezier(0.2, 0, 0.2, 1) forwards",
                }}
              />
            ))}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LiquidMetalButton;
