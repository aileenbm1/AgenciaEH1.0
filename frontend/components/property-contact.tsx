"use client";
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { currentToken, getCurrentUser } from '@/lib/auth';

type Owner = { fullName: string; role: string; phone?: string | null; agency?: { name: string; slug: string } | null } | null | undefined;

/** WhatsApp con número mexicano: 10 dígitos → 52 + número. */
const waNumber = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `52${d}` : d; };
const minVisit = () => { const d = new Date(Date.now() + 60 * 60000); d.setMinutes(0, 0, 0); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

/** Contacto real del anunciante: WhatsApp, mensaje y solicitud de visita (llegan a su panel como prospecto). */
export default function PropertyContact({ propertyId, title, owner }: { propertyId: string; title: string; owner: Owner }) {
  const [tab, setTab] = useState<'MESSAGE' | 'VISIT'>('MESSAGE');
  const [f, setF] = useState({ name: '', email: '', phone: '', message: `Hola, me interesa "${title}". ¿Sigue disponible?`, visitAt: '', website: '' });
  const [busy, setBusy] = useState(false); const [ok, setOk] = useState(''); const [error, setError] = useState('');
  useEffect(() => { if (currentToken()) getCurrentUser().then(u => u && setF(x => ({ ...x, name: x.name || u.fullName, email: x.email || u.email, phone: x.phone || u.phone || '' }))).catch(() => {}); }, []);

  async function send(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setOk('');
    try {
      const token = currentToken();
      const body = { propertyId, kind: tab, name: f.name, email: f.email, phone: f.phone || undefined, website: f.website || undefined,
        message: f.message || undefined, visitAt: tab === 'VISIT' && f.visitAt ? new Date(f.visitAt).toISOString() : undefined };
      const r = await fetch('/api/v1/leads', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(Array.isArray(d.message) ? d.message.join(' ') : d.message || 'No se pudo enviar.');
      setOk(d.message || 'Enviado.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo enviar.'); }
    finally { setBusy(false); }
  }

  const wa = owner?.phone ? `https://wa.me/${waNumber(owner.phone)}?text=${encodeURIComponent(`Hola, vi "${title}" en Agencia EH y me interesa.`)}` : null;
  return <div className="agent-box contact-box">
    <b>{owner?.fullName || 'Agencia EH'}</b>
    <small>{owner?.role === 'AGENCY' ? 'Agencia inmobiliaria' : 'Asesor inmobiliario'}{owner?.agency && owner.role !== 'AGENCY' ? <> · <Link href={`/agencias/${owner.agency.slug}`}>{owner.agency.name}</Link></> : null}</small>
    {owner?.agency && owner.role === 'AGENCY' && <Link className="small-link" href={`/agencias/${owner.agency.slug}`}>Ver perfil de la agencia →</Link>}
    {wa && <a className="button button-navy full" href={wa} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>}

    {ok ? <div className="notice ok" role="status">{ok}</div> : <form onSubmit={send} className="contact-form">
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'MESSAGE'} className={tab === 'MESSAGE' ? 'selected' : ''} onClick={() => setTab('MESSAGE')}>✉️ Mensaje</button>
        <button type="button" role="tab" aria-selected={tab === 'VISIT'} className={tab === 'VISIT' ? 'selected' : ''} onClick={() => setTab('VISIT')}>📅 Agendar visita</button>
      </div>
      <label>Nombre<input required minLength={2} maxLength={120} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
      <label>Correo<input required type="email" maxLength={190} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
      <label>Teléfono (opcional)<input type="tel" maxLength={25} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} autoComplete="tel" /></label>
      {tab === 'VISIT' && <label>Día y hora que prefieres<input required type="datetime-local" min={minVisit()} value={f.visitAt} onChange={e => setF({ ...f, visitAt: e.target.value })} /></label>}
      <label>{tab === 'VISIT' ? 'Comentarios (opcional)' : 'Mensaje'}<textarea rows={3} maxLength={2000} required={tab === 'MESSAGE'} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></label>
      <input className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} />
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="button button-outline full" disabled={busy}>{busy ? 'Enviando…' : tab === 'VISIT' ? 'Solicitar visita' : 'Enviar mensaje'}</button>
      <small className="muted">El asesor recibe tu mensaje y te contacta. {tab === 'VISIT' ? 'Te confirmará la visita.' : ''}</small>
    </form>}
  </div>;
}
