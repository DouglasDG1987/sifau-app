"use client";

import { AlarmClock, AlertTriangle } from "lucide-react";
import { cn, fmtDuration, remainingMs } from "@/lib/utils";
import { useNow } from "@/lib/hooks";

interface SLATimerProps {
  deadline: string;
  created?: string | null;
  compact?: boolean;
  className?: string;
}

/** Timer de SLA com cor dinâmica: verde folgado · amarelo <25% · vermelho estourado. */
export function SLATimer({ deadline, created, compact = false, className }: SLATimerProps) {
  const now = useNow(30000);
  const remaining = remainingMs(deadline);
  const overdue = remaining < 0;

  let totalMs = 72 * 3600 * 1000;
  if (created) {
    const total = new Date(deadline).getTime() - new Date(created).getTime();
    if (Number.isFinite(total) && total > 0) totalMs = total;
  }
  const ratio = overdue ? 0 : Math.min(1, remaining / totalMs);
  const tone = overdue ? "danger" : ratio < 0.25 ? "warning" : "success";

  const text = overdue
    ? `SLA estourado há ${fmtDuration(Math.abs(remaining))}`
    : `Restam ${fmtDuration(remaining)}`;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          tone === "danger" && "text-danger",
          tone === "warning" && "text-warning",
          tone === "success" && "text-success",
          className
        )}
        title={`Prazo: ${new Date(deadline).toLocaleString("pt-BR")}`}
      >
        {overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <AlarmClock className="h-3.5 w-3.5" />}
        {text}
      </span>
    );
  }

  return (
    <div className={cn("rounded-lg border p-3", tone === "danger" && "border-danger/30 bg-danger/5", tone === "warning" && "border-warning/30 bg-warning/5", tone === "success" && "border-success/30 bg-success/5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {overdue ? (
            <AlertTriangle className={cn("h-4 w-4", tone === "danger" && "text-danger")} />
          ) : (
            <AlarmClock className={cn("h-4 w-4", tone === "warning" && "text-warning", tone === "success" && "text-success")} />
          )}
          <span className={cn(tone === "danger" && "text-danger", tone === "warning" && "text-warning", tone === "success" && "text-success")}>
            {text}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Prazo: {new Date(deadline).toLocaleString("pt-BR")}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "danger" && "bg-danger",
            tone === "warning" && "bg-warning",
            tone === "success" && "bg-success"
          )}
          style={{ width: `${overdue ? 100 : Math.max(4, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
