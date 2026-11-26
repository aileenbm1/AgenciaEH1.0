"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Eye } from 'lucide-react';
import { authJson } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { mxn } from '@/lib/data';
import Modal from './modal';
import { refreshPending } from './use-pending';

type ReviewItem = { priceMode?: string;
  id: string; title: string; description: string; municipality: string; neighborhood?: string | null;
  price: number | string; operation: 'SALE' | 'RENT' | 'BOTH'; propertyType: string; bedrooms?: number | null; bathrooms?: number | null;
  builtArea?: number | string | null; updatedAt: string; images: { url: string }[];
  owner?: { fullName: string; email: string; role: keyof typeof ROLES };
};
const REASONS = ['Faltan fotos o se ven mal', 'El precio no coincide', 'Datos incompletos (m², baños, ubicación)', 'La descripción tiene errores', 'Otro'];

/** Propiedades esperando revisión: aprobar o rechazar con motivo (el anunciante lo recibe por correo). */
export default function ModerationQueue({ limit, title = 'Propiedades por revisar', showAllLink = false }: { limit?: number; title?: string; showAllLink?: boolean }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(''); const [done, setDone] = useState('');
  const [open, setOpen] = useState('');
  const [rejecting, setRejecting] = useState<ReviewItem | null>(null);
  const [reasons, setReasons] = useState<string[]>([]); const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await authJson<ReviewItem[]>('/properties/review')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la lista de revisión.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(p: ReviewItem, status: 'PUBLISHED' | 'REJECTED', why = '') {
    setBusy(p.id); setError(''); setDone('');
    try {
      await authJson(`/properties/${p.id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status, note: why || undefined }) });
      setItems(list => list.filter(x => x.id !== p.id));
      setDone(status === 'PUBLISHED' ? `“${p.title}” ya está publicada en el catálogo.` : `“${p.title}” regresó a ${p.owner?.fullName || 'el anunciante'} con el motivo para corregirla.`);
      setRejecting(null); refreshPending();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(''); }
  }
  const startReject = (p: ReviewItem) => { setRejecting(p); setReasons([]); setNote(''); };
  const why = [...reasons.filter(r => r !== 'Otro'), note.trim()].filter(Boolean).join('. ');
  const shown = limit ? items.slice(0, limit) : items;

  return <section className="adm-sec">
    <div className="adm-sec-h"><h2>{title} {!loading && <em className="count">{items.length}</em>}</h2>
      {showAllLink && items.length > 0 && <Link className="adm-more" href="/panel/admin/propiedades">Ver todas →</Link>}</div>
    {error && <div className="notice" role="alert">{error}</div>}
    {done && <div className="notice ok" role="status">{done}</div>}
    {loading ? <p className="muted">Cargando…</p> : items.length === 0
      ? <div className="adm-empty">✓ No hay propiedades esperando revisión. Cuando un agente, agencia o desarrolladora envíe una, aparecerá aquí.</div>
      : <div className="adm-card">{shown.map(p => <article key={p.id} className="adm-rev">
        {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : <div className="img-missing">Sin fotos</div>}
        <div className="adm-rev-info">
          <b className="adm-rev-title">{p.title}</b>
          <small>{p.propertyType} · {p.operation === 'SALE' ? 'Venta' : p.operation === 'RENT' ? 'Renta' : 'Venta y renta'} · {p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality}</small>
          <span className="adm-rev-price">{Number(p.price) > 0 ? `${p.priceMode === 'FROM' ? 'Desde ' : ''}${mxn(Number(p.price))}${p.operation === 'RENT' ? ' / mes' : ''}` : ''}{p.priceMode === 'HIDE' ? ' · Precio a consultar (no se publica)' : ''}</span>
          {p.owner && <small>Enviada por <b>{p.owner.fullName}</b> ({ROLES[p.owner.role]?.label || p.owner.role})</small>}
          {open === p.id && <div className="adm-rev-more">
            <small>{p.bedrooms ?? 0} rec · {p.bathrooms ?? 0} baños{p.builtArea ? ` · ${Number(p.builtArea)} m²` : ''} · {p.images.length} foto(s){p.owner ? ` · ${p.owner.email}` : ''}</small>
            <p>{p.description}</p>
            {p.images.length > 1 && <div className="adm-rev-photos">{p.images.map((im, i) => <a key={im.url + i} href={im.url} target="_blank" rel="noopener noreferrer"><img src={im.url} alt={`Foto ${i + 1}`} /></a>)}</div>}
          </div>}
        </div>
        <div className="adm-rev-acts">
          <button type="button" className="button button-navy" disabled={busy === p.id} onClick={() => decide(p, 'PUBLISHED')}><Check size={16} aria-hidden /> Aprobar y publicar</button>
          <button type="button" className="button button-outline" onClick={() => setOpen(open === p.id ? '' : p.id)}><Eye size={16} aria-hidden /> {open === p.id ? 'Ocultar' : 'Ver detalles'}</button>
          <button type="button" className="button adm-danger" disabled={busy === p.id} onClick={() => startReject(p)}>Rechazar</button>
        </div>
      </article>)}</div>}

    {rejecting && <Modal title={`Rechazar “${rejecting.title}”`} onClose={() => setRejecting(null)}>
      <p className="muted">{rejecting.owner?.fullName || 'El anunciante'} recibirá este motivo por correo y en su panel, para corregir la propiedad y volver a enviarla.</p>
      <div className="adm-reasons">{REASONS.map(r => { const on = reasons.includes(r); return <label key={r} className={on ? 'on' : ''}>
        <input type="checkbox" checked={on} onChange={() => setReasons(on ? reasons.filter(x => x !== r) : [...reasons, r])} /> {r}</label>; })}</div>
      <label className="adm-field">Detalle (opcional)<textarea rows={3} maxLength={400} value={note} onChange={e => setNote(e.target.value)} placeholder="Ej. Sube por lo menos 5 fotos reales: fachada, interior y baños." /></label>
      <div className="adm-modal-acts">
        <button type="button" className="button button-outline" onClick={() => setRejecting(null)}>Cancelar</button>
        <button type="button" className="button adm-danger" disabled={!why || busy === rejecting.id} onClick={() => decide(rejecting, 'REJECTED', why)}>{busy === rejecting.id ? 'Enviando…' : 'Rechazar y avisar'}</button>
      </div>
      {!why && <small className="muted">Elige al menos un motivo o escribe el detalle.</small>}
    </Modal>}
  </section>;
}
