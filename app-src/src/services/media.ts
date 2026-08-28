// ============================================================
// SIFAU — Serviço de mídia (câmera/galeria) — camada de abstração
// ------------------------------------------------------------
// HOJE : <input type="file" accept="image/*" capture="environment">
//        + compressão client-side via <canvas>
// AMANHÃ: trocar por @capacitor/camera:
//   import { Camera, CameraResultType } from '@capacitor/camera';
//   const photo = await Camera.getPhoto({ resultType: CameraResultType.DataUrl, source: CameraSource.Camera });
// NENHUM outro módulo do app abre câmera diretamente.
// ============================================================

export type CapturedMedia = { dataUrl: string; kind: "foto" | "video"; name: string };

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.72;

/**
 * Abre a câmera do aparelho e devolve a foto comprimida como dataURL.
 * ⚠️ SUBSTITUIR POR @capacitor/camera QUANDO EMPACOTAR COMO APK.
 */
export function capturePhoto(maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<CapturedMedia> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // abre a câmera traseira diretamente
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("Nenhuma imagem selecionada."));
        return;
      }
      compressImage(file, maxDimension, quality)
        .then((dataUrl) => resolve({ dataUrl, kind: "foto", name: file.name }))
        .catch(reject);
    };
    input.onerror = () => reject(new Error("Falha ao abrir a câmera."));
    input.click();
  });
}

/** Abre a galeria para seleção de imagem (fallback desktop). */
export function pickImage(): Promise<CapturedMedia> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("Nenhuma imagem selecionada."));
        return;
      }
      compressImage(file, MAX_DIMENSION, JPEG_QUALITY)
        .then((dataUrl) => resolve({ dataUrl, kind: "foto", name: file.name }))
        .catch(reject);
    };
    input.click();
  });
}

/** Comprime imagem no cliente (canvas) para upload leve em conexões móveis. */
export function compressImage(file: File, maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas não suportado."));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Converte dataURL em Blob (para envio). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Tamanho aproximado em KB de um dataURL. */
export function dataUrlSizeKb(dataUrl: string): number {
  return Math.round((dataUrl.length * 3) / 4 / 1024);
}
