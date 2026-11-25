"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { useSession } from "@/lib/use-session";
import { DEFAULT_SITE, SiteConfig } from "@/lib/site";
import { SiteA } from "@/components/site-link";
import { SiteBrand } from "@/components/site-brand";
import { useEffect, useRef, useState } from "react";
import { useSessionSummary } from "@/components/session-summary";

export function SiteHeader({ site = DEFAULT_SITE }: { site?: SiteConfig }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const role = user ? ROLES[user.role] : null;
  const canPublish = user && ['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN'].includes(user.role);

  const sum = useSessionSummary(user);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, [open]);

  async function logout() { setOpen(false); await signOut(); router.push('/'); router.refresh(); }

  return <header className="site-header">
    <SiteBrand brand={site.brand} />
    <nav>
      {site.header.links.map((l, i) => <SiteA key={i} href={l.href}>{l.label}</SiteA>)}
      {site.extra.filter(p => p.inHeader).map(p => <Link key={p.slug} href={`/p/${p.slug}`}>{p.title}</Link>)}
    </nav>
    <div className="header-actions">
      {loading ? null : user && role ? <>
        {canPublish && user.role !== 'ADMIN' && <Link className="button button-outline header-new" href="/panel/agente/propiedades#nueva">+ Nueva propiedad</Link>}
        <div className="user-menu" ref={box}>
          <button type="button" className="session-chip" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)} title="Mi menú">
            <span className="session-avatar">{user.fullName.trim().charAt(0).toUpperCase()}{sum && sum.total > 0 && <i className="session-badge" aria-label={`${sum.total} pendientes`}>{sum.total}</i>}</span>
            <span><b>{user.fullName.split(' ')[0]}</b><small>{role.label}</small></span>
            <span className="session-caret" aria-hidden>▾</span>
          </button>
          {open && <div className="user-menu-pop" role="menu">
            <div className="user-menu-who"><b>{user.fullName}</b><small>{role.label}</small></div>
            {(sum?.menu || [{ icon: '▦', label: 'Mi panel', href: role.home }]).map(m => <Link key={m.href + m.label} role="menuitem" href={m.href} onClick={() => setOpen(false)}><span aria-hidden>{m.icon}</span>{m.label}{m.n ? <i>{m.n}</i> : null}</Link>)}
            <hr /><button type="button" role="menuitem" onClick={logout}><span aria-hidden>↩</span>Salir</button>
          </div>}
        </div>
      </> : <>
        <Link className="login-link" href="/acceso">Ingresar</Link>
        {site.header.buttonText && site.header.buttonHref && <SiteA className="button button-gold" href={site.header.buttonHref}>{site.header.buttonText}</SiteA>}
      </>}
    </div>
  </header>;
}
