"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Siri-style GLSL shaders rendered on a raw WebGL canvas.
 *
 * - `"wave"`        — the iOS voice waveform (chromatic, frequency-reactive).
 * - `"fluid-dots"`  — six metaball dots that merge, scatter and gather.
 *
 * Self-contained: a single fullscreen triangle drives a fragment shader, no
 * external WebGL library.
 */

export type SiriWaveVariant = "wave" | "fluid-dots";

const VERTEX_SHADER = `attribute vec2 aPos; void main(){ gl_Position=vec4(aPos,0.0,1.0); }`;

const WAVE_SHADER = `precision highp float;
uniform vec2 iResolution; uniform float iTime;
const float PI = 3.14159265359;

// Tuned to read as one slow, liquid ribbon rather than a strobing waveform.
//
// Every value below was reduced from a far more aggressive original, and the
// three structural changes matter most:
//   1. No "band" term. A sharp 1/(d+thickness) band drawn around each wave
//      line produced hard vertical streaks that flickered as the line swept.
//   2. No mod() wrap on time. \`mod(t, N)\` jumped discontinuously every N
//      seconds, which read as a blink in the middle of otherwise calm motion.
//   3. One slow breathing envelope instead of three beating sines, so the
//      amplitude no longer pulses at multiple incommensurate rates.
const float AMPLITUDE   = 0.22;
const float FREQ        = 0.80;   // was 1.15 — fewer crests across the orb
const float ABER_FREQ   = 0.74;   // was 1.05
const float SPEED       = 0.55;   // was 2.20 — much slower travel
const float WAVE_SCALE  = 0.62;
const float ABERRATION  = 0.50;   // was 2.40 — the main source of shimmer
const float THICKNESS   = 1.60;   // was 2.60
const float INTENSITY   = 4.20;   // was 2.20
const float FALLOFF     = 1.55;
const float EDGE_MASK   = 0.40;
const float SOFTNESS    = 4.00;   // was 2.80 — wide, velvet falloff
const float BREATHE_RATE = 0.34;  // ~18s per cycle

// High-end Apple Siri Aurora palette. The hue phase advances mainly across x
// and only drifts very slowly with time, so the colour never strobes.
vec3 getSiriPalette(int s, float t, float xN){
    float phase = fract(float(s) * 0.25 + xN * 0.10 + t * 0.014);
    vec3 c1 = vec3(1.00, 0.12, 0.52); // Ethereal Raspberry Hot Pink
    vec3 c2 = vec3(0.68, 0.22, 1.00); // Luminous Velvet Violet / Indigo
    vec3 c3 = vec3(0.00, 0.82, 1.00); // Electric Cyan Sky
    vec3 c4 = vec3(0.12, 0.96, 0.72); // Soft Emerald Mint

    if(phase < 0.25) return mix(c1, c2, phase / 0.25);
    if(phase < 0.50) return mix(c2, c3, (phase - 0.25) / 0.25);
    if(phase < 0.75) return mix(c3, c4, (phase - 0.50) / 0.25);
    return mix(c4, c1, (phase - 0.75) / 0.25);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 R = iResolution.xy;
    float aspect = R.x / max(R.y, 1.0);
    vec2 p = (fragCoord + 0.5) * 2.0 / R - 1.0;
    p.x *= aspect;
    float yScreen = p.y;
    p /= max(WAVE_SCALE, 0.1);

    float t = iTime;

    // Single slow envelope. Keeping it monotone and slow is what makes the
    // motion read as breathing rather than pulsing.
    float breathe = 0.5 + 0.5 * sin(t * BREATHE_RATE);

    float xN = p.x / max(aspect, 1.0);
    float env = cos(PI * 0.5 * min(abs(0.9 * xN), 1.0));
    env *= env;

    float A1  = AMPLITUDE * (0.92 + 0.16 * breathe);
    float AB  = ABERRATION * (0.88 + 0.24 * breathe);
    float th  = 0.010 * THICKNESS;
    float inten = 0.010 * (INTENSITY + 0.35 * breathe);
    float soft  = 0.010 * max(SOFTNESS, 1.0);

    // Continuous phase: never wraps, so there is no periodic jump.
    float drift = t * SPEED;
    float yMain = A1 * env * sin(p.x * FREQ + drift);

    vec3 num = vec3(0.0), den = vec3(0.0);
    for(int s = 0; s < 4; s++){
        vec3 hue = getSiriPalette(s, t, xN);
        den += hue;
        float ab = mix(-AB, AB, float(s) / 3.0);
        float yL = A1 * env * sin(p.x * ABER_FREQ + drift + ab);
        float d  = abs(p.y - yL);
        float line = inten / (sqrt(d * d + soft * soft) + th);
        num += hue * line;
    }
    vec3 col = num / den;

    float dM   = abs(p.y - yMain);
    col += 0.35 * inten / (sqrt(dM * dM + soft * soft) + th);

    // Soft highlight rolloff. A hard clamp made every crest that crossed 1.0
    // pop to flat white and then drop back, which read as a blink.
    col = vec3(1.0) - exp(-col * 1.35);

    float emT = clamp((abs(yScreen) - 1.0) / (-max(EDGE_MASK, 1e-4)), 0.0, 1.0);
    float em  = emT * emT * (3.0 - 2.0 * emT);
    float gauss = exp(-pow(xN * FALLOFF, 2.0));
    col *= mix(1.0, em * gauss, 1.0);

    // Smoothstep instead of a linear clamp: transparency ramps in gradually,
    // so the ribbon fades in and out without a visible edge popping.
    float peak = max(max(col.r, col.g), col.b);
    float alpha = smoothstep(0.0, 1.0, peak * 2.2);
    // The context is created with premultipliedAlpha:false and blends
    // SRC_ALPHA/ONE_MINUS_SRC_ALPHA, so colour must NOT be pre-multiplied —
    // doing both dims the whole ribbon by alpha twice.
    fragColor = vec4(col, alpha);
}
void main(){ mainImage(gl_FragColor, gl_FragCoord.xy); }`;

const FLUID_DOTS_SHADER = `precision highp float;
uniform vec2 iResolution; uniform float iTime;
const float TAU = 6.28318530718;
const int   N   = 6;
const float SMOOTH_K = 0.08;
const float INTENSITY  = 0.0025;
const float FALLOFF_P  = 1.35;
const float FADE_START = 0.02;
const float FADE_END   = 0.56;
const float ABERR = 0.005;
const vec3  SPECTRAL = vec3(0.0, 0.5, 1.0) * ABERR;
const float HUE_SPEED = 0.06;
const float COLOR_K   = 0.5;
const float SAT       = 0.01;
const float HUE_SPAN  = 0.667;
const float MERGE_PERIOD = 6.0;
const float T_MOVE   = 1.25;
const float STAGGER  = 0.33;
const float HOLD     = 0.0;
const float W = 4.6;
const float L = 3.2;
const float PIERCE  = 0.12;
const float RECOIL  = 0.035;
const float REC_LAG = 0.11;
const float GATHER_PERIOD = 12.0;
const float GATHER_START  = 9.2;
const float GATHER_HOLD   = 0.8;
const float GATHER_R      = 0.008;
const float GATHER_DIM    = 0.85;
const float GATHER_IN     = 1.8;
const float GATHER_IN_L   = 7.5;
const float BURST_W = 6.5;
const float BURST_L = 4.0;
const float CHARGE_T     = 0.30;
const float CHARGE_SHRK  = 0.18;
const float CHARGE_GLOW  = 0.35;
const float FLASH_GAIN   = 1.2;
const float FLASH_DECAY  = 7.0;

float hash11(float n){ return fract(sin(n*127.1 + 311.7)*43758.5453); }
float settleWL(float tau, float w, float l){
    if(tau <= 0.0) return 0.0;
    return 1.0 - exp(-l*tau)*cos(w*tau);
}
float settle(float tau){ return settleWL(tau, W, L); }
float settleCrit(float tau, float l){
    if(tau <= 0.0) return 0.0;
    return 1.0 - exp(-l*tau)*(1.0 + l*tau);
}
float smin(float a, float b, float k){
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h*h*k*0.25;
}
vec3 hue2rgb(float h){
    h = fract(h);
    float r = clamp(abs(h*6.0 - 3.0) - 1.0, 0.0, 1.0);
    float g = clamp(2.0 - abs(h*6.0 - 2.0), 0.0, 1.0);
    float b = clamp(2.0 - abs(h*6.0 - 4.0), 0.0, 1.0);
    return vec3(r, g, b);
}
float dotR(float fi, float seed, float t){
    return 0.036 + 0.010*sin(t*1.3 + seed*TAU) + 0.005*sin(t*2.4 + fi*1.3);
}
float dotSD(vec2 p, vec2 pos, float r, float t, float fi, float shapeDamp){
    vec2 d = p - pos;
    float sq = 0.075 * (0.5 + 0.5*sin(t*0.9 + fi*2.0)) * shapeDamp;
    float ca = cos(t*0.35 + fi), sa = sin(t*0.35 + fi);
    d = mat2(ca,-sa,sa,ca) * d;
    d *= vec2(1.0+sq, 1.0-sq);
    return length(d) - r;
}
vec3 scene(vec2 p, float t){
    float k  = floor(t/MERGE_PERIOD);
    float u  = fract(t/MERGE_PERIOD);
    float te = u * MERGE_PERIOD;
    float tg = mod(t, GATHER_PERIOD);
    float g  = settleCrit((tg - GATHER_START) * GATHER_IN, GATHER_IN_L)
             - settleWL(tg - GATHER_START - GATHER_HOLD, BURST_W, BURST_L);
    float gC = clamp(g, 0.0, 1.0);
    float tb     = tg - (GATHER_START + GATHER_HOLD);
    float charge = smoothstep(-CHARGE_T, 0.0, min(tb, 0.0)) * gC;
    float flash  = tb > 0.0 ? exp(-tb * FLASH_DECAY) : 0.0;
    float gBright = mix(1.0, GATHER_DIM, gC) * (1.0 + CHARGE_GLOW*charge + FLASH_GAIN*flash);
    vec3  total3 = vec3(1e5);
    vec3  cAcc   = vec3(0.0);
    float wAcc   = 1e-6;
    for(int i=0; i<N; i++){
        float fi   = float(i);
        float seed = hash11(fi);
        float ang = fi/float(N)*TAU + t*0.35;
        vec2 dir  = vec2(cos(ang), sin(ang));
        float R = 0.17 + 0.010*sin(t*1.0) + 0.007*sin(t*1.3 + seed*TAU);
        float pairId   = mod(fi, 3.0);
        float moverLow = mod(k + pairId, 2.0);
        float isMover  = (fi < 2.5) ? step(moverLow, 0.5) : step(0.5, moverLow);
        float goStart  = pairId * STAGGER;
        float retStart = 3.0*STAGGER + HOLD + pairId * STAGGER;
        float m   = (settle(te - goStart)           - settle(te - retStart))           * isMover;
        float rec = (settle(te - goStart - REC_LAG) - settle(te - retStart - REC_LAG)) * (1.0 - isMover);
        float rSelf = dotR(fi, seed, t);
        rSelf = mix(rSelf, 0.036, gC);
        rSelf *= 1.0 - CHARGE_SHRK * charge;
        float fj    = mod(fi + 3.0, 6.0);
        float rPart = dotR(fj, hash11(fj), t);
        float deep   = -(R + RECOIL) - PIERCE * rPart;
        float radial = mix(R, deep, m) + RECOIL * rec;
        radial = mix(radial, GATHER_R, g);
        vec2  pos    = radial * dir;
        float sdR = dotSD(p - SPECTRAL.r*dir, pos, rSelf, t, fi, 1.0 - gC);
        float sdG = dotSD(p - SPECTRAL.g*dir, pos, rSelf, t, fi, 1.0 - gC);
        float sdB = dotSD(p - SPECTRAL.b*dir, pos, rSelf, t, fi, 1.0 - gC);
        total3 = vec3( smin(total3.r, sdR, SMOOTH_K),
                       smin(total3.g, sdG, SMOOTH_K),
                       smin(total3.b, sdB, SMOOTH_K) );
        float hue = fract(fi/float(N) + t*HUE_SPEED) * HUE_SPAN;
        vec3 dotCol = mix(vec3(1.0), hue2rgb(hue), SAT);
        float w = exp(-sdG * COLOR_K);
        cAcc += w * dotCol;
        wAcc += w;
    }
    vec3 sd3    = max(total3, vec3(0.0)) + 1e-4;
    vec3 core3  = clamp(INTENSITY / pow(sd3, vec3(FALLOFF_P)), 0.0, 1.0);
    vec3 edge3  = 1.0 - smoothstep(vec3(FADE_START), vec3(FADE_END), sd3);
    vec3 bright = core3 * edge3 * gBright;
    return bright * (cAcc / wAcc);
}
void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 res = iResolution.xy;
    vec2 p = (2.0*fragCoord - res) / min(res.x, res.y);
    float t = iTime;
    p /= 1.0 + 0.03*sin(t*1.0);
    vec3 col = scene(p, t);
    col *= 1.0 + 0.05*sin(t*1.0 + 1.0);
    col = pow(col, vec3(1.0/1.2));
    col = min(col, 1.0);
    float n = fract(sin(dot(fragCoord, vec2(12.9898,78.233)))*43758.5453);
    col += (n - 0.5)/255.0;
    float alpha = clamp(max(max(col.r, col.g), col.b) * 2.2, 0.0, 1.0);
    fragColor = vec4(col, alpha);
}
void main(){ mainImage(gl_FragColor, gl_FragCoord.xy); }`;

const FRAGMENT_SHADERS: Record<SiriWaveVariant, string> = {
  wave: WAVE_SHADER,
  "fluid-dots": FLUID_DOTS_SHADER,
};

export interface SiriWaveProps
  extends Omit<React.HTMLAttributes<HTMLCanvasElement>, "children"> {
  /** Which shader to render. */
  variant?: SiriWaveVariant;
  /** CSS display width/height or square size in px. */
  size?: number;
  width?: number | string;
  height?: number | string;
  /** Internal render resolution multiplier. */
  renderScale?: number;
}

export function SiriWave({
  variant = "wave",
  size,
  width,
  height,
  renderScale = 1.0,
  className,
  style,
  ...props
}: SiriWaveProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(log ?? "shader compile error");
      }
      return shader;
    };

    let program: WebGLProgram;
    let vs: WebGLShader;
    let fs: WebGLShader;
    try {
      program = gl.createProgram()!;
      vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADERS[variant]);
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.useProgram(program);
    } catch (e) {
      console.error("Failed to compile SiriWave shader", e);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");

    let curW = 0;
    let curH = 0;
    // Backing-store scale. The orb is ~110 CSS px wide; at 1x that is far too
    // few pixels for a shader with four overlapping wave lines, so it aliased
    // into the hard vertical spikes. Rasterise at device resolution instead.
    let pixelRatio = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || canvas.clientWidth || (typeof width === "number" ? width : size) || 280;
      const h = rect.height || canvas.clientHeight || (typeof height === "number" ? height : size) || 120;
      const dpr = Math.min(3, Math.max(1, (typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1));
      const dimW = Math.max(32, Math.round(w * renderScale * dpr));
      const dimH = Math.max(32, Math.round(h * renderScale * dpr));

      if (curW !== dimW || curH !== dimH) {
        curW = dimW;
        curH = dimH;
        pixelRatio = dpr;
        canvas.width = dimW;
        canvas.height = dimH;
        gl.viewport(0, 0, dimW, dimH);
      }
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);

    let raf = 0;
    let last = performance.now();
    // Smoothed clock. requestAnimationFrame is throttled in background tabs, so
    // the raw elapsed time jumps by seconds on the first frame after the tab
    // becomes visible again — the wave visibly teleports. Advancing by a
    // clamped delta keeps motion continuous across those gaps.
    let clock = 0;
    const frame = () => {
      const now = performance.now();
      const delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      clock += delta;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uResolution, curW, curH);
      gl.uniform1f(uTime, clock);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
    // `pixelRatio` is only read inside `resize`, which the observer re-runs.
  }, [variant, size, width, height, renderScale]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block pointer-events-none", className)}
      style={{
        width: width ?? (size ? `${size}px` : "100%"),
        height: height ?? (size ? `${size}px` : "100%"),
        ...style,
      }}
      {...props}
    />
  );
}

export default SiriWave;
