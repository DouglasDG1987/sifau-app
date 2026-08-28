import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  ORIGEM_OS_LABELS,
  ORIGEM_OS_COLORS,
  STATUS_OS_LABELS,
  STATUS_OS_COLORS,
  CIENCIA_LABELS,
  type OccurrenceStatus,
  type UrgencyLevel,
  type OrigemOS,
  type StatusOS,
  type CienciaStatus,
} from "@/lib/types";

export function StatusBadge({ status, className }: { status: OccurrenceStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function UrgencyBadge({ urgency, className }: { urgency: UrgencyLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        URGENCY_COLORS[urgency],
        className
      )}
    >
      {URGENCY_LABELS[urgency]}
    </span>
  );
}

export function OrigemOSBadge({ origem, className }: { origem: OrigemOS; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        ORIGEM_OS_COLORS[origem],
        className
      )}
    >
      {ORIGEM_OS_LABELS[origem]}
    </span>
  );
}

export function StatusOSBadge({ status, className }: { status: StatusOS; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_OS_COLORS[status],
        className
      )}
    >
      {STATUS_OS_LABELS[status]}
    </span>
  );
}

export function CienciaBadge({ status }: { status: CienciaStatus }) {
  const cls =
    status === "assinou"
      ? "bg-success/10 text-success border-success/30"
      : status === "recusou"
        ? "bg-danger/10 text-danger border-danger/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {CIENCIA_LABELS[status]}
    </span>
  );
}
