"use client";

import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import React from "react";

interface InfoCardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface InfoCardDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const InfoCardTitle = React.memo(
  ({ children, className, ...props }: InfoCardTitleProps) => {
    return (
      <div
        className={cn(
          "font-normal text-xs text-[#9CA3AF] dark:text-[#9CA3AF]/90 mb-1 leading-none select-none tracking-normal",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InfoCardTitle.displayName = "InfoCardTitle";

const InfoCardDescription = React.memo(
  ({ children, className, ...props }: InfoCardDescriptionProps) => {
    return (
      <div
        className={cn(
          "text-[14px] font-medium text-[#374151] dark:text-[#E5E7EB] leading-tight select-none mb-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InfoCardDescription.displayName = "InfoCardDescription";

interface CommonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  storageKey?: string;
  dismissType?: "once" | "forever" | "snooze";
  snoozeDays?: number;
}

type InfoCardContentProps = CommonCardProps;
type InfoCardFooterProps = CommonCardProps;
type InfoCardDismissProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  onDismiss?: () => void;
};
type InfoCardActionProps = CommonCardProps;

const InfoCardContent = React.memo(
  ({ children, className, ...props }: InfoCardContentProps) => {
    return (
      <div className={cn("flex flex-col text-xs", className)} {...props}>
        {children}
      </div>
    );
  }
);
InfoCardContent.displayName = "InfoCardContent";

interface MediaItem {
  type?: "image" | "video";
  src: string;
  alt?: string;
  className?: string;
  [key: string]: any;
}

interface InfoCardMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  media: MediaItem[];
  loading?: "eager" | "lazy";
  shrinkHeight?: number;
  expandHeight?: number;
}

const InfoCardImageContext = createContext<{
  handleMediaLoad: (mediaSrc: string) => void;
  setAllImagesLoaded: (loaded: boolean) => void;
}>({
  handleMediaLoad: () => { },
  setAllImagesLoaded: () => { },
});

const InfoCardContext = createContext<{
  isHovered: boolean;
  onDismiss: () => void;
}>({
  isHovered: false,
  onDismiss: () => { },
});

function InfoCard({
  children,
  className,
  storageKey,
  dismissType = "once",
  snoozeDays = 7,
}: InfoCardProps) {
  if ((dismissType === "forever" || dismissType === "snooze") && !storageKey) {
    throw new Error(
      'A storageKey must be provided when using dismissType="forever" or "snooze"'
    );
  }

  const [isHovered, setIsHovered] = useState(false);
  const [allImagesLoaded, setAllImagesLoaded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined" || dismissType === "once") return false;
    if (dismissType === "forever") {
      return localStorage.getItem(storageKey!) === "dismissed";
    }
    if (dismissType === "snooze") {
      const stored = localStorage.getItem(storageKey!);
      if (!stored) return false;
      try {
        const { dismissedAt } = JSON.parse(stored);
        return Date.now() - dismissedAt < snoozeDays * 86400000;
      } catch {
        return stored === "dismissed";
      }
    }
    return false;
  });

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    if (dismissType === "forever") {
      localStorage.setItem(storageKey!, "dismissed");
    } else if (dismissType === "snooze") {
      localStorage.setItem(storageKey!, JSON.stringify({ dismissedAt: Date.now() }));
    }
  }, [storageKey, dismissType]);

  const imageContextValue = useMemo(
    () => ({
      handleMediaLoad: () => { },
      setAllImagesLoaded,
    }),
    [setAllImagesLoaded]
  );

  const cardContextValue = useMemo(
    () => ({
      isHovered,
      onDismiss: handleDismiss,
    }),
    [isHovered, handleDismiss]
  );

  return (
    <InfoCardContext.Provider value={cardContextValue}>
      <InfoCardImageContext.Provider value={imageContextValue}>
        <AnimatePresence>
          {!isDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 10,
                transition: { duration: 0.2 },
              }}
              transition={{ duration: 0.3, delay: 0 }}
              className={cn(
                "group rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#181A20] p-3.5 shadow-md transition-shadow hover:shadow-lg",
                className
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </InfoCardImageContext.Provider>
    </InfoCardContext.Provider>
  );
}

const InfoCardFooter = ({ children, className }: InfoCardFooterProps) => {
  const { isHovered } = useContext(InfoCardContext);

  return (
    <motion.div
      className={cn(
        "flex justify-between items-center text-xs text-muted-foreground overflow-hidden",
        className
      )}
      initial={{ opacity: 0, height: "0px", marginTop: "0px" }}
      animate={{
        opacity: isHovered ? 1 : 0,
        height: isHovered ? "auto" : "0px",
        marginTop: isHovered ? "12px" : "0px",
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      }}
    >
      {children}
    </motion.div>
  );
};

const InfoCardDismiss = React.memo(
  ({ children, className, onDismiss, ...props }: InfoCardDismissProps) => {
    const { onDismiss: contextDismiss } = useContext(InfoCardContext);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      onDismiss?.();
      contextDismiss();
    };

    return (
      <div
        className={cn(
          "cursor-pointer text-muted-foreground/80 hover:text-foreground dark:text-muted-foreground dark:hover:text-gray-200 transition-colors text-xs font-normal select-none",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InfoCardDismiss.displayName = "InfoCardDismiss";

const InfoCardAction = React.memo(
  ({ children, className, ...props }: InfoCardActionProps) => {
    return (
      <div
        className={cn(
          "text-xs font-normal text-muted-foreground/80 hover:text-foreground transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InfoCardAction.displayName = "InfoCardAction";

const InfoCardMedia = ({
  media = [],
  className,
  loading = undefined,
  shrinkHeight = 85,
  expandHeight = 145,
}: InfoCardMediaProps) => {
  const { isHovered } = useContext(InfoCardContext);
  const { setAllImagesLoaded } = useContext(InfoCardImageContext);
  const [isOverflowVisible, setIsOverflowVisible] = useState(false);
  const loadedMedia = useRef(new Set());

  const handleMediaLoad = (mediaSrc: string) => {
    loadedMedia.current.add(mediaSrc);
    if (loadedMedia.current.size === Math.min(3, media.slice(0, 3).length)) {
      setAllImagesLoaded(true);
    }
  };

  const processedMedia = useMemo(
    () =>
      media.map((item) => ({
        ...item,
        type: item.type || "image",
      })),
    [media]
  );

  const displayMedia = useMemo(
    () => processedMedia.slice(0, 3),
    [processedMedia]
  );

  useEffect(() => {
    if (media.length > 0) {
      setAllImagesLoaded(false);
      loadedMedia.current.clear();
    } else {
      setAllImagesLoaded(true);
    }
  }, [media.length]);

  useEffect(() => {
    let timeoutId: any;
    if (isHovered) {
      timeoutId = setTimeout(() => {
        setIsOverflowVisible(true);
      }, 100);
    } else {
      setIsOverflowVisible(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isHovered]);

  const mediaCount = displayMedia.length;

  const getRotation = (index: number) => {
    if (!isHovered || mediaCount <= 1) return 0;
    if (mediaCount === 2) return index === 0 ? -4 : 1;
    return index === 0 ? -6.5 : index === 1 ? -2.5 : 0.5;
  };

  const getTranslateX = (index: number) => {
    if (!isHovered || mediaCount <= 1) return 0;
    if (mediaCount === 2) return index === 0 ? -12 : 8;
    return index === 0 ? -20 : index === 1 ? -8 : 8;
  };

  const getTranslateY = (index: number) => {
    if (!isHovered) return 0;
    if (mediaCount <= 1) return -4;
    return index === 0 ? -8 : index === 1 ? -4 : 2;
  };

  const getScale = (index: number) => {
    if (!isHovered) return 1;
    if (mediaCount <= 1) return 1;
    return index === 0 ? 0.94 : index === 1 ? 0.97 : 1.0;
  };

  return (
    <InfoCardImageContext.Provider
      value={{
        handleMediaLoad,
        setAllImagesLoaded,
      }}
    >
      <motion.div
        className={cn("relative mt-2 rounded-lg", className)}
        animate={{
          height:
            media.length > 0
              ? isHovered
                ? expandHeight
                : shrinkHeight
              : "auto",
        }}
        style={{
          overflow: isOverflowVisible ? "visible" : "hidden",
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          duration: 0.3,
        }}
      >
        <div
          className={cn(
            "relative w-full",
            media.length > 0 ? { height: shrinkHeight } : "h-auto"
          )}
          style={{ height: shrinkHeight }}
        >
          {displayMedia.map((item, index) => {
            const {
              type,
              src,
              alt,
              className: itemClassName,
              ...mediaProps
            } = item;

            return (
              <motion.div
                key={src}
                className="absolute inset-x-0 w-full h-[96px]"
                style={{
                  zIndex: index,
                  transformOrigin: "bottom center",
                }}
                animate={{
                  rotateZ: getRotation(index),
                  x: getTranslateX(index),
                  y: getTranslateY(index),
                  scale: getScale(index),
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                {type === "video" ? (
                  <video
                    src={src}
                    className={cn(
                      "w-full h-[96px] rounded-lg border border-gray-200/90 dark:border-white/10 object-cover object-top shadow-md bg-white",
                      itemClassName
                    )}
                    onLoadedData={() => handleMediaLoad(src)}
                    preload="metadata"
                    muted
                    playsInline
                    {...mediaProps}
                  />
                ) : (
                  <img
                    src={src}
                    alt={alt}
                    className={cn(
                      "w-full h-[96px] rounded-lg border border-gray-200/90 dark:border-white/10 object-cover object-top shadow-md bg-white",
                      itemClassName
                    )}
                    onLoad={() => handleMediaLoad(src)}
                    loading={loading}
                    {...mediaProps}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="absolute right-0 bottom-0 left-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-[#181A20] dark:via-[#181A20]/80 pointer-events-none"
          animate={{ opacity: isHovered ? 0 : 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            duration: 0.3,
          }}
        />
      </motion.div>
    </InfoCardImageContext.Provider>
  );
};

export {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardContent,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
  InfoCardAction,
};
