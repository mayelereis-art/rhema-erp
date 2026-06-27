import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rhema Decorações — Gestão de Locação",
  description: "ERP de gestão de locação de decoração de eventos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
