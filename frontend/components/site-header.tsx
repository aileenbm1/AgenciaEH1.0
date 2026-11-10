"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { useSession } from "@/lib/use-session";

export function SiteHeader() {
  const { user, loading } = useSession();
  const router = useRouter();
  const role = user ? ROLES[user.role] : null;
  const canPublish = user && ['AGENT', 'AGENCY', 'DEVELOPER'].includes(user.role);

  async function logout() { await signOut(); router.push('/'); router.refresh(); }

  return <header className="site-header">
    <Link className="brand" href="/"><span className="brand-mark">EH</span><span><b>AGENCIA EH</b><small>PLATAFORMA INMOBILIARIA · BAJÍO</small></span></Link>
    <nav>
      <Link href="/propiedades">Explorar propiedades</Link>
      <Link href="/comparar">Comparar</Link>
      {user?.role === 'ADMIN' && <Link href="/como-funciona">Cómo funciona</Link>}
    </nav>
    <div className="header-actions">
      {loading ? null : user && role ? <>
        <Link className="session-chip" href={role.home} title="Ir a mi panel">
          <span className="session-avatar">{user.fullName.trim().charAt(0).toUpperCase()}</span>
          <span><b>{user.fullName.split(' ')[0]}</b><small>{role.label}</small></span>
        </Link>
        {canPublish && <Link className="button button-gold" href="/panel/agente/propiedades#nueva">Nueva propiedad</Link>}
        {user.role === 'ADMIN' && <Link className="button button-gold" href="/panel/admin">Revisar propiedades</Link>}
        <button className="login-link link-button" onClick={logout}>Salir</button>
      </> : <>
        <Link className="login-link" href="/acceso">Ingresar</Link>
        <Link className="button button-gold" href="/anunciar">Anunciar propiedad</Link>
      </>}
    </div>
  </header>;
}
