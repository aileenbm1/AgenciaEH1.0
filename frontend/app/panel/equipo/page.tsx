"use client";
import { useEffect, useState } from 'react';
import { MessageCircleMore } from 'lucide-react';
import ProtectedPanel from '@/components/protected-panel';
import PublisherShell from '@/components/publisher/publisher-shell';
import { authJson, SessionUser } from '@/lib/auth';

type Member = { id: string; fullName: string; email: string; phone: string | null; active: boolean; slug: string | null; photoUrl: string | null; published: number; properties: number; leads30: number; leadsNew: number; reservations: number; membershipEnd: string | null; membershipActive: boolean };
const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function Team({ user }: { user: SessionUser }) {
  const [t, setT] = useState<{ agency: string | null; members: Member[] } | null>(null); const [err, setErr] = useState('');
  const [wa, setWa] = useState('');
  useEffect(() => { authJson<{ agency: string | null; members: Member[] }>('/panel/team').then(setT).catch(e => setErr(e.message)); fetch('/api/v1/site').then(r => r.json()).then(d => setWa(String(d?.config?.contact?.whatsapp || '').replace(/\D/g, ''))).catch(() => {}); }, []);
  const ask = encodeURIComponent(`Hola, soy ${user.fullName}${t?.agency ? ` de ${t.agency}` : ''}. Quiero dar de alta a un asesor nuevo en Mi Casa.\n\nNombre:\nCorreo:\nTeléfono:`);
  return <PublisherShell user={user} active="equipo">
    <div className="adm-top"><div><h1>Mi equipo</h1><p className="adm-date">Los asesores de {t?.agency || 'tu empresa'} y cómo van en los últimos 30 días.</p></div>
      <div className="adm-top-acts"><a className="button button-outline" href={wa ? `https://wa.me/${wa.length === 10 ? '52' + wa : wa}?text=${ask}` : `mailto:?subject=${encodeURIComponent('Alta de asesor')}&body=${ask}`} target="_blank" rel="noopener noreferrer"><MessageCircleMore size={16} aria-hidden /> Pedir un asesor nuevo</a></div></div>
    {err && <div className="notice">{err}</div>}
    {!t ? <p className="muted">Cargando…</p> : t.members.length === 0 ? <div className="adm-empty">Aún no tienes asesores ligados a tu {user.role === 'DEVELOPER' ? 'desarrolladora' : 'agencia'}. Pide al administrador que los dé de alta.</div>
      : <div className="adm-card pub-team">{t.members.map(m => <div key={m.id} className={`pub-tm${m.active ? '' : ' off'}`}>
        <div className="adm-user">{m.photoUrl ? <img className="pub-tm-ph" src={m.photoUrl} alt="" /> : <span className="adm-av sm">{m.fullName.charAt(0).toUpperCase()}</span>}
          <div><b>{m.fullName}</b><small>{m.email}{m.phone ? ` · ${m.phone}` : ''}</small>
            <small className={m.membershipActive ? 'ok-txt' : 'bad-txt'}>{m.membershipEnd ? `Membresía ${m.membershipActive ? 'activa hasta' : 'vencida el'} ${day(m.membershipEnd)}` : 'Sin membresía'}{!m.active ? ' · cuenta desactivada' : ''}</small></div></div>
        <div className="pub-num"><b>{m.published}</b><small>PUBLICADAS</small></div>
        <div className="pub-num"><b>{m.leads30}</b><small>MENSAJES{m.leadsNew ? ` · ${m.leadsNew} SIN RESPONDER` : ''}</small></div>
        <div className="pub-num"><b>{m.reservations}</b><small>RESERVAS ACTIVAS</small></div>
        {m.slug && <a className="inline-link" href={`/asesores/${m.slug}`} target="_blank" rel="noopener noreferrer">Ver perfil</a>}
      </div>)}</div>}
    <p className="muted" style={{ marginTop: 14 }}>Las cuentas de asesores las crea el administrador de Mi Casa. Con “Pedir un asesor nuevo” le envías la solicitud con los datos.</p>
  </PublisherShell>;
}
export default function Page() { return <ProtectedPanel allowed={['AGENCY', 'DEVELOPER']}>{user => <Team user={user} />}</ProtectedPanel>; }
