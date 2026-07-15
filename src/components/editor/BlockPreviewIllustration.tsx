import React from "react";
import type { NormalizedCommand } from "../../core/commands/CommandRegistry";

/**
 * BlockPreviewIllustration — renders a stylized "skeleton" illustration of what
 * a block looks like, per command. Mirrors Notion's slash-menu preview cards.
 *
 * Every command maps to a visual archetype (see resolveVariant). Illustrations
 * are drawn with SVG using theme CSS variables so they adapt to light/dark mode.
 *
 * Props:
 *   command — normalized command object ({ id, category, icon, title, ... })
 *   width   — illustration width (default 236)
 *   height  — illustration height (default 132)
 */

// ── Palette (theme-aware via CSS variables with sensible fallbacks) ──────────
const C = {
  surface: "var(--surface-2, #f4f4f5)",
  line: "var(--border, #e4e4e7)",
  skeleton: "var(--hover, #e4e4e7)",
  skeletonSoft: "var(--surface-1, #efeff1)",
  text: "var(--muted, #a1a1aa)",
  accent: "var(--accent, #f59e0b)",
  accentSoft: "color-mix(in srgb, var(--accent, #f59e0b) 18%, transparent)",
  accentLine: "color-mix(in srgb, var(--accent, #f59e0b) 45%, transparent)",
};

interface LineProps {
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
  rx?: number;
}

// Rounded skeleton line helper
function Line({ x, y, w, h = 7, fill = C.skeleton, rx }: LineProps) {
  return <rect x={x} y={y} width={w} height={h} rx={rx ?? h / 2} fill={fill} />;
}

// ── Variant renderers ────────────────────────────────────────────────────────
// Each entry renders a distinct SVG skeleton illustration; several accept an
// optional numeric level/count/color argument (heading/toggleHeading level,
// columns count, color hex). Left untyped as a Record (relying on inference)
// rather than a single shared function signature, since each variant's
// parameter type/default differs (number for level/count, string for color)
// and resolveVariant always calls each one with the argument type it expects.
const VARIANTS = {
  text: () => (
    <>
      <Line x={20} y={30} w={196} />
      <Line x={20} y={48} w={170} fill={C.skeletonSoft} />
      <Line x={20} y={66} w={188} fill={C.skeletonSoft} />
      <Line x={20} y={84} w={120} fill={C.skeletonSoft} />
    </>
  ),
  heading: (lvl = 1) => {
    const h = [16, 13, 11, 9][lvl - 1] || 11;
    const w = [150, 130, 110, 92][lvl - 1] || 120;
    return (
      <>
        <Line x={20} y={30} w={w} h={h} fill={C.skeleton} rx={4} />
        <Line x={20} y={30 + h + 12} w={196} h={6} fill={C.skeletonSoft} />
        <Line x={20} y={30 + h + 26} w={160} h={6} fill={C.skeletonSoft} />
      </>
    );
  },
  bullet: () => (
    <>
      {[34, 56, 78].map((y, i) => (
        <React.Fragment key={y}>
          <circle cx={24} cy={y + 3} r={3} fill={C.text} />
          <Line x={36} y={y} w={[170, 150, 130][i]} fill={C.skeletonSoft} />
        </React.Fragment>
      ))}
    </>
  ),
  numbered: () => (
    <>
      {["1", "2", "3"].map((n, i) => (
        <React.Fragment key={n}>
          <text x={20} y={i * 22 + 40} fontSize="10" fontFamily="system-ui" fill={C.text}>{n}.</text>
          <Line x={38} y={i * 22 + 33} w={[168, 148, 128][i]} fill={C.skeletonSoft} />
        </React.Fragment>
      ))}
    </>
  ),
  todo: () => (
    <>
      {[34, 56, 78].map((y, i) => (
        <React.Fragment key={y}>
          <rect x={20} y={y - 1} width={11} height={11} rx={3} fill={i === 0 ? C.accent : "none"} stroke={i === 0 ? C.accent : C.text} strokeWidth={1.5} />
          {i === 0 && <path d={`M23 ${y + 4.5} l2.4 2.4 l4-4.5`} stroke="#fff" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          <Line x={40} y={y} w={[164, 144, 124][i]} fill={C.skeletonSoft} />
        </React.Fragment>
      ))}
    </>
  ),
  toggle: () => (
    <>
      <path d="M22 32 l7 5 l-7 5" stroke={C.text} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Line x={38} y={33} w={150} h={9} fill={C.skeleton} rx={4} />
      <Line x={38} y={54} w={160} h={6} fill={C.skeletonSoft} />
      <Line x={38} y={68} w={140} h={6} fill={C.skeletonSoft} />
    </>
  ),
  callout: () => (
    <>
      <rect x={20} y={26} width={196} height={80} rx={8} fill={C.accentSoft} stroke={C.accentLine} strokeWidth={1} />
      <circle cx={42} cy={52} r={13} fill={C.accent} opacity={0.55} />
      <Line x={64} y={42} w={132} h={7} fill={C.accentLine} />
      <Line x={64} y={58} w={116} h={6} fill={C.accentSoft} />
      <Line x={64} y={72} w={88} h={6} fill={C.accentSoft} />
    </>
  ),
  quote: () => (
    <>
      <rect x={20} y={28} width={4} height={72} rx={2} fill={C.accent} opacity={0.6} />
      <Line x={36} y={34} w={176} fill={C.skeletonSoft} />
      <Line x={36} y={52} w={160} fill={C.skeletonSoft} />
      <Line x={36} y={70} w={130} fill={C.skeletonSoft} />
    </>
  ),
  divider: () => (
    <>
      <Line x={20} y={40} w={196} h={6} fill={C.skeletonSoft} />
      <rect x={20} y={64} width={196} height={2} rx={1} fill={C.text} opacity={0.5} />
      <Line x={20} y={84} w={150} h={6} fill={C.skeletonSoft} />
    </>
  ),
  table: () => (
    <>
      <rect x={20} y={24} width={196} height={84} rx={5} fill="none" stroke={C.line} strokeWidth={1} />
      <rect x={20} y={24} width={196} height={20} rx={5} fill={C.skeleton} />
      <line x1={85} y1={24} x2={85} y2={108} stroke={C.line} strokeWidth={1} />
      <line x1={150} y1={24} x2={150} y2={108} stroke={C.line} strokeWidth={1} />
      <line x1={20} y1={65} x2={216} y2={65} stroke={C.line} strokeWidth={1} />
      <line x1={20} y1={86} x2={216} y2={86} stroke={C.line} strokeWidth={1} />
    </>
  ),
  code: () => (
    <>
      <rect x={20} y={24} width={196} height={84} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <Line x={32} y={38} w={40} h={5} fill={C.accentLine} />
      <Line x={78} y={38} w={70} h={5} fill={C.skeleton} />
      <Line x={44} y={54} w={90} h={5} fill={C.skeleton} />
      <Line x={44} y={68} w={60} h={5} fill={C.accentLine} />
      <Line x={32} y={82} w={50} h={5} fill={C.skeleton} />
    </>
  ),
  image: () => (
    <>
      <rect x={20} y={24} width={196} height={84} rx={6} fill={C.skeletonSoft} stroke={C.line} strokeWidth={1} />
      <circle cx={58} cy={54} r={10} fill={C.accent} opacity={0.4} />
      <path d="M32 100 l40 -34 l30 24 l28 -20 l34 30 z" fill={C.skeleton} />
    </>
  ),
  video: () => (
    <>
      <rect x={20} y={24} width={196} height={84} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <circle cx={118} cy={66} r={18} fill={C.accent} opacity={0.55} />
      <path d="M113 58 l12 8 l-12 8 z" fill="#fff" />
    </>
  ),
  audio: () => (
    <>
      <rect x={20} y={44} width={196} height={44} rx={22} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <circle cx={44} cy={66} r={12} fill={C.accent} opacity={0.5} />
      {[70, 82, 94, 106, 118, 130, 142, 154, 166, 178].map((x, i) => (
        <rect key={x} x={x} y={66 - (i % 3 === 0 ? 12 : 6)} width={3} height={(i % 3 === 0 ? 24 : 12)} rx={1.5} fill={C.skeleton} />
      ))}
    </>
  ),
  file: () => (
    <>
      <rect x={72} y={26} width={80} height={80} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <path d="M132 26 l20 20 h-20 z" fill={C.skeleton} />
      <Line x={84} y={62} w={56} h={5} fill={C.skeletonSoft} />
      <Line x={84} y={74} w={44} h={5} fill={C.skeletonSoft} />
      <circle cx={112} cy={94} r={7} fill={C.accent} opacity={0.5} />
    </>
  ),
  bookmark: () => (
    <>
      <rect x={20} y={30} width={196} height={70} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <rect x={150} y={30} width={66} height={70} rx={6} fill={C.skeleton} />
      <Line x={32} y={44} w={100} h={7} fill={C.skeleton} />
      <Line x={32} y={60} w={110} h={5} fill={C.skeletonSoft} />
      <Line x={32} y={72} w={80} h={5} fill={C.skeletonSoft} />
      <circle cx={40} cy={90} r={4} fill={C.accentLine} />
    </>
  ),
  database: () => (
    <>
      <rect x={20} y={22} width={196} height={14} rx={4} fill={C.skeletonSoft} />
      <rect x={20} y={26} width={44} height={6} rx={3} fill={C.accentLine} />
      <rect x={20} y={44} width={196} height={64} rx={5} fill="none" stroke={C.line} strokeWidth={1} />
      <line x1={85} y1={44} x2={85} y2={108} stroke={C.line} strokeWidth={1} />
      <line x1={150} y1={44} x2={150} y2={108} stroke={C.line} strokeWidth={1} />
      <line x1={20} y1={66} x2={216} y2={66} stroke={C.line} strokeWidth={1} />
      <line x1={20} y1={87} x2={216} y2={87} stroke={C.line} strokeWidth={1} />
    </>
  ),
  board: () => (
    <>
      {[20, 88, 156].map((x, i) => (
        <React.Fragment key={x}>
          <Line x={x} y={26} w={44} h={6} fill={C.accentLine} />
          <rect x={x} y={38} width={52} height={26} rx={4} fill={C.surface} stroke={C.line} strokeWidth={1} />
          <rect x={x} y={70} width={52} height={26} rx={4} fill={C.surface} stroke={C.line} strokeWidth={1} />
        </React.Fragment>
      ))}
    </>
  ),
  gallery: () => (
    <>
      {[[20, 26], [88, 26], [156, 26], [20, 70], [88, 70], [156, 70]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={52} height={36} rx={5} fill={i % 2 ? C.skeletonSoft : C.skeleton} stroke={C.line} strokeWidth={1} />
      ))}
    </>
  ),
  calendar: () => (
    <>
      <rect x={20} y={24} width={196} height={84} rx={6} fill="none" stroke={C.line} strokeWidth={1} />
      {[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => (
        <rect key={`${c}-${r}`} x={30 + c * 46} y={34 + r * 24} width={36} height={16} rx={3}
          fill={c === 1 && r === 1 ? C.accentSoft : C.skeletonSoft} stroke={c === 1 && r === 1 ? C.accentLine : "none"} strokeWidth={1} />
      )))}
    </>
  ),
  timeline: () => (
    <>
      <line x1={20} y1={30} x2={216} y2={30} stroke={C.line} strokeWidth={1} />
      <rect x={30} y={44} width={90} height={12} rx={6} fill={C.accentLine} />
      <rect x={70} y={64} width={110} height={12} rx={6} fill={C.skeleton} />
      <rect x={40} y={84} width={70} height={12} rx={6} fill={C.skeletonSoft} />
    </>
  ),
  list: () => (
    <>
      {[32, 54, 76, 98].map((y, i) => (
        <React.Fragment key={y}>
          <rect x={20} y={y - 4} width={196} height={18} rx={3} fill={i % 2 ? C.skeletonSoft : "none"} />
          <circle cx={30} cy={y + 4} r={3} fill={C.text} />
          <Line x={42} y={y} w={[160, 140, 150, 120][i]} h={6} fill={C.skeleton} />
        </React.Fragment>
      ))}
    </>
  ),
  feed: () => (
    <>
      {[26, 70].map((y) => (
        <React.Fragment key={y}>
          <rect x={20} y={y} width={196} height={38} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
          <circle cx={38} cy={y + 19} r={9} fill={C.accent} opacity={0.4} />
          <Line x={54} y={y + 10} w={120} h={6} fill={C.skeleton} />
          <Line x={54} y={y + 23} w={90} h={5} fill={C.skeletonSoft} />
        </React.Fragment>
      ))}
    </>
  ),
  barV: () => (
    <>
      <line x1={24} y1={102} x2={216} y2={102} stroke={C.line} strokeWidth={1} />
      {[[38, 40], [74, 62], [110, 30], [146, 74], [182, 52]].map(([x, h], i) => (
        <rect key={x} x={x} y={102 - h} width={22} height={h} rx={3} fill={i === 3 ? C.accent : C.accentLine} opacity={i === 3 ? 0.7 : 0.5} />
      ))}
    </>
  ),
  barH: () => (
    <>
      <line x1={26} y1={26} x2={26} y2={104} stroke={C.line} strokeWidth={1} />
      {[[34, 150], [52, 110], [70, 180], [88, 90]].map(([y, w], i) => (
        <rect key={y} x={28} y={y} width={w} height={14} rx={3} fill={i === 2 ? C.accent : C.accentLine} opacity={i === 2 ? 0.7 : 0.5} />
      ))}
    </>
  ),
  line: () => (
    <>
      <line x1={24} y1={102} x2={216} y2={102} stroke={C.line} strokeWidth={1} />
      <polyline points="30,88 68,60 106,74 144,40 182,54 210,32" fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      {[[30, 88], [68, 60], [106, 74], [144, 40], [182, 54], [210, 32]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={3} fill={C.accent} />
      ))}
    </>
  ),
  donut: () => (
    <>
      <circle cx={118} cy={65} r={34} fill="none" stroke={C.skeleton} strokeWidth={14} />
      <circle cx={118} cy={65} r={34} fill="none" stroke={C.accent} strokeWidth={14} strokeDasharray="120 214" strokeLinecap="round" transform="rotate(-90 118 65)" opacity={0.7} />
    </>
  ),
  number: () => (
    <>
      <text x={118} y={72} fontSize="34" fontWeight="700" fontFamily="system-ui" fill={C.accent} textAnchor="middle" opacity={0.75}>72%</text>
      <Line x={78} y={88} w={80} h={6} fill={C.skeletonSoft} />
    </>
  ),
  columns: (n = 2) => {
    const gap = 10;
    const total = 196;
    const w = (total - gap * (n - 1)) / n;
    return (
      <>
        {Array.from({ length: n }).map((_, i) => (
          <rect key={i} x={20 + i * (w + gap)} y={26} width={w} height={80} rx={5} fill={C.skeletonSoft} stroke={C.line} strokeWidth={1} />
        ))}
      </>
    );
  },
  toc: () => (
    <>
      <Line x={20} y={30} w={140} h={9} fill={C.skeleton} rx={4} />
      <Line x={34} y={50} w={120} h={6} fill={C.skeletonSoft} />
      <Line x={48} y={66} w={100} h={6} fill={C.skeletonSoft} />
      <Line x={48} y={82} w={110} h={6} fill={C.skeletonSoft} />
      <Line x={34} y={98} w={90} h={6} fill={C.skeletonSoft} />
    </>
  ),
  tabs: () => (
    <>
      <rect x={20} y={26} width={54} height={18} rx={4} fill={C.accentSoft} stroke={C.accentLine} strokeWidth={1} />
      <rect x={80} y={26} width={54} height={18} rx={4} fill={C.skeletonSoft} />
      <rect x={140} y={26} width={54} height={18} rx={4} fill={C.skeletonSoft} />
      <rect x={20} y={52} width={196} height={54} rx={5} fill="none" stroke={C.line} strokeWidth={1} />
      <Line x={32} y={66} w={150} fill={C.skeletonSoft} />
      <Line x={32} y={82} w={120} fill={C.skeletonSoft} />
    </>
  ),
  button: () => (
    <>
      <rect x={64} y={54} width={108} height={30} rx={7} fill={C.accent} opacity={0.6} />
      <Line x={86} y={66} w={64} h={7} fill="#fff" />
    </>
  ),
  breadcrumb: () => (
    <>
      <Line x={20} y={40} w={40} h={7} fill={C.skeleton} />
      <path d="M66 40 l5 4 l-5 4" stroke={C.text} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Line x={78} y={40} w={44} h={7} fill={C.skeleton} />
      <path d="M128 40 l5 4 l-5 4" stroke={C.text} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Line x={140} y={40} w={50} h={7} fill={C.accentLine} />
    </>
  ),
  synced: () => (
    <>
      <rect x={20} y={26} width={196} height={80} rx={6} fill="none" stroke={C.accentLine} strokeWidth={1.5} strokeDasharray="5 4" />
      <path d="M170 40 a10 10 0 1 0 4 8" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <path d="M174 36 v8 h-8" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <Line x={34} y={44} w={110} fill={C.skeletonSoft} />
      <Line x={34} y={62} w={130} fill={C.skeletonSoft} />
      <Line x={34} y={80} w={90} fill={C.skeletonSoft} />
    </>
  ),
  toggleHeading: (lvl = 1) => {
    const h = [14, 12, 10][lvl - 1] || 12;
    return (
      <>
        <path d="M22 32 l7 5 l-7 5" stroke={C.text} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Line x={38} y={31} w={[150, 130, 110][lvl - 1] || 120} h={h} fill={C.skeleton} rx={4} />
        <Line x={38} y={31 + h + 12} w={150} h={6} fill={C.skeletonSoft} />
      </>
    );
  },
  equation: () => (
    <>
      <rect x={20} y={40} width={196} height={48} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <text x={118} y={72} fontSize="22" fontFamily="Cambria, Georgia, serif" fontStyle="italic" fill={C.text} textAnchor="middle">e = mc²</text>
    </>
  ),
  mermaid: () => (
    <>
      <rect x={40} y={26} width={44} height={22} rx={4} fill={C.accentSoft} stroke={C.accentLine} strokeWidth={1} />
      <rect x={150} y={26} width={44} height={22} rx={4} fill={C.skeletonSoft} stroke={C.line} strokeWidth={1} />
      <rect x={95} y={80} width={44} height={22} rx={4} fill={C.skeletonSoft} stroke={C.line} strokeWidth={1} />
      <path d="M84 37 h66" stroke={C.text} strokeWidth={1.5} fill="none" />
      <path d="M62 48 v20 l55 12" stroke={C.text} strokeWidth={1.5} fill="none" />
      <path d="M172 48 v20 l-55 12" stroke={C.text} strokeWidth={1.5} fill="none" />
    </>
  ),
  ai: () => (
    <>
      <rect x={20} y={30} width={196} height={72} rx={8} fill={C.accentSoft} stroke={C.accentLine} strokeWidth={1} />
      <path d="M42 48 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill={C.accent} opacity={0.7} />
      <Line x={64} y={48} w={128} h={7} fill={C.accentLine} />
      <Line x={64} y={64} w={112} h={6} fill={C.accentSoft} />
      <Line x={64} y={78} w={80} h={6} fill={C.accentSoft} />
    </>
  ),
  page: () => (
    <>
      <rect x={64} y={24} width={80} height={84} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <Line x={76} y={38} w={40} h={7} fill={C.skeleton} />
      <Line x={76} y={54} w={56} h={5} fill={C.skeletonSoft} />
      <Line x={76} y={66} w={48} h={5} fill={C.skeletonSoft} />
      <Line x={76} y={78} w={52} h={5} fill={C.skeletonSoft} />
    </>
  ),
  linkPage: () => (
    <>
      <rect x={34} y={48} width={168} height={30} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <path d="M52 63 a7 7 0 0 1 7 -7 h6 M64 63 a7 7 0 0 0 -7 7 h-6" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" transform="translate(-2 0)" opacity={0.7} />
      <Line x={78} y={60} w={96} h={6} fill={C.accentLine} />
    </>
  ),
  mention: () => (
    <>
      <Line x={20} y={40} w={40} h={6} fill={C.skeletonSoft} />
      <rect x={66} y={34} width={84} height={18} rx={9} fill={C.accentSoft} stroke={C.accentLine} strokeWidth={1} />
      <circle cx={78} cy={43} r={6} fill={C.accent} opacity={0.6} />
      <Line x={90} y={40} w={50} h={6} fill={C.accentLine} />
      <Line x={156} y={40} w={40} h={6} fill={C.skeletonSoft} />
      <Line x={20} y={62} w={176} h={6} fill={C.skeletonSoft} />
    </>
  ),
  emoji: () => (
    <>
      <circle cx={118} cy={62} r={26} fill={C.accent} opacity={0.5} />
      <circle cx={109} cy={56} r={3} fill="var(--bg, #fff)" />
      <circle cx={127} cy={56} r={3} fill="var(--bg, #fff)" />
      <path d="M106 70 q12 12 24 0" fill="none" stroke="var(--bg, #fff)" strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  date: () => (
    <>
      <rect x={62} y={28} width={92} height={78} rx={6} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <rect x={62} y={28} width={92} height={20} rx={6} fill={C.accent} opacity={0.5} />
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}-${c}`} x={72 + c * 26} y={56 + r * 15} width={16} height={9} rx={2}
          fill={r === 1 && c === 1 ? C.accentLine : C.skeletonSoft} />
      )))}
    </>
  ),
  embed: () => (
    <>
      <rect x={20} y={26} width={196} height={80} rx={8} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <rect x={20} y={26} width={196} height={22} rx={8} fill={C.skeletonSoft} />
      <circle cx={34} cy={37} r={4} fill={C.accent} opacity={0.6} />
      <Line x={46} y={34} w={80} h={6} fill={C.skeleton} />
      <path d="M118 62 a10 10 0 0 1 10 -10 h8 M132 62 a10 10 0 0 0 -10 10 h-8" fill="none" stroke={C.accentLine} strokeWidth={2.5} strokeLinecap="round" transform="translate(-6 6)" />
      <Line x={40} y={92} w={156} h={5} fill={C.skeletonSoft} />
    </>
  ),
  formatting: () => (
    <>
      <Line x={20} y={40} w={50} h={7} fill={C.skeletonSoft} />
      <rect x={74} y={33} width={70} height={20} rx={4} fill={C.accentSoft} stroke={C.accentLine} strokeWidth={1} />
      <text x={109} y={48} fontSize="13" fontWeight="700" fontFamily="system-ui" fill={C.accent} textAnchor="middle" opacity={0.85}>Aa</text>
      <Line x={150} y={40} w={46} h={7} fill={C.skeletonSoft} />
      <Line x={20} y={62} w={176} h={6} fill={C.skeletonSoft} />
    </>
  ),
  color: (accent: string = COLOR_HEX.default) => (
    <>
      <Line x={20} y={40} w={40} h={7} fill={C.skeletonSoft} />
      <rect x={66} y={33} width={70} height={20} rx={4} fill={accent} opacity={0.28} />
      <text x={101} y={48} fontSize="12" fontWeight="600" fontFamily="system-ui" fill={accent} textAnchor="middle">Text</text>
      <Line x={144} y={40} w={52} h={7} fill={C.skeletonSoft} />
      <circle cx={30} cy={80} r={8} fill={accent} opacity={0.75} />
      <Line x={46} y={76} w={150} h={6} fill={C.skeletonSoft} />
    </>
  ),
  pageAction: () => (
    <>
      <rect x={40} y={30} width={156} height={72} rx={8} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <circle cx={62} cy={50} r={9} fill={C.accent} opacity={0.4} />
      <Line x={80} y={46} w={100} h={7} fill={C.skeleton} />
      <Line x={56} y={70} w={124} h={6} fill={C.skeletonSoft} />
      <Line x={56} y={84} w={90} h={6} fill={C.skeletonSoft} />
    </>
  ),
  generic: () => (
    <>
      <rect x={20} y={28} width={196} height={76} rx={8} fill={C.surface} stroke={C.line} strokeWidth={1} />
      <Line x={34} y={44} w={168} fill={C.skeletonSoft} />
      <Line x={34} y={62} w={150} fill={C.skeletonSoft} />
      <Line x={34} y={80} w={110} fill={C.skeletonSoft} />
    </>
  ),
};

const COLOR_HEX: Record<string, string> = {
  gray: "#9ca3af", brown: "#a1785a", orange: "#f97316", yellow: "#eab308",
  green: "#22c55e", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899",
  red: "#ef4444", default: "var(--accent, #f59e0b)",
};

// ── Map a command to a variant renderer ──────────────────────────────────────
function resolveVariant(command: NormalizedCommand | null | undefined): () => React.ReactElement {
  const id = command?.id || "";
  const cat = command?.category || "";

  // Direct id matches first
  const direct = {
    text: () => VARIANTS.text(),
    h1: () => VARIANTS.heading(1), h2: () => VARIANTS.heading(2),
    h3: () => VARIANTS.heading(3), h4: () => VARIANTS.heading(4),
    bullet: () => VARIANTS.bullet(), number: () => VARIANTS.numbered(),
    todo: () => VARIANTS.todo(), toggle: () => VARIANTS.toggle(),
    callout: () => VARIANTS.callout(), quote: () => VARIANTS.quote(),
    divider: () => VARIANTS.divider(),
    "simple-table": () => VARIANTS.table(), table: () => VARIANTS.table(),
    code: () => VARIANTS.code(), mermaid: () => VARIANTS.mermaid(),
    image: () => VARIANTS.image(), video: () => VARIANTS.video(),
    audio: () => VARIANTS.audio(), file: () => VARIANTS.file(),
    bookmark: () => VARIANTS.bookmark(),
    page: () => VARIANTS.page(), "link-to-page": () => VARIANTS.linkPage(),
    "table-view": () => VARIANTS.table(), "board-view": () => VARIANTS.board(),
    "gallery-view": () => VARIANTS.gallery(), "list-view": () => VARIANTS.list(),
    "calendar-view": () => VARIANTS.calendar(), "timeline-view": () => VARIANTS.timeline(),
    "dashboard-view": () => VARIANTS.database(), "map-view": () => VARIANTS.database(),
    "feed-view": () => VARIANTS.feed(), "linked-view": () => VARIANTS.database(),
    "database-inline": () => VARIANTS.database(), "database-full": () => VARIANTS.database(),
    form: () => VARIANTS.pageAction(),
    "bar-chart-v": () => VARIANTS.barV(), "bar-chart-h": () => VARIANTS.barH(),
    "line-chart": () => VARIANTS.line(), "donut-chart": () => VARIANTS.donut(),
    "number-chart": () => VARIANTS.number(),
    "table-of-contents": () => VARIANTS.toc(), tabs: () => VARIANTS.tabs(),
    button: () => VARIANTS.button(), "template-button": () => VARIANTS.button(),
    breadcrumb: () => VARIANTS.breadcrumb(), "synced-block": () => VARIANTS.synced(),
    "toggle-h1": () => VARIANTS.toggleHeading(1), "toggle-h2": () => VARIANTS.toggleHeading(2),
    "toggle-h3": () => VARIANTS.toggleHeading(3),
    "block-equation": () => VARIANTS.equation(), "inline-equation": () => VARIANTS.equation(),
    "ai-block": () => VARIANTS.ai(), "ai-meeting": () => VARIANTS.ai(),
    "mention-page": () => VARIANTS.mention(), "mention-person": () => VARIANTS.mention(),
    emoji: () => VARIANTS.emoji(), "date-reminder": () => VARIANTS.date(),
  };
  if (direct[id]) return direct[id];

  if (id.endsWith("-columns")) {
    const n = parseInt(id, 10) || 2;
    return () => VARIANTS.columns(n);
  }
  if (id.startsWith("color-bg-") || id.startsWith("color-")) {
    const name = id.replace("color-bg-", "").replace("color-", "");
    return () => VARIANTS.color(COLOR_HEX[name] || COLOR_HEX.default);
  }
  if (["bold", "italic", "underline", "strikethrough", "inline-code", "color", "highlight"].includes(id)) {
    return () => VARIANTS.formatting();
  }

  // Category fallbacks
  if (cat === "Embeds") return () => VARIANTS.embed();
  if (cat === "Page actions") return () => VARIANTS.pageAction();
  if (cat === "Database") return () => VARIANTS.database();
  if (cat === "Inline") return () => VARIANTS.formatting();
  if (cat === "Layout") return () => VARIANTS.columns(2);

  return () => VARIANTS.generic();
}

interface BlockPreviewIllustrationProps {
  command: NormalizedCommand | null | undefined;
  width?: number;
  height?: number;
}

export default function BlockPreviewIllustration({ command, width = 236, height = 132 }: BlockPreviewIllustrationProps) {
  if (!command) return null;
  const render = resolveVariant(command);
  return (
    <svg
      width="100%"
      viewBox="0 0 236 132"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${command.title} preview illustration`}
      style={{ display: "block", borderRadius: 8, maxHeight: height }}
    >
      <rect x={0} y={0} width={236} height={132} rx={10} fill={C.surface} />
      {render()}
    </svg>
  );
}
