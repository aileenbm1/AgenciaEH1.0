"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, BellOff, UsersRound } from 'lucide-react';
import { authJson, currentToken } from '@/lib/auth';

type Status = { count: number; watching: boolean; shareContact: boolean };

/**
 * “Avísame cuando esté disponible” (o, si ya está disponible, “avísame si baja de precio”).
 * Compartir los datos con el anunciante es opcional; si no, solo ve que hay alguien esperando.
 */
export default function WatchBox({ propertyId, mode, ownerName }: { propertyId: string; mode: 'unavailable' | 'price'; ownerName?: string }) {
  const [st, setSt] = useState<Status | null>(null);
  const [logged, setLogged] = useState(false);
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    const has = !!currentToken(); setLogged(has);
    (has ? authJson<Status>(`/watches/status/${propertyId}`) : fetch(`/api/v1/watches/count/${propertyId}`).then(r => r.json()).then(d => ({ count: d.count || 0, watching: false, shareContact: false })))
      .then(s => { setSt(s); setShare(s.shareContact); }).catch(() => setSt({ count: 0, watching: false, shareContact: false }));
  }, [propertyId]);
  const save = async (on: boolean) => {
    setBusy(true); setMsg('');
    try { const s = await authJson<Status>(`/watches/${propertyId}`, on ? { method: 'POST', body: JSON.stringify({ shareContact: share }) } : { method: 'DELETE' }); setSt(s); setMsg(on ? 'Listo: te avisaremos por correo y aquí en Mi Casa.' : 'Quitamos el aviso.'); }
    catch (e) { setMsg(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  };
  if (!st) return null;
  const first = ownerName?.split(' ')[0] || 'el asesor';
  const here = typeof window !== 'undefined' ? window.location.pathname : '/propiedades';
  const people = st.count > 0 && <div className="watch-people"><UsersRound size={15} aria-hidden /> {st.count === 1 ? '1 persona ya espera' : `${st.count} personas ya esperan`} esta propiedad</div>;

  if (mode === 'price') return <div className="watch-mini">
    {st.watching ? <button type="button" className="inline-link" disabled={busy} onClick={() => save(false)}><BellOff size={15} aria-hidden /> Quitar aviso de precio</button>
      : logged ? <button type="button" className="inline-link" disabled={busy} onClick={() => save(true)}><BellRing size={15} aria-hidden /> Avísame si baja de precio</button>
        : <Link className="inline-link" href={`/acceso?next=${encodeURIComponent(here)}`}><BellRing size={15} aria-hidden /> Avísame si baja de precio</Link>}
    {msg && <small className="muted" role="status">{msg}</small>}
  </div>;

  return <div className={`watch-box${st.watching ? ' on' : ''}`}>
    <h3><BellRing size={18} aria-hidden /> {st.watching ? 'Te avisaremos cuando esté disponible' : 'Avísame cuando esté disponible'}</h3>
    {st.watching ? <>
      <p className="muted small">Te escribimos una sola vez: unos días antes de que se libere, cuando esté disponible o si baja de precio.{st.shareContact ? ` ${first} puede ver tus datos para contactarte.` : ''}</p>
      <button type="button" className="button button-outline" disabled={busy} onClick={() => save(false)}>Quitar aviso</button>
      <Link className="small-link" href="/panel/comprador#avisos">Ver mis avisos →</Link>
    </> : <>
      <ul className="watch-list"><li>Cuando se libere o baje de precio</li><li>Por correo y aquí en Mi Casa</li></ul>
      {logged && <label className="check"><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} /> <span>Compartir mis datos con {first}<small>Para que te contacte antes que a otros. Si no, solo ve que hay alguien esperando.</small></span></label>}
      {logged ? <button type="button" className="button button-navy" disabled={busy} onClick={() => save(true)}>Activar aviso</button>
        : <Link className="button button-navy" href={`/acceso?next=${encodeURIComponent(here)}`}>Inicia sesión para activar el aviso</Link>}
    </>}
    {people}
    {msg && <small className="muted" role="status">{msg}</small>}
  </div>;
}
