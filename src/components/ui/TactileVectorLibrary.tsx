import React from "react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// BESPOKE TACTILE VECTOR ILLUSTRATIONS (Matching User Reference Image)
// ─────────────────────────────────────────────────────────────────────────────

export interface VectorProps {
  className?: string;
  size?: number;
}

// 1. WAKE UP ALARM CLOCK (Yellow bells, red/gold body, minute dial)
export function BentoAlarmClockVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Top bells */}
      <path d="M16 16C12 12 12 20 16 22Z" fill="#FBBF24" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M48 16C52 12 52 20 48 22Z" fill="#FBBF24" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M32 10C28 10 28 14 32 14C36 14 36 10 32 10Z" fill="#D97706" stroke="#1F2937" strokeWidth="2" />
      {/* Feet */}
      <path d="M18 52L14 58" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 52L50 58" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
      {/* Body */}
      <circle cx="32" cy="36" r="20" fill="#EF4444" stroke="#1F2937" strokeWidth="2.4" />
      {/* Inner dial */}
      <circle cx="32" cy="36" r="15" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
      {/* Hour ticks */}
      <line x1="32" y1="23" x2="32" y2="25.5" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="32" y1="46.5" x2="32" y2="49" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="36" x2="21.5" y2="36" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="42.5" y1="36" x2="45" y2="36" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      {/* Clock hands showing ~9:00 */}
      <line x1="32" y1="36" x2="24" y2="36" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="32" y1="36" x2="32" y2="26" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="36" r="2" fill="#1F2937" />
    </svg>
  );
}

// 2. COZY BED (Wooden headboard, 2 white pillows, folded blanket)
export function BentoBedVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Headboard */}
      <path d="M12 28V52M52 28V52" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="12" y="24" width="40" height="12" rx="2" fill="#78350F" stroke="#1F2937" strokeWidth="2.2" />
      <rect x="15" y="27" width="34" height="6" rx="1" fill="#92400E" />
      {/* Pillows */}
      <rect x="16" y="34" width="14" height="8" rx="3" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
      <rect x="34" y="34" width="14" height="8" rx="3" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
      {/* Mattress & Blanket */}
      <path d="M12 42C12 40 14 39 16 39H48C50 39 52 40 52 42V52H12V42Z" fill="#F8FAFC" stroke="#1F2937" strokeWidth="2.2" />
      <path d="M12 45H52V52H12V45Z" fill="#E2E8F0" stroke="#1F2937" strokeWidth="1.8" />
      {/* Legs */}
      <line x1="14" y1="52" x2="14" y2="57" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="52" x2="50" y2="57" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// 3. SUPPLEMENTS BOTTLE (Glass jar with striped lid and two-tone capsule pill)
export function BentoSupplementsVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Bottle Cap */}
      <rect x="22" y="16" width="20" height="6" rx="2" fill="#4B5563" stroke="#1F2937" strokeWidth="2" />
      <line x1="26" y1="18" x2="26" y2="20" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="32" y1="18" x2="32" y2="20" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="38" y1="18" x2="38" y2="20" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" />
      {/* Bottle Body */}
      <path d="M20 23C17 23 16 25 16 28V50C16 53 18 55 21 55H43C46 55 48 53 48 50V28C48 25 47 23 44 23H20Z" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.2" />
      {/* Label Box */}
      <rect x="20" y="28" width="24" height="22" rx="2" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.5" />
      {/* Capsule Pill Graphic */}
      <g transform="translate(24, 34) rotate(-35)">
        <rect x="0" y="0" width="8" height="14" rx="4" fill="#3B82F6" stroke="#1F2937" strokeWidth="1.5" />
        <rect x="0" y="7" width="8" height="7" rx="0" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.5" />
        <line x1="0" y1="7" x2="8" y2="7" stroke="#1F2937" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

// 4. LIGHT STRETCHING (Line-art person in warrior / yoga pose)
export function BentoStretchingVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Head */}
      <circle cx="32" cy="18" r="5.5" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.4" />
      {/* Torso */}
      <line x1="32" y1="24" x2="32" y2="40" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
      {/* Outstretched Arms */}
      <line x1="14" y1="30" x2="50" y2="30" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
      {/* Legs in Warrior Stance */}
      <path d="M32 40L20 54H14" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 40L42 46L48 54" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 5. HEALTHY LUNCH (Bowl with boiled egg, greens, lemon)
export function BentoLunchSaladVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Salad Greens & Ingredients */}
      <path d="M18 36C16 30 22 26 26 30C28 25 36 26 36 31C40 27 46 30 46 36" fill="#22C55E" stroke="#1F2937" strokeWidth="2" strokeLinejoin="round" />
      {/* Boiled Egg (Oval with yolk) */}
      <ellipse cx="32" cy="30" rx="5" ry="6" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
      <circle cx="32" cy="30" r="3" fill="#FBBF24" />
      {/* Tomato / Lemon wedge */}
      <path d="M40 32C44 32 46 36 44 38C41 38 40 35 40 32Z" fill="#FACC15" stroke="#1F2937" strokeWidth="1.6" />
      <circle cx="23" cy="34" r="2.5" fill="#EF4444" />
      {/* Salad Ceramic Bowl */}
      <path d="M14 36H50C50 48 44 54 32 54C20 54 14 48 14 36Z" fill="#78350F" stroke="#1F2937" strokeWidth="2.4" />
      <ellipse cx="32" cy="36" rx="18" ry="3" fill="#92400E" stroke="#1F2937" strokeWidth="1.8" />
    </svg>
  );
}

// 6. COFFEE & GHOST MASCOT (Coffee cup with peeking friendly ghost)
export function BentoCoffeeGhostVector({ className = "w-12 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Takeaway Coffee Cup */}
      <g transform="translate(6, 4)">
        {/* Lid */}
        <path d="M16 16H36L34 12H18L16 16Z" fill="#4B5563" stroke="#1F2937" strokeWidth="2" strokeLinejoin="round" />
        {/* Cup Body */}
        <path d="M17 16L20 48H32L35 16H17Z" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
        {/* Sleeve with bean */}
        <path d="M18.5 26L19.5 40H30.5L31.5 26H18.5Z" fill="#78350F" stroke="#1F2937" strokeWidth="1.8" />
        <ellipse cx="25" cy="33" rx="2.5" ry="3.5" fill="#FEF3C7" transform="rotate(20 25 33)" />
        <line x1="25" y1="30" x2="25" y2="36" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* Cute Peeking Ghost Mascot */}
      <g transform="translate(36, 12)">
        {/* Ghost Body */}
        <path
          d="M14 6C7 6 5 14 5 22C5 32 4 38 7 38C9 38 10 35 12 35C14 35 15 38 17 38C19 38 20 35 22 35C24 35 25 38 27 38C30 38 29 32 29 22C29 14 27 6 20 6C18 6 16 6 14 6Z"
          fill="#FFFFFF"
          stroke="#1F2937"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Ghost Eyes */}
        <circle cx="12" cy="18" r="1.5" fill="#1F2937" />
        <circle cx="19" cy="18" r="1.5" fill="#1F2937" />
        {/* Ghost Smile */}
        <path d="M14 22C15 23 16 23 17 22" stroke="#1F2937" strokeWidth="1.4" strokeLinecap="round" />
        {/* Ghost Waving Hand */}
        <path d="M5 24C1 22 1 18 3 16" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// 7. BOOK & JOURNAL (Open journal with bookmark ribbon)
export function BentoBookJournalVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M32 22C26 18 16 19 12 22V50C16 47 26 46 32 50C38 46 48 47 52 50V22C48 19 38 18 32 22Z" fill="#F8FAFC" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
      <line x1="32" y1="22" x2="32" y2="50" stroke="#1F2937" strokeWidth="2" />
      {/* Ribbon Bookmark */}
      <path d="M32 22V38L35 35L38 38V20" fill="#EF4444" stroke="#1F2937" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Text lines */}
      <line x1="16" y1="28" x2="26" y2="28" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="34" x2="24" y2="34" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="38" y1="28" x2="48" y2="28" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="38" y1="34" x2="46" y2="34" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 8. HYDRATION WATER GLASS (Crisp water glass with ice and lemon)
export function BentoHydrationGlassVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Glass Cup */}
      <path d="M18 18L22 52C22 54 24 56 27 56H37C40 56 42 54 42 52L46 18H18Z" fill="#F0F9FF" stroke="#1F2937" strokeWidth="2.2" />
      {/* Water Fill */}
      <path d="M20 28L22 52C22 53 23 54 25 54H39C41 54 42 53 42 52L44 28C40 30 36 27 32 28C28 29 24 27 20 28Z" fill="#38BDF8" opacity="0.65" stroke="#1F2937" strokeWidth="1.5" />
      {/* Straw */}
      <line x1="36" y1="10" x2="28" y2="46" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
      {/* Bubbles */}
      <circle cx="28" cy="38" r="1.5" fill="#FFFFFF" />
      <circle cx="34" cy="44" r="2" fill="#FFFFFF" />
    </svg>
  );
}

// 9. GUITAR & MUSIC
export function BentoGuitarMusicVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <g transform="translate(10, 10)">
        {/* Guitar Body */}
        <path d="M12 36C6 33 6 24 12 20C15 18 18 20 22 22C24 16 32 16 36 20C42 26 40 38 32 42C24 45 16 42 12 36Z" fill="#F59E0B" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="26" cy="30" r="5" fill="#78350F" stroke="#1F2937" strokeWidth="1.8" />
        {/* Neck */}
        <line x1="22" y1="22" x2="6" y2="6" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
        <line x1="22" y1="22" x2="6" y2="6" stroke="#1F2937" strokeWidth="1.5" />
        <circle cx="6" cy="6" r="3" fill="#D97706" stroke="#1F2937" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

// 10. LAPTOP & CODE (Work / Development block)
export function BentoLaptopCodeVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Screen */}
      <rect x="16" y="16" width="32" height="24" rx="3" fill="#1E293B" stroke="#1F2937" strokeWidth="2.2" />
      {/* Code lines */}
      <path d="M22 24L26 27L22 30" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="29" y1="30" x2="35" y2="30" stroke="#4ADE80" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="34" x2="40" y2="34" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Base */}
      <path d="M10 44C10 42 12 40 14 40H50C52 40 54 42 54 44V46C54 47 53 48 52 48H12C11 48 10 47 10 46V44Z" fill="#E2E8F0" stroke="#1F2937" strokeWidth="2.2" />
      <line x1="28" y1="42" x2="36" y2="42" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 11. NIGHT MOON & SLEEP (Crescent moon with sleepy stars)
export function BentoMoonSleepVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Crescent Moon */}
      <path d="M38 14C24 14 16 26 16 38C16 46 21 52 28 55C24 50 23 42 27 34C31 26 38 23 46 25C44 18 41 14 38 14Z" fill="#FDE047" stroke="#1F2937" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Sleepy Eyes on Moon */}
      <path d="M26 36C28 38 30 38 32 36" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      {/* ZZZ Floating letters */}
      <path d="M42 22H47L42 28H47" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 12H52L48 16H52" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 12. DUMBBELL FITNESS
export function BentoDumbbellVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <g transform="translate(10, 10) rotate(-40 22 22)">
        <rect x="8" y="16" width="6" height="16" rx="2" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
        <rect x="4" y="18" width="4" height="12" rx="1.5" fill="#1D4ED8" stroke="#1F2937" strokeWidth="1.8" />
        <rect x="14" y="21" width="16" height="6" rx="1" fill="#9CA3AF" stroke="#1F2937" strokeWidth="2" />
        <rect x="30" y="16" width="6" height="16" rx="2" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
        <rect x="36" y="18" width="4" height="12" rx="1.5" fill="#1D4ED8" stroke="#1F2937" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

// 13. MEDITATION LOTUS (Mindfulness & Breathing)
export function BentoLotusVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M32 18C28 26 28 38 32 44C36 38 36 26 32 18Z" fill="#F472B6" stroke="#1F2937" strokeWidth="2.2" />
      <path d="M32 44C24 42 16 34 18 24C26 24 30 36 32 44Z" fill="#FBCFE8" stroke="#1F2937" strokeWidth="2" />
      <path d="M32 44C40 42 48 34 46 24C38 24 34 36 32 44Z" fill="#FBCFE8" stroke="#1F2937" strokeWidth="2" />
      <path d="M12 44C20 44 26 40 32 44C38 40 44 44 52 44" stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// 14. WALKING SNEAKER (Daily steps)
export function BentoSneakerVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M14 36L22 24H32L34 32L46 36C50 38 52 42 50 46L48 48H14V36Z" fill="#F97316" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
      {/* White Sole */}
      <path d="M12 48H52C52 51 50 53 47 53H15C13 53 12 51 12 48Z" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2.2" />
      {/* Laces */}
      <line x1="25" y1="27" x2="30" y2="30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="31" x2="33" y2="34" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 15. TOOTHBRUSH & BATH
export function BentoToothbrushVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <g transform="translate(10, 8) rotate(45 22 22)">
        <rect x="20" y="8" width="6" height="36" rx="3" fill="#06B6D4" stroke="#1F2937" strokeWidth="2.2" />
        <rect x="20" y="8" width="6" height="12" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
        <rect x="16" y="8" width="4" height="10" rx="1" fill="#38BDF8" stroke="#1F2937" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

// 16. FRESH APPLE SNACK
export function BentoAppleVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Stem & Leaf */}
      <path d="M32 20C32 14 36 12 38 12" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 16C38 14 44 16 44 20C40 20 36 18 34 16Z" fill="#22C55E" stroke="#1F2937" strokeWidth="1.8" />
      {/* Apple Body */}
      <path d="M32 24C26 18 16 20 16 32C16 46 26 52 32 52C38 52 48 46 48 32C48 20 38 18 32 24Z" fill="#EF4444" stroke="#1F2937" strokeWidth="2.4" strokeLinejoin="round" />
      {/* Highlight */}
      <path d="M22 28C20 32 20 38 22 42" stroke="#FCA5A5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 17. HOUSEPLANT WATERING
export function BentoPlantVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Leaves */}
      <path d="M32 36C32 22 22 16 16 22C16 30 24 34 32 36Z" fill="#22C55E" stroke="#1F2937" strokeWidth="2" />
      <path d="M32 36C32 20 42 14 48 20C48 28 40 32 32 36Z" fill="#16A34A" stroke="#1F2937" strokeWidth="2" />
      <path d="M32 36V14C36 18 36 26 32 36Z" fill="#4ADE80" stroke="#1F2937" strokeWidth="1.8" />
      {/* Pot */}
      <path d="M22 36H42L40 52H24L22 36Z" fill="#EA580C" stroke="#1F2937" strokeWidth="2.2" />
      <rect x="20" y="34" width="24" height="4" rx="1" fill="#C2410C" stroke="#1F2937" strokeWidth="1.8" />
    </svg>
  );
}

// 18. FOCUS CANDLE & WIND DOWN
export function BentoCandleVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M32 12C28 18 28 22 32 26C36 22 36 18 32 12Z" fill="#FACC15" stroke="#1F2937" strokeWidth="1.8" />
      <circle cx="32" cy="22" r="2" fill="#EF4444" />
      <line x1="32" y1="26" x2="32" y2="30" stroke="#1F2937" strokeWidth="2" />
      <rect x="22" y="30" width="20" height="24" rx="3" fill="#FEF3C7" stroke="#1F2937" strokeWidth="2.2" />
      <path d="M22 34C26 36 30 32 34 34C38 36 40 34 42 34" stroke="#FDE68A" strokeWidth="2" />
    </svg>
  );
}

// 19. SUNRISE MORNING
export function BentoSunriseVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M12 44H52" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 44C20 37.3726 25.3726 32 32 32C38.6274 32 44 37.3726 44 44H20Z" fill="#FBBF24" stroke="#1F2937" strokeWidth="2.2" />
      <line x1="32" y1="20" x2="32" y2="26" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18" y1="26" x2="22" y2="30" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="46" y1="26" x2="42" y2="30" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16 48H48" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 52H42" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 20. FRUIT SMOOTHIE / SHAKE
export function BentoSmoothieVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M38 12L34 26" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
      <path d="M20 26H44L40 52C40 54 38 56 36 56H28C26 56 24 54 24 52L20 26Z" fill="#F43F5E" stroke="#1F2937" strokeWidth="2.2" />
      <path d="M22 34C26 36 30 32 34 34C38 36 40 34 42 34V50C42 53 40 54 38 54H26C24 54 22 53 22 50V34Z" fill="#FB7185" />
      <ellipse cx="32" cy="26" rx="12" ry="3" fill="#FFE4E6" stroke="#1F2937" strokeWidth="1.8" />
    </svg>
  );
}

// 21. SPRINT LAUNCH ROCKET
export function BentoRocketVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <g transform="translate(6, 6) rotate(45 26 26)">
        {/* Fins */}
        <path d="M18 36L12 44L20 44L22 38" fill="#DC2626" stroke="#1F2937" strokeWidth="1.8" />
        <path d="M34 36L40 44L32 44L30 38" fill="#DC2626" stroke="#1F2937" strokeWidth="1.8" />
        {/* Body */}
        <path d="M26 12C20 18 20 34 20 40H32C32 34 32 18 26 12Z" fill="#F8FAFC" stroke="#1F2937" strokeWidth="2.2" />
        {/* Porthole */}
        <circle cx="26" cy="24" r="3.5" fill="#38BDF8" stroke="#1F2937" strokeWidth="1.6" />
        {/* Flame */}
        <path d="M22 40C22 46 26 50 26 50C26 50 30 46 30 40H22Z" fill="#FBBF24" stroke="#1F2937" strokeWidth="1.8" />
      </g>
    </svg>
  );
}

// 22. TARGET & GOAL DART
export function BentoTargetVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <circle cx="32" cy="32" r="20" fill="#FEE2E2" stroke="#1F2937" strokeWidth="2.2" />
      <circle cx="32" cy="32" r="14" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="8" fill="#EF4444" stroke="#1F2937" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="3" fill="#FDE047" />
      {/* Dart arrow */}
      <path d="M48 16L34 30" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 16L52 14L50 20L48 16Z" fill="#EF4444" stroke="#1F2937" strokeWidth="1.5" />
    </svg>
  );
}

// 23. COGNITIVE BRAIN & DEEP FLOW
export function BentoBrainFlowVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M28 20C24 16 18 18 18 24C14 26 14 34 18 38C16 42 18 46 22 48C26 50 28 48 30 46V20H28Z" fill="#E9D5FF" stroke="#1F2937" strokeWidth="2" strokeLinejoin="round" />
      <path d="M36 20C40 16 46 18 46 24C50 26 50 34 46 38C48 42 46 46 42 48C38 50 36 48 34 46V20H36Z" fill="#D8B4FE" stroke="#1F2937" strokeWidth="2" strokeLinejoin="round" />
      <line x1="32" y1="20" x2="32" y2="48" stroke="#1F2937" strokeWidth="2" />
      {/* Synapse Sparks */}
      <circle cx="22" cy="30" r="1.5" fill="#9333EA" />
      <circle cx="42" cy="30" r="1.5" fill="#9333EA" />
      <circle cx="32" cy="14" r="1.5" fill="#F59E0B" />
    </svg>
  );
}

// 24. KANBAN PROJECT BOARD
export function BentoKanbanVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <rect x="14" y="16" width="36" height="32" rx="4" fill="#F1F5F9" stroke="#1F2937" strokeWidth="2.2" />
      {/* Column 1 */}
      <rect x="18" y="22" width="7" height="12" rx="2" fill="#38BDF8" stroke="#1F2937" strokeWidth="1.5" />
      <rect x="18" y="36" width="7" height="8" rx="2" fill="#93C5FD" stroke="#1F2937" strokeWidth="1.5" />
      {/* Column 2 */}
      <rect x="28.5" y="22" width="7" height="18" rx="2" fill="#FBBF24" stroke="#1F2937" strokeWidth="1.5" />
      {/* Column 3 */}
      <rect x="39" y="22" width="7" height="9" rx="2" fill="#4ADE80" stroke="#1F2937" strokeWidth="1.5" />
      <rect x="39" y="33" width="7" height="11" rx="2" fill="#86EFAC" stroke="#1F2937" strokeWidth="1.5" />
    </svg>
  );
}

// 25. VIDEO SYNC / SCREEN CALL
export function BentoVideoSyncVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <rect x="14" y="20" width="26" height="24" rx="4" fill="#6366F1" stroke="#1F2937" strokeWidth="2.2" />
      <path d="M40 28L48 22V42L40 36V28Z" fill="#818CF8" stroke="#1F2937" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="27" cy="32" r="4" fill="#FFFFFF" stroke="#1F2937" strokeWidth="1.5" />
    </svg>
  );
}

// 26. TEAM HUDDLE & STANDUP
export function BentoTeamHuddleVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Person Center */}
      <circle cx="32" cy="24" r="5" fill="#FBBF24" stroke="#1F2937" strokeWidth="2" />
      <path d="M24 44C24 38 27 34 32 34C37 34 40 38 40 44" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      {/* Person Left */}
      <circle cx="20" cy="28" r="4" fill="#38BDF8" stroke="#1F2937" strokeWidth="1.8" />
      <path d="M14 46C14 42 16 39 20 39C22 39 24 40 25 42" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
      {/* Person Right */}
      <circle cx="44" cy="28" r="4" fill="#A855F7" stroke="#1F2937" strokeWidth="1.8" />
      <path d="M39 42C40 40 42 39 44 39C48 39 50 42 50 46" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 27. 1-ON-1 CHAT BUBBLES
export function BentoChat1on1Vector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <rect x="14" y="16" width="24" height="18" rx="5" fill="#3B82F6" stroke="#1F2937" strokeWidth="2" />
      <path d="M18 34L14 38V34H18Z" fill="#3B82F6" stroke="#1F2937" strokeWidth="1.5" />
      <line x1="20" y1="22" x2="30" y2="22" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="20" y1="27" x2="26" y2="27" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />

      <rect x="28" y="26" width="22" height="18" rx="5" fill="#22C55E" stroke="#1F2937" strokeWidth="2" />
      <path d="M46 44L50 48V44H46Z" fill="#22C55E" stroke="#1F2937" strokeWidth="1.5" />
      <line x1="34" y1="32" x2="44" y2="32" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="34" y1="37" x2="40" y2="37" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 28. WARM TEACUP & RELAX
export function BentoTeacupVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      {/* Steam */}
      <path d="M26 14C24 18 28 20 26 24" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 14C32 18 36 20 34 24" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
      {/* Cup Body */}
      <path d="M18 26H44C44 38 38 44 31 44C24 44 18 38 18 26Z" fill="#14B8A6" stroke="#1F2937" strokeWidth="2.2" />
      {/* Handle */}
      <path d="M44 30C48 30 50 33 50 36C50 39 48 42 44 42" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />
      {/* Saucer */}
      <line x1="14" y1="48" x2="48" y2="48" stroke="#1F2937" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// 29. CREATIVE SPARK & IDEA
export function BentoSparkIdeaVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M32 14C24 14 18 20 18 28C18 33 21 37 24 40V46C24 47 25 48 26 48H38C39 48 40 47 40 46V40C43 37 46 33 46 28C46 20 40 14 32 14Z" fill="#FACC15" stroke="#1F2937" strokeWidth="2.2" />
      <line x1="26" y1="44" x2="38" y2="44" stroke="#1F2937" strokeWidth="1.8" />
      <line x1="28" y1="48" x2="36" y2="48" stroke="#1F2937" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M32 8V11" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 20L17 22" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 20L47 22" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 30. CROWN / SPRINT CHAMPION
export function BentoCrownVector({ className = "w-11 h-11" }: VectorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("shrink-0", className)}>
      <path d="M14 44L18 24L26 34L32 18L38 34L46 24L50 44H14Z" fill="#F59E0B" stroke="#1F2937" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="14" y="44" width="36" height="6" rx="2" fill="#D97706" stroke="#1F2937" strokeWidth="2" />
      <circle cx="18" cy="22" r="2" fill="#EF4444" />
      <circle cx="32" cy="16" r="2.5" fill="#3B82F6" />
      <circle cx="46" cy="22" r="2" fill="#10B981" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY & EXPANSIVE CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export type BentoVectorType =
  | "alarm"
  | "bed"
  | "pill"
  | "stretch"
  | "lunch"
  | "coffee"
  | "journal"
  | "water"
  | "guitar"
  | "work"
  | "sleep"
  | "dumbbell"
  | "lotus"
  | "sneaker"
  | "toothbrush"
  | "apple"
  | "plant"
  | "candle"
  | "sunrise"
  | "smoothie"
  | "rocket"
  | "target"
  | "brain_flow"
  | "kanban"
  | "video_sync"
  | "team_huddle"
  | "chat_1on1"
  | "teacup"
  | "spark_idea"
  | "crown";

export const BENTO_VECTOR_CATALOG: Array<{
  type: BentoVectorType;
  label: string;
  category: "Morning" | "Wellness" | "Work" | "Evening" | "Self-Care";
  component: React.ComponentType<VectorProps>;
}> = [
  { type: "alarm", label: "Wake up / Alarm", category: "Morning", component: BentoAlarmClockVector },
  { type: "sunrise", label: "Sunrise Routine", category: "Morning", component: BentoSunriseVector },
  { type: "bed", label: "Make Bed", category: "Morning", component: BentoBedVector },
  { type: "coffee", label: "Coffee & Break", category: "Morning", component: BentoCoffeeGhostVector },
  { type: "smoothie", label: "Healthy Smoothie", category: "Morning", component: BentoSmoothieVector },
  { type: "pill", label: "Supplements / Meds", category: "Wellness", component: BentoSupplementsVector },
  { type: "stretch", label: "Light Stretching", category: "Wellness", component: BentoStretchingVector },
  { type: "water", label: "Hydration Intake", category: "Wellness", component: BentoHydrationGlassVector },
  { type: "lunch", label: "Healthy Lunch", category: "Wellness", component: BentoLunchSaladVector },
  { type: "dumbbell", label: "Workout / Gym", category: "Wellness", component: BentoDumbbellVector },
  { type: "lotus", label: "Meditation / Breath", category: "Wellness", component: BentoLotusVector },
  { type: "sneaker", label: "Walk / Steps Goal", category: "Wellness", component: BentoSneakerVector },
  { type: "apple", label: "Nutrition & Fruit", category: "Wellness", component: BentoAppleVector },
  { type: "teacup", label: "Herbal Tea Break", category: "Wellness", component: BentoTeacupVector },
  { type: "work", label: "Deep Code Sprint", category: "Work", component: BentoLaptopCodeVector },
  { type: "rocket", label: "Sprint Launch", category: "Work", component: BentoRocketVector },
  { type: "target", label: "Goal Alignment", category: "Work", component: BentoTargetVector },
  { type: "brain_flow", label: "Cognitive Flow", category: "Work", component: BentoBrainFlowVector },
  { type: "kanban", label: "Kanban Deliverables", category: "Work", component: BentoKanbanVector },
  { type: "video_sync", label: "Live Video Sync", category: "Work", component: BentoVideoSyncVector },
  { type: "team_huddle", label: "Team Standup", category: "Work", component: BentoTeamHuddleVector },
  { type: "chat_1on1", label: "1-on-1 Feedback", category: "Work", component: BentoChat1on1Vector },
  { type: "spark_idea", label: "Creative Spark", category: "Work", component: BentoSparkIdeaVector },
  { type: "crown", label: "Milestone Win", category: "Work", component: BentoCrownVector },
  { type: "journal", label: "Journal & Reading", category: "Evening", component: BentoBookJournalVector },
  { type: "guitar", label: "Music & Creative", category: "Evening", component: BentoGuitarMusicVector },
  { type: "candle", label: "Candle Meditation", category: "Evening", component: BentoCandleVector },
  { type: "sleep", label: "Restful Sleep", category: "Evening", component: BentoMoonSleepVector },
  { type: "plant", label: "Mindful Plant Care", category: "Self-Care", component: BentoPlantVector },
  { type: "toothbrush", label: "Night Routine", category: "Self-Care", component: BentoToothbrushVector },
];

export function BentoVectorIcon({
  name,
  className = "w-11 h-11"
}: {
  name: string;
  className?: string;
}) {
  const match = BENTO_VECTOR_CATALOG.find(c => c.type === name);
  if (match) {
    const Component = match.component;
    return <Component className={className} />;
  }
  return <BentoAlarmClockVector className={className} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// BESPOKE TACTILE GLYPHS (Professional replacements for raw emojis across UI)
// ─────────────────────────────────────────────────────────────────────────────

export type TactileGlyphName =
  | "user"
  | "bot"
  | "brain"
  | "calendar"
  | "fire"
  | "zap"
  | "check"
  | "clock"
  | "folder"
  | "sparkles"
  | "target"
  | "sync"
  | "standup"
  | "deep_work"
  | "one_on_one"
  | "review"
  | "sun"
  | "coffee"
  | "plant"
  | "trophy"
  | "rocket"
  | "heart";

export function TactileGlyph({
  name,
  className = "size-4",
  color
}: {
  name: TactileGlyphName | string;
  className?: string;
  color?: string;
}) {
  const c = color || "currentColor";

  switch (name) {
    case "user":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <circle cx="10" cy="6" r="3.5" stroke={c} strokeWidth="1.8" />
          <path d="M4 16.5C4 13.5 6.5 11.5 10 11.5C13.5 11.5 16 13.5 16 16.5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "brain":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M8 5C6 4 4 5.5 4 8C3 9.5 3.5 12 5 13C4.5 14.5 5.5 16 7 16C8 16 9 15.5 9.5 14.5V5H8Z" stroke={c} strokeWidth="1.6" />
          <path d="M12 5C14 4 16 5.5 16 8C17 9.5 16.5 12 15 13C15.5 14.5 14.5 16 13 16C12 16 11 15.5 10.5 14.5V5H12Z" stroke={c} strokeWidth="1.6" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <rect x="3" y="4.5" width="14" height="12" rx="3" stroke={c} strokeWidth="1.6" />
          <line x1="3" y1="8.5" x2="17" y2="8.5" stroke={c} strokeWidth="1.4" />
          <circle cx="7" cy="11.5" r="0.8" fill={c} />
          <circle cx="10" cy="11.5" r="0.8" fill={c} />
          <circle cx="13" cy="11.5" r="0.8" fill={c} />
          <circle cx="7" cy="14" r="0.8" fill={c} />
          <circle cx="10" cy="14" r="0.8" fill={c} />
          <line x1="6.5" y1="2.5" x2="6.5" y2="4.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="13.5" y1="2.5" x2="13.5" y2="4.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "fire":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M10 2.5C10 2.5 12.5 6 12.5 8.5C12.5 9.5 12 10.5 11 11C11.5 9.5 11 8.5 10 7.5C9 8.5 7 10 7 12C7 14.5 8.5 16.5 10.5 16.5C13.5 16.5 15.5 14 15.5 11C15.5 6.5 10 2.5 10 2.5Z" fill={c} opacity="0.25" />
          <path d="M10 2.5C10 2.5 12.5 6 12.5 8.5C12.5 9.5 12 10.5 11 11C11.5 9.5 11 8.5 10 7.5C9 8.5 7 10 7 12C7 14.5 8.5 16.5 10.5 16.5C13.5 16.5 15.5 14 15.5 11C15.5 6.5 10 2.5 10 2.5Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "zap":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M11 2L4.5 10.5H10L9 18L15.5 9.5H10L11 2Z" fill={c} opacity="0.25" />
          <path d="M11 2L4.5 10.5H10L9 18L15.5 9.5H10L11 2Z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M3 6.5C3 5.39543 3.89543 4.5 5 4.5H8L10 6.5H15C16.1046 6.5 17 7.39543 17 8.5V14.5C17 15.6046 16.1046 16.5 15 16.5H5C3.89543 16.5 3 15.6046 3 14.5V6.5Z" stroke={c} strokeWidth="1.6" />
        </svg>
      );
    case "sparkles":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M10 2L11.5 6.5L16 8L11.5 9.5L10 14L8.5 9.5L4 8L8.5 6.5L10 2Z" fill={c} opacity="0.25" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M15 13L15.8 15L18 15.8L15.8 16.5L15 18.5L14.2 16.5L12 15.8L14.2 15L15 13Z" fill={c} />
        </svg>
      );
    case "standup":
    case "sun":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <circle cx="10" cy="10" r="3.5" stroke={c} strokeWidth="1.6" />
          <line x1="10" y1="2.5" x2="10" y2="4.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="10" y1="15.5" x2="10" y2="17.5" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="2.5" y1="10" x2="4.5" y2="10" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <line x1="15.5" y1="10" x2="17.5" y2="10" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "sync":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M4 10C4 6.68629 6.68629 4 10 4C12.5 4 14.6 5.5 15.5 7.7" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 10C16 13.3137 13.3137 16 10 16C7.5 16 5.4 14.5 4.5 12.3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 4V8H12" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16V12H8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "deep_work":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <circle cx="10" cy="10" r="7.5" stroke={c} strokeWidth="1.6" />
          <circle cx="10" cy="10" r="4" stroke={c} strokeWidth="1.4" />
          <circle cx="10" cy="10" r="1.5" fill={c} />
        </svg>
      );
    case "one_on_one":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <circle cx="6.5" cy="7" r="2.5" stroke={c} strokeWidth="1.5" />
          <path d="M2.5 15C2.5 12.5 4.5 11 6.5 11C8.5 11 10.5 12.5 10.5 15" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="13.5" cy="7" r="2.5" stroke={c} strokeWidth="1.5" />
          <path d="M9.5 15C9.5 12.5 11.5 11 13.5 11C15.5 11 17.5 12.5 17.5 15" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M6 4H14V9C14 11.2091 12.2091 13 10 13C7.79086 13 6 11.2091 6 9V4Z" fill={c} opacity="0.2" stroke={c} strokeWidth="1.6" />
          <path d="M6 6H3C3 8.5 4.5 10 6 10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 6H17C17 8.5 15.5 10 14 10" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 13V16M7 16H13" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <path d="M10 16.5L3.5 10C1.5 8 1.5 5 3.5 3C5.5 1 8.5 1 10 3.5C11.5 1 14.5 1 16.5 3C18.5 5 18.5 8 16.5 10L10 16.5Z" fill={c} opacity="0.25" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" className={className}>
          <circle cx="10" cy="10" r="6" stroke={c} strokeWidth="1.6" />
          <circle cx="10" cy="10" r="2" fill={c} />
        </svg>
      );
  }
}
