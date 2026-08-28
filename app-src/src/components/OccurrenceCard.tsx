"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Occurrence } from "@/lib/types";
import { cn, fmtDate, truncate } from "@/lib/utils";
import { StatusBadge, UrgencyBadge } from "@/components/badges";
import { SLATimer } from "@/components/SLATimer";
import { Card, CardContent } from "@/components/ui/card";

interface OccurrenceCardProps {
  occurrence: Occurrence;
  onClick?: () => void;
  photo?: string | null;
  showFiscal?: boolean;
  rank?: number;
  className?: string;
}

export function OccurrenceCard({
  occurrence: o,
  onClick,
  photo,
  showFiscal = false,
  rank,
  className,
}: OccurrenceCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer overflow-hidden transition-all hover:border-primary/40 active:scale-[0.98]",
        className
      )}
    >
      {photo && (
        <div className="relative h-32 w-full bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={`Foto da ocorrência de ${o.category}`} className="h-full w-full object-cover" />
        </div>
      )}
      <CardContent className={cn("p-4", !photo && "pt-4")}>
        <div className="flex flex-wrap items-center gap-1.5">
          {rank != null && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
              {rank}
            </span>
          )}
          <StatusBadge status={o.status} />
          <UrgencyBadge urgency={o.urgency_score} />
        </div>
        <p className="mt-2 text-sm font-semibold leading-snug">{o.category}</p>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {truncate(o.description, 140)}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {o.bairro ?? "Bairro não informado"} · {fmtDate(o.created_at)}
          </span>
          {showFiscal && o.assigned_fiscal_name && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
              {o.assigned_fiscal_name}
            </span>
          )}
        </div>
        <div className="mt-2.5">
          <SLATimer deadline={o.sla_deadline} created={o.created_at} compact />
        </div>
      </CardContent>
    </Card>
  );
}
