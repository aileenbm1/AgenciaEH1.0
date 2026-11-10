"use client";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPanel from '@/components/protected-panel';
import { authJson, roleHome, SessionUser } from '@/lib/auth';
import { MUNICIPALITIES, PROPERTY_STATUS, PROPERTY_TYPES } from '@/lib/roles';
import { mxn } from '@/lib/data';
import PhotoUploader from '@/components/photo-uploader';

type Property = { id: string; slug: string; title: string; municipality: string; neighborhood?: string | null; price: string | number; operation: 'SALE' | 'RENT'; status: string; images: { url: string }[] };
const EMPTY = { title: '', description: '', operation: 'SALE', price: '', municipality: 'León', neighborhood: '', propertyType: 'Casa', bedrooms: '3', bathrooms: '2', landArea: '', builtArea: '' };

function MyProperties({ user }: { user: SessionUser }) {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // Edición de fotos de una propiedad existente (borrador, en revisión o rechazada).
  const [editing, setEditing] = useState<Property | null>(null);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await authJson<Property[]>('/properties/mine')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar tus propiedades.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); if (window.location.hash === '#nueva') setShowForm(true); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy('create'); setError(''); setOk('');
    try {
      const payload = { ...form, price: Number(form.price), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        landArea: form.landArea ? Number(form.landArea) : undefined, builtArea: form.builtArea ? Number(form.builtArea) : undefined,
        images: photos };
      await authJson('/properties', { method: 'POST', body: JSON.stringify(payload) });
      setForm(EMPTY); setPhotos([]); setShowForm(false);
      setOk('Borrador guardado. Cuando esté listo, presiona "Enviar a revisión" para que un administrador lo apruebe.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(''); }
  }

  async function savePhotos() {
    if (!editing) return;
    setBusy(editing.id); setError(''); setOk('');
    try {
      await authJson(`/properties/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ images: editPhotos }) });
      setOk(`Fotos de "${editing.title}" actualizadas. Quedó como borrador: envíala a revisión cuando esté lista.`);
      setEditing(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron guardar las fotos.'); }
    finally { setBusy(''); }
  }

  async function action(p: Property, kind: 'submit' | 'delete') {
    if (kind === 'delete' && !confirm(`¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`)) return;
    setBusy(p.id); setError(''); setOk('');
    try {
      await authJson(`/properties/${p.id}${kind === 'submit' ? '/submit' : ''}`, { method: kind === 'submit' ? 'POST' : 'DELETE' });
      setOk(kind === 'submit' ? `"${p.title}" se envió a revisión. Te avisaremos cuando sea aprobada.` : 'Propiedad eliminada.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(''); }
  }

  return <main className="page-wrap">
    <Link href={roleHome[user.role]} className="back-link">← Volver a mi panel</Link>
    <div className="page-heading panel-heading">
      <div><span className="eyebrow">GESTIÓN INMOBILIARIA</span><h1>Mis propiedades</h1>
        <p>Crea un borrador → envíalo a revisión → cuando el administrador lo apruebe, aparece en el catálogo.</p></div>
      {!showForm && <button className="button button-gold" onClick={() => setShowForm(true)}>+ Nueva propiedad</button>}
    </div>

    <div className="status-legend">{['DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED'].map(s =>
      <span key={s}><i className={`status-pill ${PROPERTY_STATUS[s].tone}`}>{PROPERTY_STATUS[s].label}</i>{PROPERTY_STATUS[s].help}</span>)}
    </div>

    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    {showForm && <section id="nueva" className="dashboard-card form-card">
      <div className="section-heading"><h2>Nueva propiedad</h2><button type="button" className="inline-link" onClick={() => setShowForm(false)}>Cancelar</button></div>
      <p className="muted lead">Se guardará como <b>borrador</b>. Nadie más la verá hasta que la envíes a revisión y sea aprobada.</p>
      <form onSubmit={create} className="property-form">
        <label>Título<input required minLength={8} value={form.title} onChange={set('title')} placeholder="Casa con jardín en zona norte" /></label>
        <label>Descripción<textarea required minLength={30} rows={4} value={form.description} onChange={set('description')} placeholder="Describe el inmueble, su estado y principales ventajas (mínimo 30 caracteres)." /></label>
        <div className="form-grid">
          <label>Operación<select value={form.operation} onChange={set('operation')}><option value="SALE">Venta</option><option value="RENT">Renta</option></select></label>
          <label>Precio (MXN){form.operation === 'RENT' ? ' mensual' : ''}<input required type="number" min="1" value={form.price} onChange={set('price')} /></label>
          <label>Tipo de inmueble<select value={form.propertyType} onChange={set('propertyType')}>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Municipio<select value={form.municipality} onChange={set('municipality')}>{MUNICIPALITIES.map(m => <option key={m}>{m}</option>)}</select></label>
          <label>Colonia<input value={form.neighborhood} onChange={set('neighborhood')} /></label>
          <label>Recámaras<input type="number" min="0" value={form.bedrooms} onChange={set('bedrooms')} /></label>
          <label>Baños<input type="number" min="0" value={form.bathrooms} onChange={set('bathrooms')} /></label>
          <label>Terreno m²<input type="number" min="0" value={form.landArea} onChange={set('landArea')} /></label>
          <label>Construcción m²<input type="number" min="0" value={form.builtArea} onChange={set('builtArea')} /></label>
        </div>
        <PhotoUploader value={photos} onChange={setPhotos} onBusyChange={setUploading} />
        <button className="button button-navy" disabled={busy === 'create' || uploading}>{busy === 'create' ? 'Guardando…' : uploading ? 'Esperando fotos…' : 'Guardar borrador'}</button>
      </form>
    </section>}

    {editing && <section className="dashboard-card form-card" id="fotos">
      <div className="section-heading"><h2>Fotos · {editing.title}</h2><button type="button" className="inline-link" onClick={() => setEditing(null)}>Cancelar</button></div>
      <p className="muted lead">Al guardar, la propiedad vuelve a <b>borrador</b> y tendrás que enviarla de nuevo a revisión.</p>
      <PhotoUploader value={editPhotos} onChange={setEditPhotos} onBusyChange={setUploading} />
      <button className="button button-navy" disabled={busy === editing.id || uploading} onClick={savePhotos}>{busy === editing.id ? 'Guardando…' : uploading ? 'Esperando fotos…' : 'Guardar fotos'}</button>
    </section>}

    <section>
      <div className="section-heading"><h2>Publicaciones registradas</h2><button className="button button-outline" onClick={load} disabled={loading}>Actualizar</button></div>
      {loading ? <p className="muted">Cargando propiedades…</p> : items.length === 0
        ? <div className="empty-start">Aún no tienes propiedades. <button className="inline-link" onClick={() => setShowForm(true)}>Crea la primera</button>.</div>
        : <div className="property-management-list">{items.map(p => {
          const st = PROPERTY_STATUS[p.status] || { label: p.status, help: '', tone: 'neutral' as const };
          return <article className="dashboard-card property-management-card" key={p.id}>
            {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : <div className="img-missing">Sin fotos</div>}
            <div>
              <i className={`status-pill ${st.tone}`}>{st.label}</i>
              <h3>{p.title}</h3>
              <p className="meta">{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality} · {p.operation === 'SALE' ? 'Venta' : 'Renta'}</p>
              <strong>{mxn(Number(p.price))}</strong>
              <p className="meta next-step">{st.help}</p>
              <div className="property-actions">
                {(p.status === 'DRAFT' || p.status === 'REJECTED') && <button className="button button-navy" disabled={busy === p.id} onClick={() => action(p, 'submit')}>{p.status === 'REJECTED' ? 'Reenviar a revisión' : 'Enviar a revisión'}</button>}
                {p.status !== 'PUBLISHED' && <button className="button button-outline" disabled={busy === p.id} onClick={() => { setEditing(p); setEditPhotos(p.images.map(i => i.url)); }}>Fotos</button>}
                {p.status === 'PUBLISHED' && <Link className="button button-outline" href={`/propiedades/${p.slug}`}>Ver publicación</Link>}
                <button className="button button-ghost" disabled={busy === p.id} onClick={() => action(p, 'delete')}>Eliminar</button>
              </div>
            </div>
          </article>;
        })}</div>}
    </section>
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <MyProperties user={user} />}</ProtectedPanel>;
}
