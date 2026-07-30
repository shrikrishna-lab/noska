import { type ComponentType } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: number | null;
  icon: ComponentType<{ className?: string }>;
  subtitle?: string;
  className?: string;
}

export function KpiCard({ title, value, trend, icon: Icon, subtitle, className }: KpiCardProps) {
  const isPositive = trend != null && trend >= 0;

  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
      <Card className={cn("group relative overflow-hidden transition-shadow hover:shadow-md", className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {trend != null && (
            <div className="mt-3 flex items-center gap-1">
              <div className={cn("flex items-center gap-0.5 text-xs font-medium", isPositive ? "text-success" : "text-destructive")}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground">vs last period</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
