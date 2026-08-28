"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { URGENCY_HEX, URGENCY_LABELS, STATUS_LABELS, type OccurrenceStatus, type UrgencyLevel } from "@/lib/types";
import type { MapPoint } from "@/components/MapHeatmap";

interface Props {
  points: MapPoint[];
  center: { lat: number; lng: number };
  zoom: number;
  onSelect?: (p: MapPoint) => void;
}

export default function LeafletMap({ points, center, zoom, onSelect }: Props) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={6 + p.urgency * 2.2}
          pathOptions={{
            color: URGENCY_HEX[p.urgency as UrgencyLevel] ?? URGENCY_HEX[2],
            fillColor: URGENCY_HEX[p.urgency as UrgencyLevel] ?? URGENCY_HEX[2],
            fillOpacity: 0.55,
            weight: 1.5,
          }}
          eventHandlers={{ click: () => onSelect?.(p) }}
        >
          <Popup>
            <div className="min-w-[160px] text-sm">
              <p className="font-semibold">{p.category}</p>
              <p className="text-xs text-muted-foreground">
                {p.bairro ?? "Bairro não informado"} · {URGENCY_LABELS[p.urgency as UrgencyLevel]} ·{" "}
                {STATUS_LABELS[p.status as OccurrenceStatus]}
              </p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
