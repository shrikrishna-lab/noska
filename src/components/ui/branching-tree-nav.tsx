"use client";

import {
  Children,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export interface TreeItemData {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
  href?: string;
}

interface TreeContextValue {
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const TreeContext = createContext<TreeContextValue | null>(null);

function useTreeContext() {
  const context = useContext(TreeContext);

  if (!context) {
    throw new Error("Tree components must be rendered within a TreeView.");
  }

  return context;
}

interface TreeSvgLinesProps {
  offsets: number[];
  className?: string;
}

export function TreeSvgLines({ offsets, className }: TreeSvgLinesProps) {
  if (offsets.length === 0) {
    return null;
  }

  const lastOffset = offsets[offsets.length - 1];
  const totalHeight = lastOffset + 1;
  const lastV = lastOffset - 5;

  return (
    <svg
      aria-hidden="true"
      width="12"
      height={totalHeight}
      viewBox={`0 0 12 ${totalHeight}`}
      fill="none"
      className={cn(
        "pointer-events-none absolute top-0 left-[12.5px] z-10 select-none text-border",
        className
      )}
    >
      <path
        d={`M0.5 0 V${lastV}`}
        stroke="currentColor"
        strokeWidth="1"
      />

      {offsets.map((y, index) => {
        const v = y - 5;

        return (
          <path
            key={index}
            d={`M0.5 ${v} Q0.5 ${y} 5.5 ${y} H11.5`}
            stroke="currentColor"
            strokeWidth="1"
          />
        );
      })}
    </svg>
  );
}

export interface TreeListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TreeList({ children, className, ...props }: TreeListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [offsets, setOffsets] = useState<number[]>([]);

  const childrenCount = Children.count(children);

  const updateOffsets = useCallback(() => {
    if (!containerRef.current) return;

    const directChildren = Array.from(
      containerRef.current.children
    ).filter((el) => el.tagName !== "svg") as HTMLElement[];

    const newOffsets = directChildren.map((child) => child.offsetTop + 16);

    setOffsets(newOffsets);
  }, []);

  useLayoutEffect(() => {
    updateOffsets();

    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateOffsets();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [childrenCount, updateOffsets]);

  return (
    <div
      ref={containerRef}
      role="group"
      className={cn("relative flex flex-col gap-0.5", className)}
      {...props}
    >
      <TreeSvgLines offsets={offsets} />

      {children}
    </div>
  );
}

export interface TreeItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  disabled?: boolean;
  href?: string;
}

export const TreeItem = forwardRef<HTMLButtonElement, TreeItemProps>(
  ({ id, label, icon: Icon, badge, disabled, href, className, onClick, ...props }, ref) => {
    const { selectedId, hoveredId, onSelect, onHover } = useTreeContext();

    const isSelected = selectedId === id;
    const isHovered = hoveredId === id;

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      onSelect(id);
      onClick?.(event);
    };

    const handleMouseEnter = () => {
      if (!disabled) {
        onHover(id);
      }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!disabled) {
          onSelect(id);
        }
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        role="treeitem"
        aria-selected={isSelected}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 pl-8 text-left text-sm outline-none transition-colors select-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          isSelected ? "font-medium text-foreground" : "text-muted-foreground",
          disabled && "cursor-not-allowed pointer-events-none opacity-40",
          className
        )}
        {...props}
      >
        {isSelected && (
          <motion.div
            layoutId="tree-selected-pill"
            className="pointer-events-none absolute inset-0 z-0 rounded-md bg-secondary"
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
            }}
          />
        )}

        {isHovered && !isSelected && (
          <motion.div
            layoutId="tree-hover-pill"
            className="pointer-events-none absolute inset-0 z-0 rounded-md bg-accent/60"
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
            }}
          />
        )}

        <div className="relative z-10 flex min-w-0 items-center gap-2">
          {Icon && (
            <Icon
              className={cn(
                "size-4 shrink-0 transition-colors duration-150",
                isSelected
                  ? "text-foreground"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
          )}

          <span className="truncate leading-none transition-colors duration-150 group-hover:text-foreground">
            {label}
          </span>
        </div>

        {badge && (
          <span className="relative z-10 ml-auto shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-tight uppercase text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
            {badge}
          </span>
        )}
      </button>
    );
  }
);

TreeItem.displayName = "TreeItem";

export interface TreeFolderProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  label: string;
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  badge?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  disabled?: boolean;
}

export function TreeFolder({
  id,
  label,
  icon: CustomIcon,
  badge,
  defaultExpanded = false,
  children,
  disabled,
  className,
  ...props
}: TreeFolderProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { hoveredId, onHover } = useTreeContext();

  const contentId = useId();

  const isHovered = hoveredId === id;
  const Icon = CustomIcon || (isExpanded ? FolderOpen : Folder);

  const handleToggle = () => {
    if (!disabled) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleMouseEnter = () => {
    if (!disabled) {
      onHover(id);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    } else if (event.key === "ArrowRight" && !isExpanded) {
      event.preventDefault();
      setIsExpanded(true);
    } else if (event.key === "ArrowLeft" && isExpanded) {
      event.preventDefault();
      setIsExpanded(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)} {...props}>
      <button
        type="button"
        role="treeitem"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        disabled={disabled}
        onClick={handleToggle}
        onMouseEnter={handleMouseEnter}
        onKeyDown={handleKeyDown}
        className={cn(
          "group relative flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 pl-8 text-left text-sm font-normal text-muted-foreground outline-none select-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          disabled && "cursor-not-allowed pointer-events-none opacity-40"
        )}
      >
        {isHovered && (
          <motion.div
            layoutId="tree-hover-pill"
            className="pointer-events-none absolute inset-0 z-0 rounded-md bg-accent/60"
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 35,
            }}
          />
        )}

        <div className="relative z-10 flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground transition-colors duration-150 group-hover:text-foreground" />

          <span className="truncate leading-none transition-colors duration-150 group-hover:text-foreground">
            {label}
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-1">
          {badge && (
            <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-tight uppercase text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
              {badge}
            </span>
          )}

          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
              isExpanded && "rotate-90"
            )}
          />
        </div>
      </button>

      <div
        id={contentId}
        aria-hidden={!isExpanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out pl-4",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        )}
      >
        <div className="overflow-hidden">
          <TreeList>{children}</TreeList>
        </div>
      </div>
    </div>
  );
}

export interface TreeSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
}

export function TreeSection({
  title,
  defaultExpanded = true,
  children,
  className,
}: TreeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const contentId = useId();

  const handleToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground transition-colors duration-150 group-hover:text-foreground">
          {title}
        </span>

        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>

      <div
        id={contentId}
        aria-hidden={!isExpanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        )}
      >
        <div className="overflow-hidden">
          <TreeList>{children}</TreeList>
        </div>
      </div>
    </div>
  );
}

export interface TreeViewProps extends Omit<HTMLAttributes<HTMLElement>, "onSelect"> {
  selectedId?: string;
  defaultSelectedId?: string;
  onSelect?: (id: string) => void;
  children: ReactNode;
}

export function TreeView({
  selectedId: controlledSelectedId,
  defaultSelectedId,
  onSelect: controlledOnSelect,
  children,
  className,
  ...props
}: TreeViewProps) {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    defaultSelectedId || null
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;

  const handleSelect = useCallback(
    (id: string) => {
      if (controlledSelectedId === undefined) {
        setInternalSelectedId(id);
      }
      controlledOnSelect?.(id);
    },
    [controlledSelectedId, controlledOnSelect]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      selectedId,
      hoveredId,
      onSelect: handleSelect,
      onHover: setHoveredId,
    }),
    [selectedId, hoveredId, handleSelect]
  );

  return (
    <TreeContext.Provider value={contextValue}>
      <LayoutGroup id="branching-tree-nav">
        <nav
          role="tree"
          aria-orientation="vertical"
          onMouseLeave={handleMouseLeave}
          className={cn("flex w-full flex-col gap-0.5 px-1 select-none", className)}
          {...props}
        >
          {children}
        </nav>
      </LayoutGroup>
    </TreeContext.Provider>
  );
}
