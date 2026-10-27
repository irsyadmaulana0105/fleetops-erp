import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "FleetOps ERP";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Sistem servis dan sparepart forklift untuk pemilik, admin, dan mekanik lapangan.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // Aplikasi internal: jangan diindeks mesin pencari.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  // viewport-fit=cover agar safe-area (notch / gesture bar) bisa dipakai bottom navigation.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
