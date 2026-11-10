import Link from "next/link";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { MUNICIPALITIES } from "@/lib/roles";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <Link className="brand" href="/"><span className="brand-mark">EH</span><span><b>AGENCIA EH</b><small>PLATAFORMA INMOBILIARIA · BAJÍO</small></span></Link>
        <p>Propiedades en renta y venta en Guanajuato, revisadas por nuestro equipo antes de publicarse.</p>
        <div className="footer-social">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} strokeWidth={1.5} /></a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} strokeWidth={1.5} /></a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={17} strokeWidth={1.5} /></a>
        </div>
      </div>
      <div className="footer-col">
        <h4>Explorar</h4>
        <Link href="/propiedades?operation=RENT">Propiedades en renta</Link>
        <Link href="/propiedades?operation=SALE">Propiedades en venta</Link>
        <Link href="/comparar">Comparar</Link>
      </div>
      <div className="footer-col">
        <h4>Municipios</h4>
        {MUNICIPALITIES.slice(0, 5).map(c => <Link key={c} href={`/propiedades?municipality=${encodeURIComponent(c)}`}>{c}</Link>)}
      </div>
      <div className="footer-col">
        <h4>Anunciantes</h4>
        <Link href="/anunciar">Soy agente</Link>
        <Link href="/anunciar">Soy agencia</Link>
        <Link href="/anunciar">Soy desarrollador</Link>
        <Link href="/acceso">Ingresar</Link>
        <a href="mailto:contacto@agenciaeh.mx">contacto@agenciaeh.mx</a>
      </div>
    </div>
    <div className="footer-bottom">
      <span>© {new Date().getFullYear()} Agencia EH · Guanajuato, México</span>
      <span>Aviso de privacidad · Términos y condiciones</span>
    </div>
  </footer>;
}
