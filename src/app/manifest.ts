import type { MetadataRoute } from "next";

// Torna o sistema instalável (PWA) no tablet/celular: ícone na tela inicial e
// abertura em tela cheia, sem a barra do navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rhema Decorações — Gestão de Locação",
    short_name: "Rhema",
    description: "Gestão de locação de decoração de eventos da Rhema Decorações.",
    lang: "pt-BR",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#faf6f0",
    theme_color: "#3a2a35",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
