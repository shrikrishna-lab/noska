import React from "react";
import * as LucideIcons from "lucide-react";
import { FileText } from "lucide-react";

interface PageIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  fallback?: React.ReactNode;
}

export function PageIcon({
  icon,
  className = "",
  size = 14,
  fallback = <FileText size={size} className="text-[var(--muted)] shrink-0" />
}: PageIconProps) {
  if (!icon) {
    return <>{fallback}</>;
  }

  // 1. Check if it's a URL or base64 image (SVG / PNG / etc.)
  if (
    typeof icon === "string" &&
    (icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("data:") ||
      icon.startsWith("blob:"))
  ) {
    return (
      <img
        src={icon}
        alt="icon"
        style={{ width: size, height: size }}
        className={`object-contain shrink-0 rounded-sm inline-block ${className}`}
      />
    );
  }

  // 2. Check if it's a Lucide icon formatted as "lucide:IconName"
  const iconName = typeof icon === "string" && icon.startsWith("lucide:") ? icon.replace("lucide:", "") : null;
  
  if (iconName && iconName in LucideIcons) {
    const IconComp = (LucideIcons as any)[iconName];
    if (IconComp) {
      return <IconComp size={size} className={`shrink-0 inline-block ${className}`} />;
    }
  }

  // Also check if string is an exact match for a Lucide icon component name without prefix
  if (typeof icon === "string" && icon in LucideIcons && icon !== "Icon" && icon.length > 2 && /^[A-Z]/.test(icon)) {
    const IconComp = (LucideIcons as any)[icon];
    if (IconComp && typeof IconComp === "function") {
      return <IconComp size={size} className={`shrink-0 inline-block ${className}`} />;
    }
  }

  // 3. Fallback: Render as emoji character / text
  return (
    <span
      style={{ fontSize: `${Math.round(size * 1.05)}px`, lineHeight: 1 }}
      className={`select-none shrink-0 inline-flex items-center justify-center leading-none ${className}`}
    >
      {icon}
    </span>
  );
}

export default PageIcon;
