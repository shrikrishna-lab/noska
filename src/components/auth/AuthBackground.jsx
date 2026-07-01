import React, { useEffect, useRef, useState } from "react";

export default function AuthBackground() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Matrix configuration
  const cellSpacing = 22; // Grid density
  const angle = 45; // Rotation angle
  const speed = 0.9; // Animation wave speed
  const baseDotSize = 3.6; // Base maximum dot radius
  const revealRadius = 120; // Radius of interactive reveal

  // Pointer position and trail state
  const pointerRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    strength: 0,
    targetStrength: 0,
  });

  const trailRef = useRef([]);

  // Detect prefers-reduced-motion accessibility setting
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handleChange = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Track mouse movements to update target coordinates
  useEffect(() => {
    if (reducedMotion) return;

    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      pointerRef.current.targetX = x;
      pointerRef.current.targetY = y;
      pointerRef.current.active = true;
      pointerRef.current.targetStrength = 1;

      // Add point to trail path
      const now = performance.now();
      const trail = trailRef.current;
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(x - last.x, y - last.y) > 10) {
        trail.push({ x, y, t: now });
        if (trail.length > 20) trail.shift();
      }
    };

    const handleMouseLeave = () => {
      pointerRef.current.active = false;
      pointerRef.current.targetStrength = 0;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [reducedMotion]);

  // Combined webgl play-dots background & pointer reveal animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const angleRad = (angle * Math.PI) / 180;
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    const render = (timestamp) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w / 2;
      const centerY = h / 2;

      ctx.globalCompositeOperation = "source-over";

      // 1. Draw solid dark backdrop color (#050505)
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      // Smooth pointer coordinate interpolation
      const p = pointerRef.current;
      if (!reducedMotion) {
        p.x += (p.targetX - p.x) * 0.12;
        p.y += (p.targetY - p.y) * 0.12;
        p.strength += (p.targetStrength - p.strength) * 0.12;
      }

      const diag = Math.hypot(w, h);
      const limit = Math.ceil(diag / 2 / cellSpacing) + 2;
      const time = timestamp * 0.001 * speed;

      // 2. Draw dot matrix grid
      for (let r = -limit; r <= limit; r++) {
        for (let c = -limit; c <= limit; c++) {
          const gx = c * cellSpacing;
          const gy = r * cellSpacing;

          // Rotate coordinate system
          const rx = gx * cosAngle - gy * sinAngle;
          const ry = gx * sinAngle + gy * cosAngle;

          const x = centerX + rx;
          const y = centerY + ry;

          // Frustum culling bounds check
          if (x < -10 || x > w + 10 || y < -10 || y > h + 10) {
            continue;
          }

          // Compute base undulation intensity using wave equations
          const wave1 = Math.sin(c * 0.09 + time) * 0.5 + 0.5;
          const wave2 = Math.cos(r * 0.09 - time * 0.7) * 0.5 + 0.5;
          const wave3 = Math.sin((c + r) * 0.04 + time * 1.1) * 0.5 + 0.5;
          
          let intensity = (wave1 + wave2 + wave3) / 3.0;
          intensity = Math.pow(intensity, 1.6);
          intensity = Math.max(0, Math.min(1, intensity));

          // 3. Compute cursor and trail ripple adjustments
          let revealFactor = 0;
          if (!reducedMotion && p.strength > 0.01) {
            // Distance to active pointer
            const dist = Math.hypot(x - p.x, y - p.y);
            if (dist < revealRadius) {
              revealFactor = (1 - dist / revealRadius) * p.strength;
            }

            // Distance to trail path coordinates
            const now = performance.now();
            const trail = trailRef.current;
            trail.forEach((pt) => {
              const age = now - pt.t;
              if (age < 400) {
                const ageRatio = age / 400;
                const dynamicRadius = revealRadius * (1 - ageRatio * 0.35);
                const dPt = Math.hypot(x - pt.x, y - pt.y);
                if (dPt < dynamicRadius) {
                  const pointContribution = (1 - dPt / dynamicRadius) * (1 - ageRatio) * 0.55;
                  revealFactor = Math.max(revealFactor, pointContribution);
                }
              }
            });
          }

          // Apply pointer reveal multipliers (making dots larger and brighter near cursor)
          const radius = baseDotSize * intensity * (1.0 + revealFactor * 1.5);
          const opacity = Math.min(1.0, intensity * 0.72 + revealFactor * 0.28);

          if (radius > 0.15) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
            ctx.fill();
          }
        }
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (!reducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      render(0);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden z-0 select-none pointer-events-auto bg-[#050505]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none select-none z-10"
      />
    </div>
  );
}
