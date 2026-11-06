import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
export const metadata: Metadata = { title: "Agencia EH | Propiedades en Guanajuato", description: "Encuentra, compara y promociona propiedades en Guanajuato." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es-MX"><body><SiteHeader />{children}</body></html>; }
