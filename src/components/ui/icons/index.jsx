import React from "react";
import { motion } from "framer-motion";

// Reusable Spring Configs
const softSpring = { type: "spring", stiffness: 350, damping: 28 };
const stiffSpring = { type: "spring", stiffness: 500, damping: 30 };
const bouncySpring = { type: "spring", stiffness: 450, damping: 18 };

const hoverScale = { scale: 1.08, transition: stiffSpring };
const pressScale = { scale: 0.94, transition: stiffSpring };

// Common Wrapper to handle disabled, active, hover, and press states
function IconWrapper({ children, hoverAnim = hoverScale, pressAnim = pressScale, disabled = false, className = "", onClick, ...props }) {
  return (
    <motion.span
      whileHover={disabled ? {} : hoverAnim}
      whileTap={disabled ? {} : pressAnim}
      onClick={disabled ? undefined : onClick}
      className={`inline-flex items-center justify-center cursor-pointer transition-opacity select-none ${disabled ? "opacity-35 cursor-not-allowed" : ""} ${className}`}
      {...props}
    >
      {children}
    </motion.span>
  );
}

// 1. AnimatedBack
export function AnimatedBack({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ x: -2, scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </IconWrapper>
  );
}

// 3. AnimatedForward
export function AnimatedForward({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ x: 2, scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </IconWrapper>
  );
}

// 4. AnimatedSearch
export function AnimatedSearch({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.1, rotate: 5 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </IconWrapper>
  );
}

// 5. AnimatedMenu
export function AnimatedMenu({ size = 16, color = "currentColor", active = false, className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <motion.line 
          x1="3" y1="12" x2="21" y2="12" 
          initial={{ rotate: 0, y: 0 }}
          animate={{ rotate: active ? 45 : 0, y: active ? 0 : 0, originX: 0.5, originY: 0.5 }} 
          transition={softSpring}
        />
        <motion.line 
          x1="3" y1="6" x2="21" y2="6" 
          initial={{ opacity: 1 }}
          animate={{ opacity: active ? 0 : 1 }} 
          transition={softSpring}
        />
        <motion.line 
          x1="3" y1="18" x2="21" y2="18" 
          initial={{ rotate: 0 }}
          animate={{ rotate: active ? -45 : 0, originX: 0.5, originY: 0.5 }} 
          transition={softSpring}
        />
      </svg>
    </IconWrapper>
  );
}

// 6. AnimatedTheme
export function AnimatedTheme({ size = 16, color = "currentColor", active = false, className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.1, rotate: 30 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {active ? (
          // Moon Mode path morph / display
          <motion.path 
            initial={false}
            animate={{ scale: 1 }}
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill={color}
          />
        ) : (
          // Sun Mode SVG path / display
          <>
            <motion.circle cx="12" cy="12" r="5" fill="none" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </>
        )}
      </svg>
    </IconWrapper>
  );
}

// 8. AnimatedVolume
export function AnimatedVolume({ size = 16, color = "currentColor", active = false, className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {active ? (
          // Muted wave cross lines
          <motion.line x1="23" y1="9" x2="17" y2="15" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={stiffSpring} />
        ) : (
          // Sound waves
          <>
            <motion.path d="M19.07 4.93a10 10 0 0 1 0 14.14" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.8 }} />
            <motion.path d="M15.54 8.46a5 5 0 0 1 0 7.07" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} />
          </>
        )}
      </svg>
    </IconWrapper>
  );
}

// 9. AnimatedBookmark
export function AnimatedBookmark({ size = 16, color = "currentColor", active = false, className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ y: -1.5, scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <motion.path 
          d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" 
          animate={{ fill: active ? color : "rgba(0,0,0,0)" }}
          transition={softSpring}
        />
      </svg>
    </IconWrapper>
  );
}

// 10. AnimatedTrash
export function AnimatedTrash({ size = 16, color = "currentColor", className = "", ...props }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <IconWrapper 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      hoverAnim={{ scale: 1.08 }}
      className={className} 
      {...props}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Lid tilts slightly */}
        <motion.polyline 
          points="3 6 5 6 21 6" 
          animate={{ rotate: hovered ? -8 : 0, originX: 0.8, originY: 0.8 }} 
          transition={bouncySpring}
        />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </IconWrapper>
  );
}

// 12. AnimatedSettings
export function AnimatedSettings({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.06, rotate: 60 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </IconWrapper>
  );
}

// 14. AnimatedFolder
export function AnimatedFolder({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    </IconWrapper>
  );
}

// 15. AnimatedPlus
export function AnimatedPlus({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ rotate: 90, scale: 1.08 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </IconWrapper>
  );
}

// 17. AnimatedCheck
export function AnimatedCheck({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <motion.polyline 
          points="20 6 9 17 4 12" 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={bouncySpring}
        />
      </svg>
    </IconWrapper>
  );
}

// 18. AnimatedBell
export function AnimatedBell({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ rotate: [0, -12, 12, -8, 8, 0], scale: 1.06 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </IconWrapper>
  );
}

// 20. AnimatedRefresh
export function AnimatedRefresh({ size = 16, color = "currentColor", loading = false, className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.06 }} className={className} {...props}>
      <motion.svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        animate={loading ? { rotate: 360 } : {}}
        transition={loading ? { repeat: Infinity, duration: 1.2, ease: "linear" } : {}}
      >
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </motion.svg>
    </IconWrapper>
  );
}

// 21. AnimatedUpload
export function AnimatedUpload({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ y: -2, scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </IconWrapper>
  );
}

// 22. AnimatedDownload
export function AnimatedDownload({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ y: 2, scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </IconWrapper>
  );
}

// 23. AnimatedAI
export function AnimatedAI({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08, rotate: [0, -10, 10, 0] }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 0 1 7.54 16.59c-.24.28-.35.65-.24 1l1 4a1 1 0 0 1-1.39 1.13l-3.34-1.67a1.5 1.5 0 0 0-1-.1c-.96.25-1.95.42-3 .42A10 10 0 0 1 12 2z" />
        <circle cx="9" cy="11" r="1.5" fill={color} />
        <circle cx="15" cy="11" r="1.5" fill={color} />
      </svg>
    </IconWrapper>
  );
}

// 24. AnimatedSparkle
export function AnimatedSparkle({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.12, rotate: 45 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.64 5.64l2.83 2.83M15.54 15.54l2.83 2.83M5.64 19.78l2.83-2.83M15.54 8.46l2.83-2.83" />
      </svg>
    </IconWrapper>
  );
}

// 25. AnimatedCanvas
export function AnimatedCanvas({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    </IconWrapper>
  );
}

// 27. AnimatedSidebar
export function AnimatedSidebar({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.05, x: -1 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    </IconWrapper>
  );
}

// 28. AnimatedVoice
export function AnimatedVoice({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </IconWrapper>
  );
}

// 29. AnimatedSend
export function AnimatedSend({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08, rotate: -15, x: 1 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </IconWrapper>
  );
}

// 32. AnimatedExpand
export function AnimatedExpand({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.1 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 3 21 3 21 9" />
        <polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>
    </IconWrapper>
  );
}

// 30. AnimatedLock
export function AnimatedLock({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </IconWrapper>
  );
}

// 35. AnimatedUnlock
export function AnimatedUnlock({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.05 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
    </IconWrapper>
  );
}

// 36. AnimatedHistory
export function AnimatedHistory({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.06, rotate: -15 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <polyline points="3 3 3 8 8 8" />
        <line x1="12" y1="7" x2="12" y2="12" />
        <line x1="12" y1="12" x2="16" y2="14" />
      </svg>
    </IconWrapper>
  );
}

// 37. AnimatedUndo
export function AnimatedUndo({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08, rotate: -25 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
      </svg>
    </IconWrapper>
  );
}

// 38. AnimatedRedo
export function AnimatedRedo({ size = 16, color = "currentColor", className = "", ...props }) {
  return (
    <IconWrapper hoverAnim={{ scale: 1.08, rotate: 25 }} className={className} {...props}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
      </svg>
    </IconWrapper>
  );
}
