"use client";
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { authJson, uploadImage } from '@/lib/auth';

type Me = { slug: string; bio?: string | null; phone?: string | null; photoUrl?: string | null; agency: { name: string; slug: string } | null };

/** El agente edita su perfil público (/asesores/[slug]). */
export default function AgentProfileEditor() {
  const [me, setMe] = useState<Me | null>(null);
  const [f, setF] = useState({ bio: '', phone: '', photoUrl: '' });
  const [busy, setBusy] = useState(false); const [ok, setOk] = useState(''); const [error, setError] = useState('');
  useEffect(() => { authJson<Me>('/agents/me').then(x => { setMe(x); setF({ bio: x.bio || '', phone: x.phone || '', photoUrl: x.photoUrl || '' }); }).catch(e => setError(e.message)); }, []);
  async function photo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setError('');
    try { setF(v => ({ ...v, photoUrl: '' })); const url = await uploadImage(file, file.name); setF(v => ({ ...v, photoUrl: url })); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo subir la foto.'); } finally { setBusy(false); }
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setOk(''); setError('');
    try { setMe(await authJson<Me>('/agents/me', { method: 'PATCH', body: JSON.stringify(f) })); setOk('Perfil público actualizado.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  }
  return <section id="perfil-asesor" className="admin-section">
    <h2 className="panel-subtitle">Mi perfil público de asesor</h2>
    <p className="muted lead">Aparece en tus propiedades (“Ver perfil del asesor”) y puedes compartirlo. {me && <Link className="inline-link" href={`/asesores/${me.slug}`}>Ver mi perfil público →</Link>}</p>
    <form onSubmit={save} className="dashboard-card property-form team-form">
      <div className="agent-editor">
        {f.photoUrl ? <img className="agent-photo small" src={f.photoUrl} alt="Tu foto" /> : <span className="agent-photo small initials">Foto</span>}
        <label>Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" onChange={photo} disabled={busy} /></label>
        {f.photoUrl && <button type="button" className="inline-link" onClick={() => setF({ ...f, photoUrl: '' })}>Quitar foto</button>}
      </div>
      <label>WhatsApp / teléfono público<input type="tel" maxLength={25} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="10 dígitos (si lo dejas vacío se usa el de tu cuenta)" /></label>
      <label>Sobre mí<textarea rows={3} maxLength={1000} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} placeholder="Experiencia, zonas donde trabajas, especialidad…" /></label>
      {me?.agency && <p className="muted">Formas parte de <Link className="inline-link" href={`/agencias/${me.agency.slug}`}>{me.agency.name}</Link>.</p>}
      {error && <div className="notice" role="alert">{error}</div>}
      {ok && <div className="notice ok" role="status">{ok}</div>}
      <button className="button button-navy" disabled={busy || !me}>{busy ? 'Guardando…' : 'Guardar perfil'}</button>
    </form>
  </section>;
}
