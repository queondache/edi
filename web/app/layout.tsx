import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDI — Rassegna stampa progressista",
  description: "Notizie da testate indipendenti e progressiste di tutto il mondo, in italiano.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
