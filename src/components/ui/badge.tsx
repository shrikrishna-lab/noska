import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-[var(--text)] text-[var(--bg)] border-transparent",
  secondary: "bg-[var(--surface)] text-[var(--secondary)] border-transparent",
  destructive: "bg-red-500 text-white border-transparent",
  outline: "text-[var(--text)] border-[var(--border)]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
