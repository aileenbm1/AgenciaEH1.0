"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { useSession } from "@/lib/use-session";
import { DEFAULT_SITE, SiteConfig } from "@/lib/site";
import { SiteA } from "@/components/site-link";
import { SiteBrand } from "@/components/site-brand";

export function SiteHeader({ site = DEFAULT_SITE }: { site?: SiteConfig }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const role = user ? ROLES[user.role] : null;
  const canPublish = user && ['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN'].includes(user.role);

  async function logout() { await signOut(); router.push('/'); router.refresh(); }

  return <header className="site-header">
    <SiteBrand brand={site.brand} />
    <nav>
      {site.header.links.map((l, i) => <SiteA key={i} href={l.href}>{l.label}</SiteA>)}
      {site.extra.filter(p => p.inHeader).map(p => <Link key={p.slug} href={`/p/${p.slug}`}>{p.title}</Link>)}
      {user?.role === 'ADMIN' && <Link href="/como-funciona">Cómo funciona</Link>}
    </nav>
    <div className="header-actions">
      {loading ? null : user && role ? <>
        <Link className="session-chip" href={role.home} title="Ir a mi panel">
          <span className="session-avatar">{user.fullName.trim().charAt(0).toUpperCase()}</span>
          <span><b>{user.fullName.split(' ')[0]}</b><small>{role.label}</small></span>
        </Link>
        {canPublish && <Link className="button button-gold" href="/panel/agente/propiedades#nueva">Nueva propiedad</Link>}
        <button className="login-link link-button" onClick={logout}>Salir</button>
      </> : <>
        <Link className="login-link" href="/acceso">Ingresar</Link>
        {site.header.buttonText && site.header.buttonHref && <SiteA className="button button-gold" href={site.header.buttonHref}>{site.header.buttonText}</SiteA>}
      </>}
    </div>
  </header>;
}
