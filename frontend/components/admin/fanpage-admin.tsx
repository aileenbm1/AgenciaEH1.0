"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authJson } from '@/lib/auth';

type Settings = { roles: string[]; requireApproval: boolean };
type Pending = { propertyId: string; title: string; slug: string; by?: string | null; updatedAt: string };
type Template = { id: string; name: string; description?: string | null; isActive: boolean; blocks: unknown[] };
const ROLE_LABEL: Record<string, string> = { AGENT: 'Agentes', AGENCY: 'Agencias', DEVELOPER: 'Desarrolladoras' };

/** Admin: quién puede editar fanpages, si requieren aprobación, cola de aprobación y plantillas. */
export default function FanpageAdmin() {
  const [s, setS] = useState<Settings | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([authJson<Settings>('/admin/fanpages/settings'), authJson<Pending[]>('/admin/fanpages/pending'), authJson<Template[]>('/admin/fanpages/templates')]);
      setS(a); setPending(b); setTemplates(c);
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo cargar.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function run<T>(fn: () => Promise<T>, ok: string, after?: (x: T) => void) {
    setErr(''); setMsg('');
    try { const x = await fn(); after?.(x); setMsg(ok); } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo completar.'); }
  }
  const saveSettings = (next: Settings) => run(() => authJson<Settings>('/admin/fanpages/settings', { method: 'PUT', body: JSON.stringify(next) }), 'Ajustes guardados.', setS);

  return <section id="fanpages" className="admin-section">
    <h2 className="panel-subtitle">Fanpages</h2>
    <p className="muted lead">Cada propiedad publicada tiene una fanpage en <code>/propiedades/…/fanpage</code>. Se diseña por bloques (sin código). Aquí decides quién puede editarlas y si necesitan tu aprobación.</p>
    {err && <div className="notice" role="alert">{err}</div>}
    {msg && <div className="notice ok" role="status">{msg}</div>}
    {s && <div className="dashboard-card">
      <b>Pueden diseñar fanpages:</b>
      <div className="property-actions">{Object.entries(ROLE_LABEL).map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={s.roles.includes(k)} onChange={e => saveSettings({ ...s, roles: e.target.checked ? [...s.roles, k] : s.roles.filter(r => r !== k) })} /> {l}</label>)}</div>
      <label className="check"><input type="checkbox" checked={s.requireApproval} onChange={e => saveSettings({ ...s, requireApproval: e.target.checked })} /> Requieren mi aprobación antes de publicarse</label>
      <small className="muted">El administrador siempre puede editar cualquier fanpage.</small>
    </div>}
    <h3>Por aprobar ({pending.length})</h3>
    {pending.length === 0 ? <p className="muted">No hay fanpages pendientes.</p> : <ul className="doc-list">{pending.map(p => <li key={p.propertyId} className="dashboard-card">
      <b>{p.title}</b> <small className="muted">{p.by ? `por ${p.by} · ` : ''}{new Date(p.updatedAt).toLocaleString('es-MX')}</small>
      <Link className="inline-link" href={`/panel/fanpage/${p.propertyId}`}>Revisar diseño</Link>
      <button className="button button-navy" onClick={() => run(() => authJson<Pending[]>(`/admin/fanpages/review/${p.propertyId}`, { method: 'POST', body: JSON.stringify({ approve: true }) }), 'Fanpage aprobada y publicada.', setPending)}>Aprobar</button>
      <button className="button button-ghost" onClick={() => { const note = prompt('¿Qué cambios necesita? (se envía por correo)') ?? ''; run(() => authJson<Pending[]>(`/admin/fanpages/review/${p.propertyId}`, { method: 'POST', body: JSON.stringify({ approve: false, note }) }), 'Se pidieron cambios.', setPending); }}>Pedir cambios</button>
    </li>)}</ul>}
    <h3>Plantillas</h3>
    <p className="muted">Para crear una plantilla, abre la fanpage de cualquier propiedad, diséñala y usa “Guardar diseño actual como plantilla” en la pestaña Plantillas.</p>
    <ul className="doc-list">{templates.map(t => <li key={t.id} className="dashboard-card">
      <b>{t.name}</b> <small className="muted">{t.description || ''} · {t.blocks.length} bloques</small>
      <label className="check"><input type="checkbox" checked={t.isActive} onChange={e => run(() => authJson<Template[]>(`/admin/fanpages/templates/${t.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: e.target.checked }) }), 'Plantilla actualizada.', setTemplates)} /> Disponible</label>
      <button className="inline-link" onClick={() => { const name = prompt('Nuevo nombre', t.name); if (name) run(() => authJson<Template[]>(`/admin/fanpages/templates/${t.id}`, { method: 'PATCH', body: JSON.stringify({ name }) }), 'Plantilla renombrada.', setTemplates); }}>Renombrar</button>
      <button className="inline-link" onClick={() => confirm(`¿Borrar la plantilla "${t.name}"?`) && run(() => authJson<Template[]>(`/admin/fanpages/templates/${t.id}`, { method: 'DELETE' }), 'Plantilla borrada.', setTemplates)}>Borrar</button>
    </li>)}</ul>
  </section>;
}
