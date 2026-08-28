import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export type Tone = "primary" | "success" | "warning" | "danger" | "muted";

const TONE_CLS: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
  sub,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: Tone;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", TONE_CLS[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-bold tracking-tight">{value}</p>
          {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCard({
  label,
  value,
  tone = "primary",
  sub,
  className,
}: {
  label: string;
  value: string | number;
  tone?: Tone;
  sub?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className={cn("absolute inset-x-0 top-0 h-1", TONE_CLS[tone].split(" ")[0])} />
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
