import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "SIFAU — Fiscalização e Atendimento Urbano",
    template: "%s · SIFAU",
  },
  description:
    "Plataforma municipal de fiscalização e atendimento urbano: cidadãos reportam, fiscais vistoriam em campo (offline-first), gestão acompanha KPIs e auditoria garante conformidade.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-512.png",
  },
  appleWebApp: {
    capable: true,
    title: "SIFAU",
    statusBarStyle: "default",
  },
  applicationName: "SIFAU",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1750AB",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <PWARegister />
      </body>
    </html>
  );
}
