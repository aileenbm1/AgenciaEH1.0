"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Ellipsis, Eye, ImagePlus, LayoutTemplate, Pencil, Plus, Send, Share2, ToggleLeft, Trash2 } from 'lucide-react';
import AdminShell from '@/components/admin/admin-shell';
import Modal from '@/components/admin/modal';
import PublisherShell from '@/components/publisher/publisher-shell';
import { refreshPublisherPending } from '@/components/publisher/use-publisher-pending';
import ProtectedPanel from '@/components/protected-panel';
import { authJson, SessionUser } from '@/lib/auth';
import { AVAILABILITY, PROPERTY_STATUS } from '@/lib/roles';
import { mxn } from '@/lib/data';
import { OPERATION_LABEL } from '@/lib/properties';
import PropertyForm, { EditableProperty } from '@/components/property-form';
import RentalSettings from '@/components/rental-settings';
import { missingFor } from '@/lib/publisher';

type Property = EditableProperty & { reviewNote?: string | null; slug: string; availability: keyof typeof AVAILABILITY; owner?: { fullName: string; role: string } | null };
type Confirm = { kind: 'delete'; p: Property } | { kind: 'availability'; p: Property; value: keyof typeof AVAILABILITY };
const STATUS_TABS: [string, string][] = [['', 'Todas'], ['PUBLISHED', 'Publicadas'], ['DRAFT', 'Borradores'], ['REJECTED', 'Requieren cambios'], ['REVIEW', 'En revisión']];

function MyProperties({ user }: { user: SessionUser }) {
  const admin = user.role === 'ADMIN';
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');
  const [reserving, setReserving] = useState('');
  const [tab, setTab] = useState('');
  const [menu, setMenu] = useState('');
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  // null = sin formulario; 'new' = nueva; o la propiedad que se edita.
  const [editing, setEditing] = useState<Property | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await authJson<Property[]>('/properties/mine')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar tus propiedades.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); if (window.location.hash === '#nueva') setEditing('new'); }, [load]);
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(''); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [menu]);
  const open = (p: Property | 'new') => { setMenu(''); setOk(''); setError(''); setEditing(p); setTimeout(() => document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth' }), 50); };
  const done = async (msg: string) => { setOk(msg); await load(); refreshPublisherPending(); };

  async function submit(p: Property) {
    setMenu(''); setBusy(p.id); setError(''); setOk('');
    try { await authJson(`/properties/${p.id}/submit`, { method: 'POST' }); await done(admin ? `“${p.title}” ya está publicada en el catálogo.` : `“${p.title}” se envió a revisión. Te avisaremos cuando sea aprobada.`); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar.'); }
    finally { setBusy(''); }
  }
  async function confirmIt() {
    if (!confirm) return; const p = confirm.p;
    setBusy(p.id); setError(''); setOk('');
    try {
      if (confirm.kind === 'delete') { await authJson(`/properties/${p.id}`, { method: 'DELETE' }); await done(`“${p.title}” se eliminó.`); }
      else { await authJson(`/properties/${p.id}/availability`, { method: 'PATCH', body: JSON.stringify({ availability: confirm.value }) }); await done(`“${p.title}” ahora está: ${AVAILABILITY[confirm.value].label}.`); }
      setConfirm(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(''); }
  }
  async function share(p: Property) {
    setMenu(''); const url = `${location.origin}/propiedades/${p.slug}`;
    try { if (navigator.share) await navigator.share({ title: p.title, url }); else { await navigator.clipboard.writeText(url); setOk('Enlace copiado. Pégalo en WhatsApp o en tus redes.'); } } catch { /* cancelado */ }
  }

  const count = (s: string) => (s ? items.filter(p => p.status === s).length : items.length);
  const shown = tab ? items.filter(p => p.status === tab) : items;

  return <main className="page-wrap pub-props">
    <div className="adm-top"><div><h1>{admin ? 'Todas las propiedades' : 'Mis propiedades'}</h1>
      <p className="adm-date">{admin ? 'Agrega propiedades a nombre de cualquier agencia, desarrolladora o agente y publícalas directamente. También puedes editar o eliminar las de todos.' : 'Borrador → En revisión → Publicada. Si el administrador pide cambios, aquí verás qué corregir.'}</p></div>
      {!editing && <div className="adm-top-acts"><button className="button button-navy" onClick={() => open('new')}><Plus size={16} aria-hidden /> Nueva propiedad</button></div>}
    </div>

    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    {editing && <section id="formulario" className="dashboard-card form-card">
      <div className="section-heading"><h2>{editing === 'new' ? 'Nueva propiedad' : `Editar · ${editing.title}`}</h2><span className="adm-top-acts">{editing !== 'new' && <a className="button button-outline" href={`/vista-previa/propiedad/${editing.id}`} target="_blank" rel="opener" title="Guarda tus cambios y ábrela para ver cómo queda"><Eye size={15} aria-hidden /> Vista previa ↗</a>}<button type="button" className="inline-link" onClick={() => setEditing(null)}>Cancelar</button></span></div>
      <p className="muted lead">{admin ? (editing === 'new' ? <>Se guarda como <b>borrador</b>; después presiona “Publicar”.</> : <>Como administrador, tus cambios no sacan la propiedad del catálogo.</>) : editing === 'new' ? <>Se guardará como <b>borrador</b>. Nadie más la verá hasta que la envíes a revisión y sea aprobada.</> : <>Al guardar, la propiedad vuelve a <b>borrador</b> y tendrás que enviarla de nuevo a revisión.</>}</p>
      <PropertyForm admin={admin} key={editing === 'new' ? 'new' : editing.id} property={editing === 'new' ? undefined : editing}
        onCancel={() => setEditing(null)} onDone={async msg => { setEditing(null); await done(msg); }} />
    </section>}

    {!loading && items.length > 0 && <div className="adm-chips">{STATUS_TABS.map(([k, l]) => (k === '' || count(k) > 0) && <button key={k} type="button" className={`adm-chip${tab === k ? ' on' : ''}`} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}<i>{count(k)}</i></button>)}</div>}

    {loading ? <p className="muted">Cargando propiedades…</p> : items.length === 0
      ? <div className="adm-empty">Aún no tienes propiedades. <button className="inline-link" onClick={() => open('new')}>Crea la primera</button>: tarda unos minutos.</div>
      : <div className="adm-card pub-list">{shown.map(p => {
        const st = PROPERTY_STATUS[p.status] || { label: p.status, help: '', tone: 'neutral' as const };
        const av = AVAILABILITY[p.availability] || AVAILABILITY.AVAILABLE;
        const missing = missingFor(p);
        const editable = p.status !== 'REVIEW' || admin;
        const primary = admin && (p.status === 'DRAFT' || p.status === 'REVIEW' || p.status === 'REJECTED')
          ? <button className="button button-navy" disabled={busy === p.id} onClick={() => submit(p)}><Send size={15} aria-hidden /> Publicar</button>
          : p.status === 'DRAFT' ? (missing.length ? <button className="button button-navy" onClick={() => open(p)}><ImagePlus size={15} aria-hidden /> Completar</button> : <button className="button button-navy" disabled={busy === p.id} onClick={() => submit(p)}><Send size={15} aria-hidden /> Enviar a revisión</button>)
          : p.status === 'REJECTED' ? <button className="button button-navy" onClick={() => open(p)}><Pencil size={15} aria-hidden /> Corregir</button>
          : p.status === 'PUBLISHED' ? <Link className="button button-outline" href={`/propiedades/${p.slug}`}><Eye size={15} aria-hidden /> Ver publicación</Link>
          : <span className="adm-pill warn">Esperando revisión</span>;
        return <article key={p.id} className="pub-row">
          <div className="pub-row-main">
            {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : <div className="img-missing">Sin fotos</div>}
            <div className="pub-row-info">
              <div className="pub-row-pills"><i className={`status-pill ${st.tone}`}>{p.status === 'REJECTED' ? 'Requiere cambios' : st.label}</i>{p.status === 'PUBLISHED' && <i className={`status-pill ${av.tone}`}>{av.label}</i>}</div>
              <b className="pub-row-title">{p.title}</b>
              <small>{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality} · {OPERATION_LABEL[p.operation]} · {mxn(Number(p.price))}{p.operation === 'RENT' ? ' / mes' : ''}{p.operation === 'BOTH' && p.rentPrice ? ` · renta ${mxn(Number(p.rentPrice))} / mes` : ''}</small>
              {admin && <small>Anunciante: <b>{p.owner?.fullName || '—'}</b></small>}
              {p.status === 'DRAFT' && missing.length > 0 && <div className="pub-miss">Para enviarla a revisión falta: {missing.map(m => <span key={m}>{m}</span>)}</div>}
              {p.status === 'REJECTED' && <div className="pub-fix"><b>Qué corregir:</b> {p.reviewNote || 'Revisa los datos y las fotos, y vuelve a enviarla.'}</div>}
              {p.status === 'REVIEW' && !admin && <small className="pub-note">El administrador la está revisando. Te avisaremos por correo.</small>}
            </div>
            <div className="pub-row-acts">
              {primary}
              <div className="adm-menu-wrap" ref={menu === p.id ? menuRef : undefined}>
                <button type="button" className="adm-dots" aria-label={`Más acciones para ${p.title}`} aria-expanded={menu === p.id} onClick={() => setMenu(menu === p.id ? '' : p.id)}><Ellipsis size={18} /></button>
                {menu === p.id && <div className="adm-menu" role="menu">
                  {editable && <button type="button" role="menuitem" onClick={() => open(p)}><Pencil size={16} aria-hidden />Editar datos y fotos</button>}
                  <a role="menuitem" href={`/vista-previa/propiedad/${p.id}`} target="_blank" rel="opener" onClick={() => setMenu('')}><Eye size={16} aria-hidden />Vista previa de la ficha ↗</a>
                  <button type="button" role="menuitem" onClick={() => { setMenu(''); setReserving(reserving === p.id ? '' : p.id); }}><CalendarDays size={16} aria-hidden />Reservas y calendario</button>
                  <Link role="menuitem" href={`/panel/fanpage/${p.id}`}><LayoutTemplate size={16} aria-hidden />Fanpage para redes</Link>
                  {p.status === 'REJECTED' && !admin && <button type="button" role="menuitem" onClick={() => submit(p)}><Send size={16} aria-hidden />Reenviar sin cambios</button>}
                  {p.status === 'PUBLISHED' && <><button type="button" role="menuitem" onClick={() => { setMenu(''); setConfirm({ kind: 'availability', p, value: p.availability }); }}><ToggleLeft size={16} aria-hidden />Cambiar disponibilidad…</button>
                    <button type="button" role="menuitem" onClick={() => share(p)}><Share2 size={16} aria-hidden />Compartir</button></>}
                  <hr /><button type="button" role="menuitem" className="red" onClick={() => { setMenu(''); setConfirm({ kind: 'delete', p }); }}><Trash2 size={16} aria-hidden />Eliminar…</button>
                </div>}
              </div>
            </div>
          </div>
          {reserving === p.id && <div className="reserve-config"><RentalSettings propertyId={p.id} operation={p.operation} /></div>}
        </article>;
      })}</div>}

    {confirm?.kind === 'delete' && <Modal title={`Eliminar “${confirm.p.title}”`} onClose={() => setConfirm(null)}>
      <p className="muted">Se borran la propiedad, sus fotos y su fanpage. <b>No se puede deshacer.</b> Si solo ya no está disponible, mejor usa “Cambiar disponibilidad”.</p>
      <div className="adm-modal-acts"><button type="button" className="button button-outline" onClick={() => setConfirm(null)}>Cancelar</button>
        <button type="button" className="button adm-danger" disabled={busy === confirm.p.id} onClick={confirmIt}>Sí, eliminar</button></div>
    </Modal>}
    {confirm?.kind === 'availability' && <Modal title={`Disponibilidad · ${confirm.p.title}`} onClose={() => setConfirm(null)}>
      <div className="adm-reasons">{(Object.keys(AVAILABILITY) as (keyof typeof AVAILABILITY)[]).filter(k => !(k === 'RENTED' && confirm.p.operation === 'SALE') && !(k === 'SOLD' && confirm.p.operation === 'RENT')).map(k =>
        <label key={k} className={confirm.value === k ? 'on' : ''}><input type="radio" name="disp" checked={confirm.value === k} onChange={() => setConfirm({ ...confirm, value: k })} /><span><b>{AVAILABILITY[k].label}</b><small>{AVAILABILITY[k].help}</small></span></label>)}</div>
      <div className="adm-modal-acts"><button type="button" className="button button-outline" onClick={() => setConfirm(null)}>Cancelar</button>
        <button type="button" className="button button-navy" disabled={confirm.value === confirm.p.availability || busy === confirm.p.id} onClick={confirmIt}>Guardar</button></div>
    </Modal>}
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{user => user.role === 'ADMIN'
    ? <AdminShell user={user} active="propiedades"><MyProperties user={user} /></AdminShell>
    : <PublisherShell user={user} active="propiedades"><MyProperties user={user} /></PublisherShell>}</ProtectedPanel>;
}
