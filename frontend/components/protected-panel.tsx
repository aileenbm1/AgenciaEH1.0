"use client";
import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, roleHome, SessionUser, UserRole } from '@/lib/auth';

/**
 * Protege una página por rol.
 * - Sin sesión → /acceso?next=<ruta actual>
 * - Rol distinto → su propio panel
 * `children` puede ser una función que recibe el usuario.
 */
export default function ProtectedPanel({ children, allowed }: { children: ReactNode | ((user: SessionUser) => ReactNode); allowed: UserRole[] }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const key = allowed.join('|');
  useEffect(() => {
    let active = true;
    getCurrentUser().then(u => {
      if (!active) return;
      if (!u) { router.replace(`/acceso?next=${encodeURIComponent(window.location.pathname)}`); return; }
      if (!allowed.includes(u.role)) { router.replace(roleHome[u.role]); return; }
      setUser(u);
    }).catch(() => router.replace('/acceso'));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, key]);
  if (!user) return <main className="auth-wrap"><section className="auth-card"><p className="muted">Verificando tu sesión…</p></section></main>;
  return <>{typeof children === 'function' ? children(user) : children}</>;
}
