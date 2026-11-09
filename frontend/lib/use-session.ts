"use client";
import { useEffect, useState } from 'react';
import { getCurrentUser, SESSION_EVENT, SessionUser } from './auth';

/** Sesión actual en el cliente. `loading` es true hasta saber si hay usuario. */
export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = () => getCurrentUser().then(u => { if (active) { setUser(u); setLoading(false); } }).catch(() => { if (active) { setUser(null); setLoading(false); } });
    load();
    window.addEventListener(SESSION_EVENT, load);
    return () => { active = false; window.removeEventListener(SESSION_EVENT, load); };
  }, []);
  return { user, loading };
}
