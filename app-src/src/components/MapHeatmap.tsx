"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { OccurrenceStatus, UrgencyLevel } from "@/lib/types";
import { URGENCY_HEX, URGENCY_LABELS } from "@/lib/types";
import { MUNICIPIO_CENTER } from "@/lib/geo";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  category: string;
  urgency: UrgencyLevel;
  status: OccurrenceStatus;
  bairro?: string | null;
}

const LeafletMap = dynamic(() => import("@/components/map-leaflet"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

interface MapHeatmapProps {
  points: MapPoint[];
  height?: number;
  center?: { lat: number; lng: number };
  zoom?: number;
  onSelect?: (p: MapPoint) => void;
}

export default function MapHeatmap({
  points,
  height = 320,
  center,
  zoom = 13,
  onSelect,
}: MapHeatmapProps) {
  const [fallback, setFallback] = useState(false);

  if (fallback) {
    return <DotMap points={points} height={height} onSelect={onSelect} />;
  }

  return (
    <ErrorBoundary title="Mapa indisponível" onError={() => setFallback(true)}>
      <div
        className="relative w-full overflow-hidden rounded-xl border shadow-sm"
        style={{ height }}
      >
        <LeafletMap points={points} center={center ?? MUNICIPIO_CENTER} zoom={zoom} onSelect={onSelect} />
      </div>
    </ErrorBoundary>
  );
}

/**
 * Fallback sem tiles: cluster de pontos coloridos por urgência,
 * normalizados pelo bounding box das coordenadas. Usado se o Leaflet
 * falhar (ex.: sem rede para os tiles).
 */
function DotMap({
  points,
  height,
  onSelect,
}: {
  points: MapPoint[];
  height: number;
  onSelect?: (p: MapPoint) => void;
}) {
  const bounds = useMemo(() => {
    if (points.length === 0) return null;
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [points]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border bg-[linear-gradient(rgba(23,80,171,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,80,171,0.06)_1px,transparent_1px)] bg-[size:28px_28px] shadow-sm"
      style={{ height }}
    >
      {points.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Nenhuma ocorrência geolocalizada para exibir.
        </div>
      ) : (
        <>
          {points.map((p) => {
            const pad = 0.12;
            const x =
              bounds && bounds.maxLng !== bounds.minLng
                ? ((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (1 - pad * 2) + pad
                : 0.5;
            const y =
              bounds && bounds.maxLat !== bounds.minLat
                ? (1 - (p.lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (1 - pad * 2) + pad
                : 0.5;
            return (
              <button
                key={p.id}
                type="button"
                aria-label={`${p.category} — urgência ${URGENCY_LABELS[p.urgency]}`}
                onClick={() => onSelect?.(p)}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card shadow-md transition-transform hover:scale-125"
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: 10 + p.urgency * 4,
                  height: 10 + p.urgency * 4,
                  background: URGENCY_HEX[p.urgency] ?? URGENCY_HEX[2],
                }}
              />
            );
          })}
          <div className="absolute bottom-2 left-2 rounded-lg border bg-card/95 px-2.5 py-1.5 text-[11px] shadow-sm">
            {([1, 2, 3, 4] as UrgencyLevel[]).map((u) => (
              <span key={u} className="mr-2 inline-flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: URGENCY_HEX[u] }}
                />
                {URGENCY_LABELS[u]}
              </span>
            ))}
            <span className="ml-1 text-muted-foreground">· mapa simplificado</span>
          </div>
        </>
      )}
    </div>
  );
}
