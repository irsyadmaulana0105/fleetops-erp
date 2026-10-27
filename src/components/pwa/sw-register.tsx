"use client";

import { useEffect } from "react";

/**
 * Mendaftarkan service worker (public/sw.js) hanya di production.
 * Di development dilewati agar tidak mengganggu hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Pendaftaran service worker gagal:", err);
    });
  }, []);

  return null;
}
