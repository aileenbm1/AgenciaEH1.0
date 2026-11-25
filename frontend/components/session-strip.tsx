"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useSession } from '@/lib/use-session';
import { useSessionSummary } from './session-summary';

const HIDE = /^\/(panel|vista-previa|acceso|restablecer-contrasena|recuperar|verificar-correo|cuenta|sin-conexion)(\/|$)|\/fanpage$/;

/** Franja de bienvenida (solo con sesión iniciada): los pendientes de hoy de cada rol y el botón a su panel. */
export default function SessionStrip() {
  const path = usePathname() || '/';
  const { user } = useSession();
  const sum = useSessionSummary(user);
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(sessionStorage.getItem('mc-strip-hidden') === '1'); } catch { /* sin almacenamiento */ } }, []);
  if (!user || !sum || hidden || HIDE.test(path)) return null;
  const first = user.fullName.trim().split(' ')[0];
  const close = () => { setHidden(true); try { sessionStorage.setItem('mc-strip-hidden', '1'); } catch { /* sin almacenamiento */ } };
  const buyer = user.role === 'BUYER';
  return <div className="session-strip" role="region" aria-label="Tus pendientes">
    <span className="ss-hi">Hola, {first}</span>
    {buyer ? (sum.stay
      ? <Link className="ss-stay" href={`/panel/reservas/${sum.stay.id}`}>{sum.stay.cover ? <img src={sum.stay.cover} alt="" /> : null}<span><b>{sum.stay.title}{sum.stay.when ? ` · ${sum.stay.when.split(' · ')[0]}` : ''}</b><small>{sum.stay.urgent ? <em className="ss-due">{sum.stay.note}</em> : sum.stay.note}</small></span></Link>
      : <span className="ss-quiet">¿Buscas tu próximo espacio? Guarda favoritos y te avisamos de lo nuevo.</span>)
      : <div className="ss-chips">{sum.items.length ? sum.items.slice(0, 4).map(x => <Link key={x.label} className={`ss-chip${x.warn ? ' warn' : ''}`} href={x.href}><b>{x.n}</b>{x.label}</Link>)
        : <span className="ss-quiet">✓ Todo al día: no tienes pendientes.</span>}</div>}
    {buyer && <Link className="ss-sec" href="/panel/comprador#favoritos">♥ Favoritos{sum.favs ? ` (${sum.favs})` : ''}</Link>}
    {user.role === 'ADMIN' && <Link className="ss-sec" href="/panel/admin/sitio">Editar el sitio</Link>}
    <Link className="ss-go" href={buyer && sum.stay ? `/panel/reservas/${sum.stay.id}` : sum.panel}>{buyer && sum.stay ? (sum.stay.pay ? 'Ver mi reserva y pagar →' : 'Ver mi reserva →') : 'Ir a mi panel →'}</Link>
    <button type="button" className="ss-x" onClick={close} aria-label="Ocultar esta franja" title="Ocultar"><X size={16} /></button>
  </div>;
}
