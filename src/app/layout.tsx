import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import Navbar from "./components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Legal Privacy — Copiloto Jurídico y Privacidad Zero-Trust",
  description:
    "Plataforma de auditoría local, análisis de contratos y redacción asistida sin fuga de datos personales para despachos jurídicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans bg-background text-foreground min-h-screen selection:bg-primary/20 selection:text-primary`}
      >
        <Toaster richColors position="top-right" />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
