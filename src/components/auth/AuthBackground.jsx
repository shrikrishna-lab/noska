import React, { useEffect, useRef, useState } from "react";

export default function AuthBackground() {
  const canvasRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Track Mouse for Parallax Glow
  useEffect(() => {
    if (reducedMotion) return;

    const handleMouseMove = (e) => {
      // Normalize mouse positions to range [-1, 1]
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [reducedMotion]);

  // Main Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Particles array definition
    const numParticles = 60;
    const particles = [];

    // Create particles in 3D space: x, y in range [-width, width], z is distance [1, 1000]
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * window.innerWidth * 1.5,
        y: (Math.random() - 0.5) * window.innerHeight * 1.5,
        z: Math.random() * 1000,
        size: Math.random() * 1.2 + 0.6,
        speed: Math.random() * 0.4 + 0.15,
      });
    }

    // Animation loop
    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Deep dark layout background matching Noska aesthetics
      ctx.fillStyle = "#030307";
      ctx.fillRect(0, 0, width, height);

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const centerX = width / 2 + mouseRef.current.x * 25;
      const centerY = height / 2 + mouseRef.current.y * 25;

      // Draw faint, premium background glow grids/rings (tunnel depth)
      ctx.strokeStyle = "rgba(0, 102, 255, 0.015)";
      ctx.lineWidth = 1.0;
      
      const numRings = 5;
      for (let r = 1; r <= numRings; r++) {
        const radius = (height * 0.25) * r;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Perspective Grid Lines radiating from center
      const numLines = 8;
      ctx.strokeStyle = "rgba(0, 102, 255, 0.01)";
      for (let l = 0; l < numLines; l++) {
        const angle = (l / numLines) * Math.PI * 2;
        const dx = Math.cos(angle) * width;
        const dy = Math.sin(angle) * height;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + dx, centerY + dy);
        ctx.stroke();
      }

      // 3D glow particle rendering
      particles.forEach((p) => {
        // Move particle forward in Z space (closer to screen)
        p.z -= p.speed * 1.5;

        // Reset if it passes the camera or goes out of view
        if (p.z <= 10) {
          p.z = 1000;
          p.x = (Math.random() - 0.5) * width * 1.5;
          p.y = (Math.random() - 0.5) * height * 1.5;
        }

        // Perspective projections
        const k = 600 / p.z; // Projection factor
        const px = p.x * k + centerX;
        const py = p.y * k + centerY;

        // Draw particle if on screen
        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          // Fade particles based on distance
          let alpha = (1 - p.z / 1000) * 0.45;
          
          // Gently fade out when extremely close to camera (under z=150)
          if (p.z < 150) {
            alpha *= (p.z / 150);
          }

          // Draw the main glowing particle
          ctx.beginPath();
          ctx.arc(px, py, p.size * k * 0.15, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 102, 255, ${alpha})`;
          ctx.fill();

          // Subtle core glow for larger, closer particles
          if (p.z < 400 && p.size > 1.2) {
            ctx.beginPath();
            ctx.arc(px, py, p.size * k * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 150, 255, ${alpha * 0.25})`;
            ctx.fill();
          }
        }
      });

      // Render static subtle mouse spotlight / glow field overlay
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        100,
        centerX,
        centerY,
        width * 0.8
      );
      gradient.addColorStop(0, "rgba(0, 102, 255, 0.04)");
      gradient.addColorStop(0.5, "rgba(0, 102, 255, 0.01)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Faint grid noise pattern simulator
      ctx.fillStyle = "rgba(255, 255, 255, 0.003)";
      for (let i = 0; i < 20; i++) {
        const nx = Math.random() * width;
        const ny = Math.random() * height;
        ctx.fillRect(nx, ny, 1, 1);
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (!reducedMotion) {
      render();
    } else {
      // Just render static backdrop
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.fillStyle = "#030307";
      ctx.fillRect(0, 0, width, height);
      
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        100,
        width / 2,
        height / 2,
        width * 0.7
      );
      gradient.addColorStop(0, "rgba(0, 102, 255, 0.03)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block pointer-events-none select-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
