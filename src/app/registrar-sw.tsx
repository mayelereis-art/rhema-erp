"use client";

import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // sem service worker o sistema funciona igual; só não fica instalável
      });
    }
  }, []);
  return null;
}
