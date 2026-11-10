"use client";
import { FormEvent, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';
import { CATEGORIES, categoryFor, MUNICIPALITIES, PROPERTY_TYPES } from '@/lib/roles';
import { CustomField } from '@/lib/properties';
import PhotoUploader, { Photo } from './photo-uploader';

export type EditableProperty = {
  id: string; title: string; description?: string | null; operation: 'RENT' | 'SALE' | 'BOTH'; price: number | string; rentPrice?: number | string | null;
  category?: string | null; municipality: string; neighborhood?: string | null; propertyType: string; bedrooms?: number | null; bathrooms?: number | null;
  landArea?: number | string | null; builtArea?: number | string | null; availableFrom?: string | null; status: string;
  images: { url: string; label?: string | null }[]; custom?: Record<string, string>;
};

const blank = { title: '', description: '', operation: 'SALE', price: '', rentPrice: '', category: '', municipality: 'León', neighborhood: '', propertyType: 'Casa', bedrooms: '3', bathrooms: '2', landArea: '', builtArea: '', availableFrom: '' };
const toForm = (p: EditableProperty) => ({
  title: p.title, description: p.description || '', operation: p.operation, price: String(p.price ?? ''), rentPrice: p.rentPrice ? String(p.rentPrice) : '',
  category: p.category || '', municipality: p.municipality, neighborhood: p.neighborhood || '', propertyType: p.propertyType,
  bedrooms: p.bedrooms != null ? String(p.bedrooms) : '', bathrooms: p.bathrooms != null ? String(p.bathrooms) : '',
  landArea: p.landArea ? String(Number(p.landArea)) : '', builtArea: p.builtArea ? String(Number(p.builtArea)) : '', availableFrom: p.availableFrom || '',
});

/** Crear o editar una propiedad: datos, venta y/o renta, categoría, campos personalizados y fotos con etiqueta. */
export default function PropertyForm({ property, onDone, onCancel }: { property?: EditableProperty; onDone: (msg: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState(property ? toForm(property) : blank);
  const [photos, setPhotos] = useState<Photo[]>(property ? property.images.map(i => ({ url: i.url, label: i.label || '' })) : []);
  const [custom, setCustom] = useState<Record<string, string>>(property?.custom || {});
  const [fields, setFields] = useState<CustomField[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { fetch('/api/v1/custom-fields').then(r => r.ok ? r.json() : []).then(setFields).catch(() => {}); }, []);
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value }));
  const isRent = form.operation === 'RENT', both = form.operation === 'BOTH';
  const editingPublished = property?.status === 'PUBLISHED';

  async function save(e: FormEvent) {
    e.preventDefault(); setError('');
    if (editingPublished && !confirm('Al guardar, la propiedad sale del catálogo y vuelve a revisión hasta que el administrador la apruebe. ¿Continuar?')) return;
    setBusy(true);
    const num = (v: string) => v === '' ? undefined : Number(v);
    const payload = {
      title: form.title, description: form.description, operation: form.operation, price: Number(form.price),
      rentPrice: both ? num(form.rentPrice) : undefined, category: form.category || categoryFor(form.propertyType),
      municipality: form.municipality, neighborhood: form.neighborhood, propertyType: form.propertyType,
      bedrooms: num(form.bedrooms), bathrooms: num(form.bathrooms), landArea: num(form.landArea), builtArea: num(form.builtArea),
      availableFrom: (isRent || both) && form.availableFrom ? form.availableFrom : undefined,
      images: photos.map(p => p.url), imageLabels: photos.map(p => p.label || ''), custom,
    };
    try {
      await authJson(property ? `/properties/${property.id}` : '/properties', { method: property ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      onDone(property ? `Cambios guardados en "${form.title}". Quedó como borrador: envíala a revisión cuando esté lista.` : 'Borrador guardado. Cuando esté listo, presiona "Enviar a revisión" para que un administrador lo apruebe.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="property-form">
    <label>Título<input required minLength={8} maxLength={180} value={form.title} onChange={set('title')} placeholder="Casa con jardín en zona norte" /></label>
    <label>Descripción<textarea required minLength={30} rows={4} value={form.description} onChange={set('description')} placeholder="Describe el inmueble, su estado y principales ventajas (mínimo 30 caracteres)." /></label>
    <div className="form-grid">
      <label>Operación<select value={form.operation} onChange={set('operation')}><option value="SALE">Venta</option><option value="RENT">Renta</option><option value="BOTH">Venta y renta</option></select></label>
      <label>{isRent ? 'Renta mensual (MXN)' : 'Precio de venta (MXN)'}<input required type="number" min="1" value={form.price} onChange={set('price')} /></label>
      {both && <label>Renta mensual (MXN)<input required type="number" min="1" value={form.rentPrice} onChange={set('rentPrice')} /></label>}
      {(isRent || both) && <label>Disponible a partir de<input type="date" value={form.availableFrom} onChange={set('availableFrom')} /></label>}
      <label>Tipo de inmueble<select value={form.propertyType} onChange={set('propertyType')}>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
      <label>Categoría<select value={form.category || categoryFor(form.propertyType)} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Municipio<select value={form.municipality} onChange={set('municipality')}>{MUNICIPALITIES.map(m => <option key={m}>{m}</option>)}</select></label>
      <label>Colonia<input value={form.neighborhood} onChange={set('neighborhood')} /></label>
      <label>Recámaras<input type="number" min="0" max="30" value={form.bedrooms} onChange={set('bedrooms')} /></label>
      <label>Baños<input type="number" min="0" max="30" value={form.bathrooms} onChange={set('bathrooms')} /></label>
      <label>Terreno m²<input type="number" min="0" value={form.landArea} onChange={set('landArea')} /></label>
      <label>Construcción m²<input type="number" min="0" value={form.builtArea} onChange={set('builtArea')} /></label>
      {fields.map(f => <label key={f.id}>{f.label}{f.required ? ' *' : ''}
        {f.type === 'SELECT' ? <select value={custom[f.key] || ''} onChange={e => setCustom(c => ({ ...c, [f.key]: e.target.value }))}><option value="">—</option>{f.options.map(o => <option key={o}>{o}</option>)}</select>
          : f.type === 'BOOLEAN' ? <select value={custom[f.key] || ''} onChange={e => setCustom(c => ({ ...c, [f.key]: e.target.value }))}><option value="">—</option><option value="1">Sí</option><option value="0">No</option></select>
          : <input type={f.type === 'NUMBER' ? 'number' : 'text'} maxLength={500} value={custom[f.key] || ''} onChange={e => setCustom(c => ({ ...c, [f.key]: e.target.value }))} />}
      </label>)}
    </div>
    <PhotoUploader value={photos} onChange={setPhotos} onBusyChange={setUploading} />
    <small className="muted">Para enviar a revisión se necesitan: superficie, al menos una foto{fields.some(f => f.required) ? ' y los campos marcados con *' : ''}. Etiqueta una foto como <b>Plano</b> para mostrarla en la sección "Plano de planta".</small>
    {error && <div className="notice" role="alert">{error}</div>}
    <div className="property-actions">
      <button className="button button-navy" disabled={busy || uploading}>{busy ? 'Guardando…' : uploading ? 'Esperando fotos…' : property ? 'Guardar cambios' : 'Guardar borrador'}</button>
      <button type="button" className="button button-ghost" onClick={onCancel}>Cancelar</button>
    </div>
  </form>;
}
