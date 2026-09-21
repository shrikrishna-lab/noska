import { useEffect, useMemo, useRef } from 'react';
import {
  motion, useMotionValue, useTransform, useReducedMotion,
} from 'framer-motion';

/* ─────────────────────────────────────────────────────────────
   McpAtmosphere — Premium WebGL Canvas Aurora & Living Background

   Shader: Soft aurora glowing waves with deep fluid color transitions,
   calibrated to Noska's MCP Sky-Lilac-Gold brand identity.
   ───────────────────────────────────────────────────────────── */

const GLYPHS = ['{', '}', '→', '←', '"rpc"', '01', '::', '=>', '[]', 'nsk', '⌘', '✦', '{ }', '·', '→', '✳'];

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_scroll;

  void main() {
    vec2 p = gl_FragCoord.xy / u_resolution.xy;
    p.x *= u_resolution.x / u_resolution.y;

    // Smooth sweeping waves based on harmonic sin/cos combinations
    float t = u_time * 0.14 + u_scroll * 0.4;
    vec2 m = u_mouse * 0.15;
    
    float wave1 = sin((p.x + m.x) * 1.8 + t) * 0.5 + 0.5;
    float wave2 = sin((p.y - m.y) * 2.6 - t * 1.2 + wave1) * 0.5 + 0.5;
    float wave3 = sin((p.x + p.y) * 1.7 + t * 0.8 + wave2 * 1.8) * 0.5 + 0.5;
    
    // Noska Brand Aurora Palette
    vec3 bg = vec3(0.93, 0.96, 0.99);              // #EDF5FC Soft Sky Canvas
    vec3 auroraMain = vec3(0.831, 0.796, 0.898);    // #D4CBE5 Lilac 500
    vec3 auroraSky = vec3(0.306, 0.553, 0.769);     // #4E8DC4 Noska Sky Blue
    vec3 auroraGold = vec3(0.878, 0.675, 0.247);    // #E0AC3F Noska Gold
    vec3 auroraViolet = vec3(0.612, 0.557, 0.722);  // #9C8EB8 Lilac 700
    
    vec3 currentLayer = mix(auroraMain, auroraSky, wave1);
    currentLayer = mix(currentLayer, auroraGold, wave2 * 0.55);
    currentLayer = mix(currentLayer, auroraViolet, wave3 * 0.35);
    
    // Mask out the aurora to flowing glowing bands
    float mask = smoothstep(0.35, 0.65, wave3);
    mask *= sin(gl_FragCoord.y / u_resolution.y * 3.14159) * 1.15;
    mask = clamp(mask, 0.0, 1.0);
    
    // Fluid color blend
    vec3 finalColor = mix(bg, currentLayer, mask * 0.42);
    
    // Ambient light highlights
    finalColor += auroraGold * smoothstep(0.76, 1.0, wave2) * 0.12;
    finalColor += auroraSky * smoothstep(0.70, 1.0, wave1) * 0.08;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function McpAuroraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return;

    const compileShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uTimeLocation = gl.getUniformLocation(program, 'u_time');
    const uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const uMouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const uScrollLocation = gl.getUniformLocation(program, 'u_scroll');

    let mouseX = 0;
    let mouseY = 0;
    let scrollNorm = 0;
    let isVisible = true;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = canvas.parentElement?.clientWidth || window.innerWidth;
      const height = canvas.parentElement?.clientHeight || window.innerHeight;
      
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize, { passive: true });
    resize();

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    const onScroll = () => {
      const el = document.querySelector('.marketing');
      const max = el ? el.scrollHeight - el.clientHeight : (document.body.scrollHeight - window.innerHeight);
      const top = el ? el.scrollTop : window.scrollY;
      scrollNorm = max > 0 ? top / max : 0;
    };
    const scrollTarget = document.querySelector('.marketing') || window;
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const startTime = Date.now();
    let animationFrameId: number;

    const render = () => {
      if (isVisible) {
        const elapsed = (Date.now() - startTime) / 1000;
        gl.uniform1f(uTimeLocation, elapsed);
        gl.uniform2f(uMouseLocation, mouseX, mouseY);
        gl.uniform1f(uScrollLocation, scrollNorm);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(animationFrameId);

      gl.deleteBuffer(buffer);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="mcp-shader-canvas" aria-hidden />;
}

// Shared passive scroll listener via MotionValue (no React re-renders during scroll)
function useSharedScrollY() {
  const scrollY = useMotionValue(0);

  useEffect(() => {
    const getTarget = () => document.querySelector('.marketing') || window;
    const target = getTarget();

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector('.marketing');
        const top = el ? el.scrollTop : window.scrollY;
        scrollY.set(top);
      });
    };

    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [scrollY]);

  return scrollY;
}

export function ScrollProgress() {
  const scrollY = useSharedScrollY();
  const scaleX = useTransform(scrollY, (v) => {
    const el = document.querySelector('.marketing');
    const max = el ? el.scrollHeight - el.clientHeight : (document.body.scrollHeight - window.innerHeight);
    return max > 0 ? Math.min(1, Math.max(0, v / max)) : 0;
  });

  return (
    <div className="mcp-progress" aria-hidden>
      <motion.div className="mcp-progress-fill" style={{ scaleX }} />
    </div>
  );
}

export function McpAtmosphere() {
  const reduce = useReducedMotion();

  const glyphs = useMemo(
    () => GLYPHS.map((g, i) => ({
      g,
      left: (i * 61.8) % 100,
      size: 11 + ((i * 7) % 16),
      dur: 16 + ((i * 13) % 18),
      delay: -((i * 3.7) % 20),
      gold: i % 3 === 0,
    })),
    [],
  );

  if (reduce) {
    return <div className="mcp-atmo" aria-hidden />;
  }

  return (
    <div className="mcp-atmo" aria-hidden>
      {/* WebGL Soft Aurora Glowing Waves Canvas */}
      <McpAuroraCanvas />

      {/* Floating RPC Glyphs */}
      <div className="mcp-glyphs">
        {glyphs.map((gl, i) => (
          <span
            key={i}
            className={`mcp-glyph ${gl.gold ? 'gold' : ''}`}
            style={{
              left: `${gl.left}%`,
              fontSize: gl.size,
              animationDuration: `${gl.dur}s`,
              animationDelay: `${gl.delay}s`,
            }}
          >
            {gl.g}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Scroll-cue at the hero's base — a breathing gold line */
export function ScrollCue({ label = 'scroll' }: { label?: string }) {
  return (
    <div className="mcp-scrollcue" aria-hidden>
      <span className="mcp-scrollcue-label">{label}</span>
      <span className="mcp-scrollcue-line"><i /></span>
    </div>
  );
}