// Utilitários de geolocalização (cálculos puros, sem dependência de plataforma)

/** Distância haversine em metros entre duas coordenadas. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // raio da Terra em metros
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return haversineMeters(lat1, lng1, lat2, lng2) / 1000;
}

/** Latitude/longitude padrão do município demo (usado como centro do mapa). */
export const MUNICIPIO_CENTER = { lat: -23.5505, lng: -46.6333 };
