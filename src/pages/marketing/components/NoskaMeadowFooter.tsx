import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import './NoskaMeadowFooter.css';

type TimeOfDay = 'day' | 'sunset' | 'aurora' | 'night';

// Realistic 3D Butterfly
interface RealisticButterfly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  flapPhase: number;
  flapSpeed: number;
  pitch: number;
  roll: number;
  baseColor: string;
  patternColor: string;
  spotColor: string;
  targetX: number;
  targetY: number;
  turnTimer: number;
  species: 'monarch' | 'morpho' | 'emerald' | 'swallowtail';
}

// Meadow Flower
interface Flower {
  x: number;
  y: number;
  type: 'daisy' | 'poppy' | 'lavender' | 'buttercup';
  stemHeight: number;
  stemWidth: number;
  swaySpeed: number;
  swayPhase: number;
  currentSway: number;
  scale: number;
  petalColor: string;
  centerColor: string;
  layer: number;
}

// Dandelion Seed
interface DandelionSpore {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  rotSpeed: number;
  alpha: number;
}

// Firefly
interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  alphaSpeed: number;
  color: string;
}

// Grass Blade
interface SegmentedBlade {
  x: number;
  y: number;
  length: number;
  baseWidth: number;
  angle: number;
  currentAngle: number;
  stiffness: number;
  phase: number;
  speed: number;
  layer: number;
  hasDew: boolean;
}

export default function NoskaMeadowFooter() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('sunset');

  // PERFORMANCE CRITICAL: Use Ref for mouse coordinates to avoid 60-120Hz React state re-renders!
  const mousePosRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 });

  // Seamless atmospheric sky themes
  const themes = {
    day: {
      sky: 'linear-gradient(180deg, #ffffff 0%, #f0f9ff 12%, #bae6fd 28%, #60a5fa 52%, #93c5fd 76%, #fef3c7 100%)',
      hillFar: '#14532d',
      hillMid: '#15803d',
      hillNear: '#16a34a',
      grassTip: '#86efac',
      grassMid: '#22c55e',
      grassRoot: '#14532d',
      dewAlpha: 0.85,
      butterflySpecies: ['morpho', 'monarch', 'swallowtail', 'emerald'] as const,
      butterflyCount: 4,
      fireflyCount: 8,
      dandelionCount: 16,
      navColor: 'rgba(255, 255, 255, 0.95)',
    },
    sunset: {
      sky: 'linear-gradient(180deg, #ffffff 0%, #faf5ff 10%, #dfd3ee 22%, #9b82be 42%, #c68fb7 64%, #f09588 82%, #fed8ad 100%)',
      hillFar: '#052e16',
      hillMid: '#064e3b',
      hillNear: '#15803d',
      grassTip: '#4ade80',
      grassMid: '#16a34a',
      grassRoot: '#052e16',
      dewAlpha: 0.95,
      butterflySpecies: ['monarch', 'swallowtail', 'morpho'] as const,
      butterflyCount: 3,
      fireflyCount: 28,
      dandelionCount: 20,
      navColor: 'rgba(255, 255, 255, 0.95)',
    },
    aurora: {
      sky: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 5%, #0f172a 18%, #070c1a 34%, #0b2228 56%, #0d3d34 78%, #17223b 100%)',
      hillFar: '#022c22',
      hillMid: '#064e3b',
      hillNear: '#047857',
      grassTip: '#34d399',
      grassMid: '#059669',
      grassRoot: '#022c22',
      dewAlpha: 1.0,
      butterflySpecies: ['morpho', 'emerald'] as const,
      butterflyCount: 2,
      fireflyCount: 40,
      dandelionCount: 14,
      navColor: 'rgba(226, 232, 240, 0.95)',
    },
    night: {
      sky: 'linear-gradient(180deg, #ffffff 0%, #e2e8f0 5%, #0f172a 18%, #04050a 35%, #080d19 58%, #151e36 100%)',
      hillFar: '#021f17',
      hillMid: '#064e3b',
      hillNear: '#065f46',
      grassTip: '#10b981',
      grassMid: '#064e3b',
      grassRoot: '#021f17',
      dewAlpha: 0.85,
      butterflySpecies: ['emerald'] as const,
      butterflyCount: 1,
      fireflyCount: 50,
      dandelionCount: 12,
      navColor: 'rgba(226, 232, 240, 0.9)',
    },
  };

  const currentTheme = themes[timeOfDay];

  // Zero-overhead native mouse tracking (doesn't trigger component re-render)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mousePosRef.current.x = e.clientX - rect.left;
    mousePosRef.current.y = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    mousePosRef.current.x = -1000;
    mousePosRef.current.y = -1000;
  };

  // High-performance 60/120fps hardware accelerated canvas engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let cssWidth = 0;
    let cssHeight = 0;

    let blades: SegmentedBlade[] = [];
    let butterflies: RealisticButterfly[] = [];
    let flowers: Flower[] = [];
    let dandelions: DandelionSpore[] = [];
    let fireflies: Firefly[] = [];

    // Pre-allocated gradient caches per layer to eliminate GC thrashing
    let layer0Grad: CanvasGradient | null = null;
    let layer1Grad: CanvasGradient | null = null;
    let layer2Grad: CanvasGradient | null = null;

    const initMeadow = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      cssWidth = rect.width || window.innerWidth;
      cssHeight = rect.height || 660;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Create batched gradients once
      layer0Grad = ctx.createLinearGradient(0, cssHeight * 0.8, 0, cssHeight * 0.45);
      layer0Grad.addColorStop(0, currentTheme.grassRoot);
      layer0Grad.addColorStop(0.5, currentTheme.grassMid);
      layer0Grad.addColorStop(1, currentTheme.grassTip);

      layer1Grad = ctx.createLinearGradient(0, cssHeight * 0.9, 0, cssHeight * 0.5);
      layer1Grad.addColorStop(0, currentTheme.grassRoot);
      layer1Grad.addColorStop(0.45, currentTheme.grassMid);
      layer1Grad.addColorStop(1, currentTheme.grassTip);

      layer2Grad = ctx.createLinearGradient(0, cssHeight, 0, cssHeight * 0.55);
      layer2Grad.addColorStop(0, currentTheme.grassRoot);
      layer2Grad.addColorStop(0.4, currentTheme.grassMid);
      layer2Grad.addColorStop(0.85, currentTheme.grassTip);
      layer2Grad.addColorStop(1, '#bbf7d0');

      // 1. Initialize 1,200 Lush Grass Blades
      blades = [];
      const density = Math.min(Math.floor(cssWidth * 1.4), 1200);

      for (let i = 0; i < density; i++) {
        const layer = i % 3;
        const x = Math.random() * (cssWidth + 80) - 40;

        let hillBaseY = 0;
        if (layer === 0) {
          hillBaseY = cssHeight * 0.62 + Math.sin(x * 0.0025) * 35 + Math.cos(x * 0.006) * 18;
        } else if (layer === 1) {
          hillBaseY = cssHeight * 0.74 + Math.sin(x * 0.0035 + 1.2) * 28 + Math.cos(x * 0.008) * 14;
        } else {
          hillBaseY = cssHeight * 0.86 + Math.sin(x * 0.004 + 2.5) * 22 + Math.cos(x * 0.009) * 10;
        }

        const bladeLength =
          layer === 0
            ? 140 + Math.random() * 65
            : layer === 1
            ? 180 + Math.random() * 85
            : 220 + Math.random() * 100;

        blades.push({
          x,
          y: hillBaseY,
          length: bladeLength,
          baseWidth: layer === 0 ? 2.8 : layer === 1 ? 4.2 : 5.6,
          angle: (Math.random() - 0.5) * 0.28,
          currentAngle: (Math.random() - 0.5) * 0.28,
          stiffness: 0.1 + Math.random() * 0.05,
          phase: Math.random() * Math.PI * 2,
          speed: 1.1 + Math.random() * 1.3,
          layer,
          hasDew: layer === 2 && Math.random() < 0.22,
        });
      }

      blades.sort((a, b) => a.layer - b.layer);

      // 2. Initialize Wild Flowers
      flowers = [];
      const flowerTypes: ('daisy' | 'poppy' | 'lavender' | 'buttercup')[] = [
        'daisy',
        'poppy',
        'lavender',
        'buttercup',
        'daisy',
        'lavender',
      ];

      const flowerCount = Math.max(16, Math.floor(cssWidth / 70));
      for (let i = 0; i < flowerCount; i++) {
        const type = flowerTypes[i % flowerTypes.length];
        const x = (i / flowerCount) * cssWidth + (Math.random() - 0.5) * 45;
        const layer = Math.random() > 0.45 ? 2 : 1;
        const hillBaseY =
          layer === 1
            ? cssHeight * 0.74 + Math.sin(x * 0.0035 + 1.2) * 28
            : cssHeight * 0.86 + Math.sin(x * 0.004 + 2.5) * 22;

        let petalColor = '#ffffff';
        let centerColor = '#eab308';

        if (type === 'poppy') {
          petalColor = '#ef4444';
          centerColor = '#1e1b4b';
        } else if (type === 'lavender') {
          petalColor = '#a855f7';
          centerColor = '#7e22ce';
        } else if (type === 'buttercup') {
          petalColor = '#facc15';
          centerColor = '#ca8a04';
        }

        flowers.push({
          x,
          y: hillBaseY,
          type,
          stemHeight: 140 + Math.random() * 85,
          stemWidth: 3.4,
          swaySpeed: 1.0 + Math.random() * 0.7,
          swayPhase: Math.random() * Math.PI * 2,
          currentSway: 0,
          scale: 0.95 + Math.random() * 0.35,
          petalColor,
          centerColor,
          layer,
        });
      }

      // 3. Initialize Butterflies
      butterflies = [];
      const speciesList = currentTheme.butterflySpecies;
      for (let i = 0; i < currentTheme.butterflyCount; i++) {
        const spec = speciesList[i % speciesList.length];
        let baseColor = '#f97316';
        let patternColor = '#0f172a';
        let spotColor = '#ffffff';

        if (spec === 'morpho') {
          baseColor = '#0284c7';
          patternColor = '#0c4a6e';
          spotColor = '#e0f2fe';
        } else if (spec === 'emerald') {
          baseColor = '#10b981';
          patternColor = '#064e3b';
          spotColor = '#a7f3d0';
        } else if (spec === 'swallowtail') {
          baseColor = '#fbbf24';
          patternColor = '#18181b';
          spotColor = '#3b82f6';
        }

        butterflies.push({
          x: Math.random() * cssWidth,
          y: cssHeight * 0.22 + Math.random() * (cssHeight * 0.38),
          vx: (Math.random() > 0.5 ? 1 : -1) * (1.3 + Math.random() * 1.0),
          vy: (Math.random() - 0.5) * 0.8,
          size: 15 + Math.random() * 5,
          flapPhase: Math.random() * Math.PI * 2,
          flapSpeed: 0.22 + Math.random() * 0.08,
          pitch: 0,
          roll: 0,
          baseColor,
          patternColor,
          spotColor,
          targetX: Math.random() * cssWidth,
          targetY: cssHeight * 0.25 + Math.random() * (cssHeight * 0.35),
          turnTimer: 0,
          species: spec,
        });
      }

      // 4. Initialize Dandelion Spores
      dandelions = [];
      for (let i = 0; i < currentTheme.dandelionCount; i++) {
        dandelions.push({
          x: Math.random() * cssWidth,
          y: Math.random() * cssHeight * 0.85,
          vx: 0.6 + Math.random() * 0.9,
          vy: -0.2 - Math.random() * 0.4,
          size: 4.5 + Math.random() * 3,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          alpha: 0.4 + Math.random() * 0.45,
        });
      }

      // 5. Initialize Fireflies
      fireflies = [];
      for (let i = 0; i < currentTheme.fireflyCount; i++) {
        fireflies.push({
          x: Math.random() * cssWidth,
          y: cssHeight * 0.25 + Math.random() * (cssHeight * 0.65),
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.3 - Math.random() * 0.5,
          size: 2.5 + Math.random() * 2.5,
          alpha: Math.random(),
          alphaSpeed: 0.02 + Math.random() * 0.03,
          color: timeOfDay === 'aurora' ? '#6ee7b7' : timeOfDay === 'night' ? '#c7d2fe' : '#fef08a',
        });
      }
    };

    initMeadow();
    window.addEventListener('resize', initMeadow);

    // Red Polka Dot Amanita Mushrooms 🍄
    const getMushrooms = () => [
      { x: cssWidth * 0.24, y: cssHeight * 0.82, scale: 1.15 },
      { x: cssWidth * 0.68, y: cssHeight * 0.78, scale: 0.95 },
      { x: cssWidth * 0.84, y: cssHeight * 0.85, scale: 0.8 },
    ];

    const drawMushroom = (mx: number, my: number, s: number) => {
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(s, s);

      // Stalk
      ctx.fillStyle = '#fffdf7';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-7, -20, -4, -30);
      ctx.lineTo(4, -30);
      ctx.quadraticCurveTo(7, -20, 6, 0);
      ctx.closePath();
      ctx.fill();

      // Shadow under cap
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, -30, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red Cap
      const capGrad = ctx.createRadialGradient(-4, -42, 2, 0, -34, 22);
      capGrad.addColorStop(0, '#ff4b4b');
      capGrad.addColorStop(0.65, '#e11d48');
      capGrad.addColorStop(1, '#881337');
      ctx.fillStyle = capGrad;
      ctx.beginPath();
      ctx.arc(0, -32, 18, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // White Polka Dots
      ctx.fillStyle = '#ffffff';
      const dots = [
        { x: -7, y: -41, r: 3.0 },
        { x: 3, y: -44, r: 3.4 },
        { x: 10, y: -37, r: 2.6 },
        { x: -12, y: -35, r: 2.4 },
        { x: 0, y: -36, r: 2.8 },
      ];
      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    // Draw Rolling Meadow Hill Terrain Silhouette
    const drawRollingHill = (
      startYRatio: number,
      freq1: number,
      amp1: number,
      freq2: number,
      amp2: number,
      phase: number,
      colorTop: string,
      colorBottom: string
    ) => {
      ctx.save();
      const grad = ctx.createLinearGradient(0, cssHeight * startYRatio, 0, cssHeight);
      grad.addColorStop(0, colorTop);
      grad.addColorStop(1, colorBottom);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, cssHeight);
      for (let x = 0; x <= cssWidth + 20; x += 20) {
        const y = cssHeight * startYRatio + Math.sin(x * freq1 + phase) * amp1 + Math.cos(x * freq2) * amp2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(cssWidth, cssHeight);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // Flower Rendering
    const drawFlower = (fl: Flower, time: number, globalWind: number) => {
      const mouse = mousePosRef.current;
      const windForce = Math.sin(time * fl.swaySpeed + fl.swayPhase) * 18 + globalWind * 0.85;
      let targetSway = windForce;

      const dx = mouse.x - fl.x;
      const dy = mouse.y - (fl.y - fl.stemHeight * 0.7);
      const distSq = dx * dx + dy * dy;
      if (distSq < 16900) {
        const dist = Math.sqrt(distSq);
        const push = (1 - dist / 130) * 50;
        targetSway += (dx > 0 ? -1 : 1) * push;
      }

      fl.currentSway += (targetSway - fl.currentSway) * 0.12;

      const tipX = fl.x + fl.currentSway;
      const tipY = fl.y - fl.stemHeight;

      ctx.save();

      // Stem
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = fl.stemWidth;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y);
      ctx.quadraticCurveTo(fl.x + fl.currentSway * 0.45, fl.y - fl.stemHeight * 0.55, tipX, tipY);
      ctx.stroke();

      // Leaf
      const leafMidX = fl.x + fl.currentSway * 0.3;
      const leafMidY = fl.y - fl.stemHeight * 0.4;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(leafMidX + 9, leafMidY, 10, 4, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Blossom Head
      ctx.translate(tipX, tipY);
      ctx.scale(fl.scale, fl.scale);

      const tiltAngle = (fl.currentSway / fl.stemHeight) * 0.6;
      ctx.rotate(tiltAngle);

      if (fl.type === 'daisy') {
        const petalCount = 12;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 4;
        for (let p = 0; p < petalCount; p++) {
          const angle = (p / petalCount) * Math.PI * 2;
          ctx.save();
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.ellipse(0, 11, 3.6, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.shadowBlur = 0;

        const centerGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 7.5);
        centerGrad.addColorStop(0, '#fef08a');
        centerGrad.addColorStop(0.7, '#eab308');
        centerGrad.addColorStop(1, '#a16207');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (fl.type === 'poppy') {
        ctx.fillStyle = fl.petalColor;
        const poppyAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        poppyAngles.forEach((a) => {
          ctx.save();
          ctx.rotate(a);
          const pGrad = ctx.createRadialGradient(0, 9, 2, 0, 9, 14);
          pGrad.addColorStop(0, '#f87171');
          pGrad.addColorStop(0.7, '#ef4444');
          pGrad.addColorStop(1, '#991b1b');
          ctx.fillStyle = pGrad;
          ctx.beginPath();
          ctx.arc(0, 9, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (fl.type === 'lavender') {
        for (let row = 0; row < 7; row++) {
          const rowY = -row * 7;
          const clusterScale = 1 - row * 0.1;
          ctx.fillStyle = row % 2 === 0 ? '#c084fc' : '#a855f7';
          [-6, 0, 6].forEach((offsetX) => {
            ctx.beginPath();
            ctx.ellipse(offsetX * clusterScale, rowY, 4 * clusterScale, 3.2 * clusterScale, 0, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      } else if (fl.type === 'buttercup') {
        for (let p = 0; p < 5; p++) {
          ctx.save();
          ctx.rotate((p / 5) * Math.PI * 2);
          const bGrad = ctx.createRadialGradient(0, 7, 1, 0, 7, 9);
          bGrad.addColorStop(0, '#fef08a');
          bGrad.addColorStop(1, '#eab308');
          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.ellipse(0, 8, 5.5, 7.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    // Butterfly Rendering
    const drawRealisticButterfly = (b: RealisticButterfly) => {
      const mouse = mousePosRef.current;
      b.flapPhase += b.flapSpeed;
      const flap = Math.sin(b.flapPhase);

      const lift = Math.max(0, -Math.cos(b.flapPhase)) * 0.7;
      b.vy += (lift * -0.9 + 0.3) * 0.08;

      const dxMouse = mouse.x - b.x;
      const dyMouse = mouse.y - b.y;
      const distSqMouse = dxMouse * dxMouse + dyMouse * dyMouse;

      if (distSqMouse < 25600) {
        b.vx += (dxMouse > 0 ? -1 : 1) * 0.6;
        b.vy += (dyMouse > 0 ? -1 : 1) * 0.4;
      } else {
        b.turnTimer += 0.016;
        if (b.turnTimer > 2.5 || Math.random() < 0.01) {
          b.targetX = Math.random() * cssWidth;
          b.targetY = cssHeight * 0.18 + Math.random() * (cssHeight * 0.38);
          b.turnTimer = 0;
        }

        const targetVx = (b.targetX - b.x) * 0.008;
        const targetVy = (b.targetY - b.y) * 0.008;
        b.vx += (targetVx - b.vx) * 0.04;
        b.vy += (targetVy - b.vy) * 0.04;
      }

      b.vx = Math.max(-3.5, Math.min(3.5, b.vx));
      b.vy = Math.max(-2.2, Math.min(2.2, b.vy));

      b.x += b.vx;
      b.y += b.vy;

      if (b.x > cssWidth + 50) b.x = -40;
      if (b.x < -50) b.x = cssWidth + 40;
      if (b.y < cssHeight * 0.08) b.vy += 0.4;
      if (b.y > cssHeight * 0.75) b.vy -= 0.6;

      b.pitch = Math.atan2(b.vy, Math.abs(b.vx)) * 0.6;
      b.roll = (b.vx / 3.5) * 0.25;

      const facingRight = b.vx >= 0;
      const wingSpanCompression = Math.abs(flap);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(facingRight ? 1 : -1, 1);
      ctx.rotate(b.pitch);

      // Shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
      ctx.beginPath();
      ctx.ellipse(0, cssHeight * 0.35, b.size * 0.8 * wingSpanCompression, b.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const sz = b.size;

      const drawWingSet = (isRight: boolean) => {
        ctx.save();
        const sideMult = isRight ? 1 : -1;
        ctx.scale(sideMult * wingSpanCompression, 1);

        // FOREWING
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.2);
        ctx.bezierCurveTo(sz * 0.8, -sz * 1.3, sz * 1.5, -sz * 0.9, sz * 1.3, -sz * 0.1);
        ctx.quadraticCurveTo(sz * 0.8, sz * 0.1, 0, 0);
        ctx.closePath();

        const fwGrad = ctx.createRadialGradient(sz * 0.3, -sz * 0.3, 2, sz * 0.6, -sz * 0.5, sz * 1.2);
        fwGrad.addColorStop(0, '#ffffff');
        fwGrad.addColorStop(0.25, b.baseColor);
        fwGrad.addColorStop(0.85, b.patternColor);
        fwGrad.addColorStop(1, '#000000');
        ctx.fillStyle = fwGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -sz * 0.1);
        ctx.lineTo(sz * 0.9, -sz * 0.8);
        ctx.moveTo(0, -sz * 0.1);
        ctx.lineTo(sz * 1.1, -sz * 0.4);
        ctx.moveTo(0, -sz * 0.1);
        ctx.lineTo(sz * 0.9, -sz * 0.1);
        ctx.stroke();

        ctx.fillStyle = b.spotColor;
        [-sz * 0.7, -sz * 0.4, -sz * 0.1].forEach((dotY, idx) => {
          ctx.beginPath();
          ctx.arc(sz * (1.15 - idx * 0.1), dotY, 1.3, 0, Math.PI * 2);
          ctx.fill();
        });

        // HINDWING
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(sz * 0.7, sz * 0.2, sz * 1.0, sz * 0.8, sz * 0.4, sz * 1.1);
        ctx.quadraticCurveTo(0, sz * 0.7, 0, sz * 0.2);
        ctx.closePath();

        const hwGrad = ctx.createRadialGradient(sz * 0.2, sz * 0.3, 1, sz * 0.4, sz * 0.5, sz * 0.9);
        hwGrad.addColorStop(0, '#ffffff');
        hwGrad.addColorStop(0.35, b.baseColor);
        hwGrad.addColorStop(0.9, b.patternColor);
        hwGrad.addColorStop(1, '#000000');
        ctx.fillStyle = hwGrad;
        ctx.fill();

        ctx.fillStyle = b.spotColor;
        [sz * 0.5, sz * 0.8, sz * 1.0].forEach((dotY) => {
          ctx.beginPath();
          ctx.arc(sz * 0.5, dotY, 1.1, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.restore();
      };

      drawWingSet(false);
      drawWingSet(true);

      // BODY
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, sz * 0.1, 2.0, sz * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -sz * 0.3, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-0.5, -sz * 0.3);
      ctx.quadraticCurveTo(-4, -sz * 0.65, -6, -sz * 0.75);
      ctx.moveTo(0.5, -sz * 0.3);
      ctx.quadraticCurveTo(4, -sz * 0.65, 6, -sz * 0.75);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-6, -sz * 0.75, 1.0, 0, Math.PI * 2);
      ctx.arc(6, -sz * 0.75, 1.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    let lastTime = performance.now();
    let time = 0;

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      time += dt;

      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const globalWind = Math.sin(time * 1.5) * 20 + Math.cos(time * 0.7) * 10;
      const mouse = mousePosRef.current;

      // 1. Distant Rolling Hill
      drawRollingHill(0.65, 0.0025, 35, 0.006, 18, 0, currentTheme.hillFar, currentTheme.grassRoot);

      // 2. Layer 0 Grass (Back Hill) - Single fillStyle assignment!
      if (layer0Grad) ctx.fillStyle = layer0Grad;
      blades.forEach((blade) => {
        if (blade.layer !== 0) return;

        const wave = Math.sin(time * blade.speed + blade.phase) * 14;
        let targetBend = blade.angle * blade.length + globalWind * 0.6 + wave;

        const dx = mouse.x - blade.x;
        const dy = mouse.y - (blade.y - blade.length * 0.6);
        const distSq = dx * dx + dy * dy;
        if (distSq < 16900) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / 130) * 55;
          targetBend += (dx > 0 ? -1 : 1) * push;
        }

        blade.currentAngle += (targetBend - blade.currentAngle) * blade.stiffness;

        const tipX = blade.x + blade.currentAngle;
        const tipY = blade.y - blade.length;
        const midX = blade.x + blade.currentAngle * 0.45;
        const midY = blade.y - blade.length * 0.55;

        ctx.beginPath();
        ctx.moveTo(blade.x - blade.baseWidth / 2, blade.y);
        ctx.quadraticCurveTo(midX - 1, midY, tipX, tipY);
        ctx.quadraticCurveTo(midX + 1, midY, blade.x + blade.baseWidth / 2, blade.y);
        ctx.closePath();
        ctx.fill();
      });

      // 3. Mid Rolling Hill
      drawRollingHill(0.76, 0.0035, 28, 0.008, 14, 1.2, currentTheme.hillMid, currentTheme.grassRoot);

      // 4. Layer 1 Grass & Flowers (Mid Hill)
      if (layer1Grad) ctx.fillStyle = layer1Grad;
      blades.forEach((blade) => {
        if (blade.layer !== 1) return;

        const wave = Math.sin(time * blade.speed + blade.phase) * 22;
        let targetBend = blade.angle * blade.length + globalWind * 0.85 + wave;

        const dx = mouse.x - blade.x;
        const dy = mouse.y - (blade.y - blade.length * 0.6);
        const distSq = dx * dx + dy * dy;
        if (distSq < 18225) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / 135) * 60;
          targetBend += (dx > 0 ? -1 : 1) * push;
        }

        blade.currentAngle += (targetBend - blade.currentAngle) * blade.stiffness;

        const tipX = blade.x + blade.currentAngle;
        const tipY = blade.y - blade.length;
        const midX = blade.x + blade.currentAngle * 0.48;
        const midY = blade.y - blade.length * 0.55;

        ctx.beginPath();
        ctx.moveTo(blade.x - blade.baseWidth / 2, blade.y);
        ctx.quadraticCurveTo(midX - 1.2, midY, tipX, tipY);
        ctx.quadraticCurveTo(midX + 1.2, midY, blade.x + blade.baseWidth / 2, blade.y);
        ctx.closePath();
        ctx.fill();
      });

      flowers.forEach((fl) => {
        if (fl.layer === 1) drawFlower(fl, time, globalWind);
      });

      // 5. Foreground Rolling Hill
      drawRollingHill(0.87, 0.004, 22, 0.009, 10, 2.5, currentTheme.hillNear, currentTheme.grassRoot);

      // 6. Mushrooms
      getMushrooms().forEach((m) => {
        if (m.x < cssWidth + 60) drawMushroom(m.x, m.y, m.scale);
      });

      // 7. Layer 2 Grass & Flowers (Foreground)
      if (layer2Grad) ctx.fillStyle = layer2Grad;
      blades.forEach((blade) => {
        if (blade.layer !== 2) return;

        const wave = Math.sin(time * blade.speed + blade.phase) * 32;
        let targetBend = blade.angle * blade.length + globalWind * 1.15 + wave;

        const dx = mouse.x - blade.x;
        const dy = mouse.y - (blade.y - blade.length * 0.6);
        const distSq = dx * dx + dy * dy;
        if (distSq < 21025) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / 145) * 70;
          targetBend += (dx > 0 ? -1 : 1) * push;
        }

        blade.currentAngle += (targetBend - blade.currentAngle) * blade.stiffness;

        const tipX = blade.x + blade.currentAngle;
        const tipY = blade.y - blade.length;
        const midX = blade.x + blade.currentAngle * 0.52;
        const midY = blade.y - blade.length * 0.55;

        ctx.beginPath();
        ctx.moveTo(blade.x - blade.baseWidth / 2, blade.y);
        ctx.quadraticCurveTo(midX - 1.8, midY, tipX, tipY);
        ctx.quadraticCurveTo(midX + 1.8, midY, blade.x + blade.baseWidth / 2, blade.y);
        ctx.closePath();
        ctx.fill();

        if (blade.hasDew) {
          ctx.fillStyle = `rgba(255, 255, 255, ${currentTheme.dewAlpha})`;
          ctx.beginPath();
          ctx.arc(tipX, tipY + 2.5, 2.2, 0, Math.PI * 2);
          ctx.fill();
          if (layer2Grad) ctx.fillStyle = layer2Grad;
        }
      });

      flowers.forEach((fl) => {
        if (fl.layer === 2) drawFlower(fl, time, globalWind);
      });

      // 8. Dandelion Spores
      dandelions.forEach((d) => {
        d.x += d.vx + Math.sin(time + d.y * 0.01) * 0.35;
        d.y += d.vy;
        d.rot += d.rotSpeed;

        if (d.x > cssWidth + 20) d.x = -20;
        if (d.y < 0) d.y = cssHeight * 0.85;

        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rot);
        ctx.globalAlpha = d.alpha;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        for (let r = 0; r < 6; r++) {
          const ang = (r / 6) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(-d.size * Math.cos(ang), -d.size * Math.sin(ang));
          ctx.lineTo(d.size * Math.cos(ang), d.size * Math.sin(ang));
          ctx.stroke();
        }
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, d.size * 0.6, 1.4, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // 9. Fireflies
      fireflies.forEach((f) => {
        f.x += f.vx + Math.sin(time * 2 + f.y * 0.01) * 0.5;
        f.y += f.vy;
        f.alpha += f.alphaSpeed;
        if (f.alpha > 1 || f.alpha < 0.1) f.alphaSpeed = -f.alphaSpeed;

        if (f.y < cssHeight * 0.1) f.y = cssHeight * 0.85;
        if (f.x < 0) f.x = cssWidth;
        if (f.x > cssWidth) f.x = 0;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, f.alpha));
        const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size * 4);
        glow.addColorStop(0, f.color);
        glow.addColorStop(0.35, f.color);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 10. Butterflies
      butterflies.forEach((b) => {
        drawRealisticButterfly(b);
      });

      if (isRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    let isRunning = true;
    const startLoop = () => {
      if (!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    };

    const stopLoop = () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };

    // IntersectionObserver to sleep the canvas when footer is off-screen
    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              startLoop();
            } else {
              stopLoop();
            }
          });
        },
        { rootMargin: '300px' }
      );
      observer.observe(containerRef.current);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener('resize', initMeadow);
      stopLoop();
      if (observer) observer.disconnect();
    };
  }, [timeOfDay]);

  return (
    <footer
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`noska-meadow-footer-container theme-${timeOfDay}`}
      style={{ background: currentTheme.sky }}
    >
      {/* Seamless Top Atmospheric Transition Blend */}
      <div className="noska-meadow-top-feather" />

      {/* 1. Procedural 3D Canvas Ecosystem */}
      <canvas ref={canvasRef} className="noska-meadow-canvas" />

      {/* 2. Pristine Glowing White "Noska Flow" Typography */}
      <div className="noska-meadow-centerpiece select-none pointer-events-none">
        <div className="noska-normal-brand-wrap">
          <h2 className="noska-normal-brand-title">
            <span className="noska-title-brand">Noska </span>
            <span className="noska-title-flow">Flow</span>
          </h2>
          <p className="noska-normal-brand-subtitle">
            Speech-to-text intelligence across Noska all over
          </p>
        </div>
      </div>

      {/* 3. Complete Truthful Noska Bottom Navigation Bar */}
      <div className="noska-meadow-bottom-bar" style={{ color: currentTheme.navColor }}>
        <div className="noska-meadow-nav-left">
          <button
            onClick={() => navigate('/pricing')}
            className="noska-meadow-nav-link"
          >
            Pricing
          </button>
          <button
            onClick={() => navigate('/resources')}
            className="noska-meadow-nav-link"
          >
            Resources
          </button>
          <button
            onClick={() => navigate('/flow')}
            className="noska-meadow-nav-link highlight"
          >
            Noska Flow
          </button>
          <button
            onClick={() => navigate('/download')}
            className="noska-meadow-nav-link"
          >
            Download
          </button>
          <button
            onClick={() => navigate('/docs')}
            className="noska-meadow-nav-link"
          >
            Docs
          </button>
          <button
            onClick={() => navigate('/changelog')}
            className="noska-meadow-nav-link"
          >
            Status
            <ArrowUpRight size={10} className="inline-block ml-0.5 opacity-70" />
          </button>
          <button
            onClick={() => navigate('/privacy')}
            className="noska-meadow-nav-link"
          >
            Privacy
          </button>
          <button
            onClick={() => navigate('/terms')}
            className="noska-meadow-nav-link"
          >
            Terms
          </button>
        </div>

        <div className="noska-meadow-nav-right">
          <span className="noska-meadow-copyright">
            Noska Inc. © 2026 All rights reserved
          </span>
        </div>
      </div>
    </footer>
  );
}
