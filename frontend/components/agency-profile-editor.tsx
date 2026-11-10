"use client";
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { authJson } from '@/lib/auth';

type Agency = { name: string; slug: string; description?: string | null; phone?: string | null };

/** La agencia edita su perfil público (/agencias/[slug]). */
export default function AgencyProfileEditor() {
  const [a, setA] = useState<Agency | null>(null);
  const [f, setF] = useState({ name: '', description: '', phone: '' });
  const [busy, setBusy] = useState(false); const [ok, setOk] = useState(''); const [error, setError] = useState('');
  useEffect(() => { authJson<Agency>('/agencies/me').then(x => { setA(x); setF({ name: x.name, description: x.description || '', phone: x.phone || '' }); }).catch(e => setError(e.message)); }, []);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setOk(''); setError('');
    try { setA(await authJson<Agency>('/agencies/me', { method: 'PATCH', body: JSON.stringify(f) })); setOk('Perfil público actualizado.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  }
  return <section id="perfil-agencia" className="admin-section">
    <h2 className="panel-subtitle">Perfil público de la agencia</h2>
    <p className="muted lead">Así te ven los compradores: tu descripción, tu WhatsApp y todas las propiedades publicadas por ti y tus vendedores. {a && <Link className="inline-link" href={`/agencias/${a.slug}`}>Ver mi perfil público →</Link>}</p>
    <form onSubmit={save} className="dashboard-card property-form team-form">
      <div className="form-grid">
        <label>Nombre de la agencia<input required minLength={2} maxLength={140} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label>WhatsApp / teléfono<input type="tel" maxLength={25} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="10 dígitos" /></label>
      </div>
      <label>Descripción<textarea rows={3} maxLength={1000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Quiénes son, zonas donde trabajan, años de experiencia…" /></label>
      {error && <div className="notice" role="alert">{error}</div>}
      {ok && <div className="notice ok" role="status">{ok}</div>}
      <button className="button button-navy" disabled={busy || !a}>{busy ? 'Guardando…' : 'Guardar perfil'}</button>
    </form>
  </section>;
}
