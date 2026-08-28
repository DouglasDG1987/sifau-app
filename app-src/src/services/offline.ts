// ============================================================
// SIFAU — Fila offline-first de vistorias (persistência local)
// HOJE : localStorage
// AMANHÃ: @capacitor/preferences ou SQLite local (Capacitor)
// ============================================================
import type { InspectionAction, UrgencyLevel } from "@/lib/types";

export interface PendingInspection {
  id: string;
  occurrence_id: string;
  occurrence_snapshot: {
    category: string;
    description: string;
    bairro: string | null | undefined;
    urgency_score: UrgencyLevel;
    status: string;
  };
  arrival_at: string;
  arrival_lat: number | null;
  arrival_lng: number | null;
  report: string;
  action_taken: InspectionAction;
  fine_amount: string;
  fine_process_number: string;
  photos: string[]; // dataURLs (preview local) — enviadas no sync
  created_at: string;
}

const KEY = "sifau_pending_vistorias";

export function loadPending(): PendingInspection[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingInspection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePending(items: PendingInspection[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // armazenamento cheio — tenta limpar fotos antigas
    try {
      const slim = items.map((i) => ({ ...i, photos: [] }));
      localStorage.setItem(KEY, JSON.stringify(slim));
    } catch {
      /* ignora */
    }
  }
}

export function addPending(item: PendingInspection): PendingInspection[] {
  const items = loadPending();
  items.unshift(item);
  savePending(items);
  return items;
}

export function removePending(id: string): PendingInspection[] {
  const items = loadPending().filter((i) => i.id !== id);
  savePending(items);
  return items;
}
