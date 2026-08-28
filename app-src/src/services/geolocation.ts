// ============================================================
// SIFAU — Serviço de geolocalização (camada de abstração)
// ------------------------------------------------------------
// HOJE : navigator.geolocation (WebView do Capacitor suporta)
// AMANHÃ: trocar o corpo das funções por @capacitor/geolocation:
//   import { Geolocation } from '@capacitor/geolocation';
//   const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
// NENHUM outro módulo do app importa geolocalização diretamente.
// ============================================================

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracyM: number | null;
  timestamp: string;
}

export type GeoErrorCode = "denied" | "unavailable" | "timeout" | "unknown";

export class GeoError extends Error {
  code: GeoErrorCode;
  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function mapError(err: GeolocationPositionError): GeoError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return new GeoError("denied", "Permissão de localização negada. Habilite nos ajustes do aparelho.");
    case err.POSITION_UNAVAILABLE:
      return new GeoError("unavailable", "Posição indisponível no momento. Tente novamente.");
    case err.TIMEOUT:
      return new GeoError("timeout", "Tempo esgotado ao capturar a localização.");
    default:
      return new GeoError("unknown", "Não foi possível obter a localização.");
  }
}

/**
 * Captura a posição atual do aparelho.
 * ⚠️ SUBSTITUIR POR @capacitor/geolocation QUANDO EMPACOTAR COMO APK.
 */
export function getCurrentPosition(options: { timeoutMs?: number } = {}): Promise<GeoPosition> {
  const { timeoutMs = 15000 } = options;
  return new Promise<GeoPosition>((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new GeoError("unavailable", "Geolocalização não suportada neste dispositivo."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy ?? null,
          timestamp: new Date(pos.timestamp).toISOString(),
        });
      },
      (err) => reject(mapError(err)),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 }
    );
  });
}
