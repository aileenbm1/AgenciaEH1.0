"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPanel from '@/components/protected-panel';
import { authJson, roleHome, SessionUser } from '@/lib/auth';
import { AVAILABILITY, PROPERTY_STATUS } from '@/lib/roles';
import { mxn } from '@/lib/data';
import { OPERATION_LABEL } from '@/lib/properties';
import PropertyForm, { EditableProperty } from '@/components/property-form';
import RentalSettings from '@/components/rental-settings';

type Property = EditableProperty & { slug: string; availability: keyof typeof AVAILABILITY };

function MyProperties({ user }: { user: SessionUser }) {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');
  const [reserving, setReserving] = useState('');
  // null = sin formulario; 'new' = nueva; o la propiedad que se edita.
  const [editing, setEditing] = useState<Property | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await authJson<Property[]>('/properties/mine')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar tus propiedades.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); if (window.location.hash === '#nueva') setEditing('new'); }, [load]);
  const open = (p: Property | 'new') => { setOk(''); setError(''); setEditing(p); setTimeout(() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' }), 50); };

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

  async function setAvailability(p: Property, availability: string) {
    setBusy(p.id); setError(''); setOk('');
    try {
      await authJson(`/properties/${p.id}/availability`, { method: 'PATCH', body: JSON.stringify({ availability }) });
      setOk(`"${p.title}" ahora está: ${AVAILABILITY[availability as keyof typeof AVAILABILITY].label}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cambiar la disponibilidad.'); }
    finally { setBusy(''); }
  }

  return <main className="page-wrap">
    <Link href={roleHome[user.role]} className="back-link">← Volver a mi panel</Link>
    <div className="page-heading panel-heading">
      <div><span className="eyebrow">GESTIÓN INMOBILIARIA</span><h1>Mis propiedades</h1>
        <p>Crea un borrador → envíalo a revisión → cuando el administrador lo apruebe, aparece en el catálogo. Después controla si está disponible, apartada, rentada o vendida.</p></div>
      {!editing && <button className="button button-gold" onClick={() => open('new')}>+ Nueva propiedad</button>}
    </div>

    <div className="status-legend">{['DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED'].map(s =>
      <span key={s}><i className={`status-pill ${PROPERTY_STATUS[s].tone}`}>{PROPERTY_STATUS[s].label}</i>{PROPERTY_STATUS[s].help}</span>)}
    </div>

    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    {editing && <section id="formulario" className="dashboard-card form-card">
      <div className="section-heading"><h2>{editing === 'new' ? 'Nueva propiedad' : `Editar · ${editing.title}`}</h2><button type="button" className="inline-link" onClick={() => setEditing(null)}>Cancelar</button></div>
      <p className="muted lead">{editing === 'new' ? <>Se guardará como <b>borrador</b>. Nadie más la verá hasta que la envíes a revisión y sea aprobada.</> : <>Al guardar, la propiedad vuelve a <b>borrador</b> y tendrás que enviarla de nuevo a revisión.</>}</p>
      <PropertyForm key={editing === 'new' ? 'new' : editing.id} property={editing === 'new' ? undefined : editing}
        onCancel={() => setEditing(null)} onDone={async msg => { setEditing(null); setOk(msg); await load(); }} />
    </section>}

    <section>
      <div className="section-heading"><h2>Publicaciones registradas</h2><button className="button button-outline" onClick={load} disabled={loading}>Actualizar</button></div>
      {loading ? <p className="muted">Cargando propiedades…</p> : items.length === 0
        ? <div className="empty-start">Aún no tienes propiedades. <button className="inline-link" onClick={() => open('new')}>Crea la primera</button>.</div>
        : <div className="property-management-list">{items.map(p => {
          const st = PROPERTY_STATUS[p.status] || { label: p.status, help: '', tone: 'neutral' as const };
          const av = AVAILABILITY[p.availability] || AVAILABILITY.AVAILABLE;
          const options = (Object.keys(AVAILABILITY) as (keyof typeof AVAILABILITY)[]).filter(k => !(k === 'RENTED' && p.operation === 'SALE') && !(k === 'SOLD' && p.operation === 'RENT'));
          return <article className="dashboard-card property-management-card" key={p.id}>
            {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : <div className="img-missing">Sin fotos</div>}
            <div>
              <i className={`status-pill ${st.tone}`}>{st.label}</i>{p.status === 'PUBLISHED' && <> <i className={`status-pill ${av.tone}`}>{av.label}</i></>}
              <h3>{p.title}</h3>
              <p className="meta">{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality} · {OPERATION_LABEL[p.operation]} · {p.images.length} foto(s)</p>
              <strong>{mxn(Number(p.price))}{p.operation === 'RENT' ? ' / mes' : ''}{p.operation === 'BOTH' && p.rentPrice ? ` · renta ${mxn(Number(p.rentPrice))} / mes` : ''}</strong>
              <p className="meta next-step">{p.status === 'PUBLISHED' ? av.help : st.help}</p>
              <div className="property-actions">
                {(p.status === 'DRAFT' || p.status === 'REJECTED') && <button className="button button-navy" disabled={busy === p.id} onClick={() => action(p, 'submit')}>{p.status === 'REJECTED' ? 'Reenviar a revisión' : 'Enviar a revisión'}</button>}
                {p.status === 'PUBLISHED' && <label className="availability-pick">Disponibilidad
                  <select value={p.availability} disabled={busy === p.id} onChange={e => setAvailability(p, e.target.value)}>{options.map(k => <option key={k} value={k}>{AVAILABILITY[k].label}</option>)}</select></label>}
                <button className="button button-outline" disabled={busy === p.id} onClick={() => open(p)}>Editar</button>
                <button className="button button-outline" aria-expanded={reserving === p.id} onClick={() => setReserving(reserving === p.id ? '' : p.id)}>{p.operation === 'SALE' ? 'Apartado en línea' : 'Reservas y calendario'}</button>
                <Link className="button button-outline" href={`/panel/fanpage/${p.id}`}>Fanpage</Link>
                {p.status === 'PUBLISHED' && <Link className="button button-outline" href={`/propiedades/${p.slug}`}>Ver publicación</Link>}
                <button className="button button-ghost" disabled={busy === p.id} onClick={() => action(p, 'delete')}>Eliminar</button>
              </div>
              {reserving === p.id && <div className="reserve-config"><RentalSettings propertyId={p.id} operation={p.operation} /></div>}
            </div>
          </article>;
        })}</div>}
    </section>
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <MyProperties user={user} />}</ProtectedPanel>;
}
