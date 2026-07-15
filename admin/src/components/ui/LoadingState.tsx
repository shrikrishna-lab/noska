import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  count?: number;
  className?: string;
}

export function LoadingState({ count = 5, className }: LoadingStateProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-[40%]" />
            <Skeleton className="h-3 w-[60%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
