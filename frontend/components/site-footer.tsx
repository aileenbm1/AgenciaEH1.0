import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube, Twitter, Music2 } from "lucide-react";
import { MUNICIPALITIES } from "@/lib/roles";
import { DEFAULT_SITE, SiteConfig, Social, SOCIAL_LABEL, tokens, waLink } from "@/lib/site";
import { SiteBrand } from "@/components/site-brand";
import { SiteA } from "@/components/site-link";

const ICONS: Record<Social, typeof Facebook> = { facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube, x: Twitter, tiktok: Music2 };

export function SiteFooter({ site = DEFAULT_SITE }: { site?: SiteConfig }) {
  const f = site.footer, c = site.contact;
  const socials = (Object.keys(SOCIAL_LABEL) as Social[]).filter(k => f.social?.[k]);
  const legal = site.extra.filter(p => p.inFooter);
  const wa = waLink(c.whatsapp);
  return <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <SiteBrand brand={site.brand} />
        {f.about && <p>{f.about}</p>}
        {socials.length > 0 && <div className="footer-social">
          {socials.map(k => { const Icon = ICONS[k]; return <a key={k} href={f.social[k]} target="_blank" rel="noopener noreferrer" aria-label={SOCIAL_LABEL[k]} title={SOCIAL_LABEL[k]}><Icon size={17} strokeWidth={1.5} /></a>; })}
        </div>}
      </div>
      {f.columns.map((col, i) => <div className="footer-col" key={i}>
        {col.title && <h4>{col.title}</h4>}
        {col.auto === 'municipios'
          ? MUNICIPALITIES.slice(0, 5).map(m => <Link key={m} href={`/propiedades?municipality=${encodeURIComponent(m)}`}>{m}</Link>)
          : col.links.map((l, j) => <SiteA key={j} href={l.href}>{l.label}</SiteA>)}
        {i === f.columns.length - 1 && <>
          {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
          {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          {c.address && <span className="footer-address">{c.address}</span>}
        </>}
      </div>)}
    </div>
    <div className="footer-bottom">
      <span>{tokens(f.bottom || '')}</span>
      {legal.length > 0 && <span className="footer-legal">{legal.map((p, i) => <span key={p.slug}>{i > 0 && ' · '}<Link href={`/p/${p.slug}`}>{p.title}</Link></span>)}</span>}
    </div>
  </footer>;
}
