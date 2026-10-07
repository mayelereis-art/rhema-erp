import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarServiceWorker } from "./registrar-sw";

export const metadata: Metadata = {
  title: "Rhema Decorações — Gestão de Locação",
  description: "ERP de gestão de locação de decoração de eventos.",
  applicationName: "Rhema",
  icons: {
    icon: [{ url: "/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iPad/iPhone: abre em tela cheia quando adicionado à tela de início
  appleWebApp: { capable: true, title: "Rhema", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#3a2a35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
