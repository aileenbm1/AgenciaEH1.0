"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPanel from '@/components/protected-panel';
import { authJson, roleHome, SessionUser } from '@/lib/auth';

type Lead = { id: string; kind: 'MESSAGE' | 'VISIT'; status: string; name: string; email: string; phone?: string | null; message?: string | null; notes?: string | null;
  visitAt?: string | null; createdAt: string; property: { id: string; title: string; slug: string } | null; assignedTo: { id: string; fullName: string } | null };

export const LEAD_STATUS: Record<string, { label: string; tone: string }> = {
  NEW: { label: 'Nuevo', tone: 'warn' }, CONTACTED: { label: 'Contactado', tone: 'neutral' }, VISIT_SCHEDULED: { label: 'Visita agendada', tone: 'ok' },
  CLOSED: { label: 'Cerrado', tone: 'ok' }, LOST: { label: 'Perdido', tone: 'bad' },
};
const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const waNumber = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `52${d}` : d; };

function LeadCard({ lead, me, onSaved }: { lead: Lead; me: SessionUser; onSaved: (l: Lead) => void }) {
  const [notes, setNotes] = useState(lead.notes || ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async (change: Partial<{ status: string; notes: string }>) => {
    setBusy(true); setErr('');
    try { onSaved(await authJson<Lead>(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(change) })); }
    catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  };
  const st = LEAD_STATUS[lead.status] || { label: lead.status, tone: 'neutral' };
  return <article className={`dashboard-card lead-card${lead.status === 'NEW' ? ' is-new' : ''}`}>
    <div className="lead-head">
      <div><i className={`status-pill ${st.tone}`}>{st.label}</i> <i className="status-pill neutral">{lead.kind === 'VISIT' ? '📅 Visita' : '✉️ Mensaje'}</i></div>
      <small className="muted">{fmt(lead.createdAt)}</small>
    </div>
    <h3>{lead.name}</h3>
    <p className="meta">{lead.property ? <>Por <Link href={`/propiedades/${lead.property.slug}`}>{lead.property.title}</Link></> : 'Propiedad eliminada'}
      {lead.assignedTo && lead.assignedTo.id !== me.id ? ` · Asesor: ${lead.assignedTo.fullName}` : ''}</p>
    {lead.kind === 'VISIT' && lead.visitAt && <p className="lead-visit">📅 Quiere visitar: <b>{fmt(lead.visitAt)}</b></p>}
    {lead.message && <p className="lead-message">“{lead.message}”</p>}
    <div className="property-actions">
      <a className="button button-outline" href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.property ? 'Re: ' + lead.property.title : 'Agencia EH')}`}>Responder por correo</a>
      {lead.phone && <a className="button button-outline" href={`https://wa.me/${waNumber(lead.phone)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      <select value={lead.status} disabled={busy} onChange={e => save({ status: e.target.value })} aria-label="Estado del prospecto">
        {Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
    </div>
    <p className="meta">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>
    <label className="lead-notes">Notas internas (solo tú las ves)
      <textarea rows={2} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => notes !== (lead.notes || '') && save({ notes })} placeholder="Ej. Le llamé el lunes, quiere visitar el sábado" />
    </label>
    {err && <p className="auth-error">{err}</p>}
  </article>;
}

function Leads({ user }: { user: SessionUser }) {
  const [scope, setScope] = useState(user.role === 'AGENCY' || user.role === 'DEVELOPER' ? 'team' : user.role === 'ADMIN' ? 'all' : 'mine');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Lead[] | null>(null); const [error, setError] = useState('');
  const load = useCallback(() => { setItems(null); authJson<Lead[]>(`/leads/mine${scope !== 'mine' ? `?scope=${scope}` : ''}`).then(setItems).catch(e => setError(e.message)); }, [scope]);
  useEffect(() => { load(); }, [load]);
  const shown = (items || []).filter(l => !status || l.status === status);
  const count = (s: string) => (items || []).filter(l => l.status === s).length;
  return <main className="page-wrap">
    <Link href={roleHome[user.role]} className="back-link">← Volver a mi panel</Link>
    <div className="page-heading"><span className="eyebrow">SEGUIMIENTO</span><h1>Prospectos y visitas</h1>
      <p>Mensajes y solicitudes de visita que llegan desde tus propiedades. Cambia el estado conforme avanzas y anota lo importante.</p></div>
    <div className="filterbar admin-filters lead-filters">
      {(user.role === 'AGENCY' || user.role === 'DEVELOPER') && <select value={scope} onChange={e => setScope(e.target.value)}><option value="team">Míos y de mi equipo</option><option value="mine">Solo míos</option></select>}
      {user.role === 'ADMIN' && <select value={scope} onChange={e => setScope(e.target.value)}><option value="all">Todos</option><option value="mine">Solo míos</option></select>}
      <select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos los estados ({items?.length ?? 0})</option>{Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label} ({count(k)})</option>)}</select>
      <button className="button button-outline" onClick={load}>Actualizar</button>
    </div>
    {error && <div className="notice" role="alert">{error}</div>}
    {items === null ? <p className="muted">Cargando…</p> : shown.length === 0
      ? <div className="empty-start">{items.length ? 'No hay prospectos con ese estado.' : 'Aún no tienes prospectos. Cuando alguien te escriba o pida una visita desde una de tus propiedades publicadas, aparecerá aquí y te avisaremos por correo.'}</div>
      : <div className="lead-list">{shown.map(l => <LeadCard key={l.id} lead={l} me={user} onSaved={nl => setItems(list => (list || []).map(x => x.id === nl.id ? nl : x))} />)}</div>}
  </main>;
}

export default function Page() { return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{user => <Leads user={user} />}</ProtectedPanel>; }
