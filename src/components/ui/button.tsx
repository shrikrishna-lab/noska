import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default: "bg-[var(--text)] text-[var(--bg)] hover:opacity-90",
  destructive: "bg-red-500 text-white hover:bg-red-600",
  outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--hover)]",
  secondary: "bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--hover)]",
  ghost: "hover:bg-[var(--hover)]",
  link: "text-[var(--accent)] underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
