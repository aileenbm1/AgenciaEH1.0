import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Pwa from "@/components/pwa";
export const metadata: Metadata = {
  title: "Agencia EH | Propiedades en Guanajuato", description: "Encuentra, compara y promociona propiedades en Guanajuato.",
  applicationName: "Agencia EH", appleWebApp: { capable: true, title: "Agencia EH", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/favicon-48.png", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#172536" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es-MX"><body><SiteHeader />{children}<SiteFooter /><Pwa /></body></html>; }
