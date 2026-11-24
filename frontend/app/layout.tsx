import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Pwa from "@/components/pwa";
import { getSite } from "@/lib/site-server";
import { themeCss } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  const name = site.brand.name && site.brand.name !== 'AGENCIA EH' ? site.brand.name : 'Agencia EH';
  return {
    title: `${name} | Propiedades en Guanajuato`, description: site.footer.about || "Encuentra, compara y promociona propiedades en Guanajuato.",
    applicationName: name, appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    icons: { icon: [{ url: "/icons/favicon-48.png", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  };
}
// El diseño del sitio (logotipo, colores, menú) se lee en cada visita: ninguna página queda congelada con el diseño de la compilación.
export const dynamic = "force-dynamic";
export const viewport: Viewport = { themeColor: "#172536" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const site = await getSite();
  // Colores y fuente elegidos por el administrador (solo #RRGGBB y fuentes de una lista fija).
  return <html lang="es-MX"><head><style id="site-theme">{themeCss(site.theme)}</style></head><body><SiteHeader site={site} />{children}<SiteFooter site={site} /><Pwa /></body></html>;
}
