"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA instalável) em produção. */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA é progressivo — falha silenciosa */
      });
    }
  }, []);
  return null;
}
