"use client";
import { useCallback, useEffect, useState } from 'react';
import AdminMetrics from '@/components/admin/admin-metrics';
import AdminUsers from '@/components/admin/admin-users';
import AdminPayments from '@/components/admin/admin-payments';
import TeamManager from '@/components/team-manager';
import CustomFieldsManager from '@/components/admin/custom-fields-manager';
import FanpageAdmin from '@/components/admin/fanpage-admin';
import ProtectedPanel from '@/components/protected-panel';
import { PanelShell, PublishFlow } from '@/components/panel-shell';
import { authJson, SessionUser } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { mxn } from '@/lib/data';

type ReviewItem = {
  id: string; title: string; description: string; municipality: string; neighborhood?: string | null;
  price: number | string; operation: 'SALE' | 'RENT'; propertyType: string; bedrooms?: number | null; bathrooms?: number | null;
  builtArea?: number | string | null; updatedAt: string; images: { url: string }[];
  owner?: { fullName: string; email: string; role: keyof typeof ROLES };
};

function ModerationQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(''); const [done, setDone] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await authJson<ReviewItem[]>('/properties/review')); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la cola de revisión.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(p: ReviewItem, status: 'PUBLISHED' | 'REJECTED') {
    if (status === 'REJECTED' && !confirm(`¿Rechazar "${p.title}"? El anunciante podrá corregirla y reenviarla.`)) return;
    setBusy(p.id); setError(''); setDone('');
    try {
      await authJson(`/properties/${p.id}/moderate`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setItems(list => list.filter(x => x.id !== p.id));
      setDone(status === 'PUBLISHED' ? `"${p.title}" ya está publicada en el catálogo.` : `"${p.title}" fue rechazada y regresó al anunciante.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(''); }
  }

  return <section id="revision" className="queue">
    <div className="section-heading">
      <h2 className="panel-subtitle">Propiedades por revisar {!loading && <em className="count">{items.length}</em>}</h2>
      <button className="button button-outline" onClick={load} disabled={loading}>Actualizar</button>
    </div>
    <p className="muted lead">Nada se publica sin tu aprobación. Revisa que datos, precio y fotos sean correctos.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    {done && <div className="notice ok" role="status">{done}</div>}
    {loading ? <p className="muted">Cargando…</p> : items.length === 0
      ? <div className="empty-start">No hay propiedades esperando revisión. Cuando un agente o agencia envíe una, aparecerá aquí.</div>
      : <div className="property-management-list">{items.map(p => <article key={p.id} className="dashboard-card property-management-card">
        {p.images[0]?.url ? <img src={p.images[0].url} alt="" /> : <div className="img-missing">Sin fotos</div>}
        <div>
          <h3>{p.title}</h3>
          <p className="meta">{p.propertyType} · {p.operation === 'SALE' ? 'Venta' : 'Renta'} · {p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality}</p>
          <strong>{mxn(Number(p.price))}{p.operation === 'RENT' ? ' / mes' : ''}</strong>
          <p className="meta">{p.bedrooms ?? 0} rec · {p.bathrooms ?? 0} baños{p.builtArea ? ` · ${Number(p.builtArea)} m²` : ''} · {p.images.length} foto(s)</p>
          {p.owner && <p className="meta">Enviada por <b>{p.owner.fullName}</b> ({ROLES[p.owner.role]?.label || p.owner.role}) · {p.owner.email}</p>}
          <details><summary>Ver descripción</summary><p>{p.description}</p></details>
          <div className="property-actions">
            <button className="button button-navy" disabled={busy === p.id} onClick={() => decide(p, 'PUBLISHED')}>Aprobar y publicar</button>
            <button className="button button-outline" disabled={busy === p.id} onClick={() => decide(p, 'REJECTED')}>Rechazar</button>
          </div>
        </div>
      </article>)}</div>}
  </section>;
}

function AdminPanel({ user }: { user: SessionUser }) {
  // Al cambiar usuarios o pagos se refrescan las métricas y la lista de pagos.
  const [refreshKey, setRefreshKey] = useState(0);
  const changed = useCallback(() => setRefreshKey(k => k + 1), []);
  return <PanelShell user={user}
    intro="Revisas cada propiedad antes de que sea pública y administras usuarios, membresías y pagos."
    actions={[
      { title: 'Revisar propiedades', text: 'Aprueba o rechaza lo que está en revisión.', href: '#revision', primary: true },
      { title: 'Cuentas por aprobar', text: 'Agentes, agencias y desarrolladores registrados que esperan tu aprobación.', href: '#usuarios' },
      { title: 'Crear cuentas', text: 'Agencias, desarrolladoras, vendedores, compradores y administradores.', href: '#cuentas' },
      { title: 'Campos personalizados', text: 'Datos extra para las propiedades y filtros de búsqueda.', href: '#campos' },
      { title: 'Fanpages', text: 'Quién las diseña, aprobación y plantillas.', href: '#fanpages' },
      { title: 'Cómo funciona', text: 'Guía interna de roles y flujos (solo administradores).', href: '/como-funciona' },
      { title: 'Usuarios y membresías', text: 'Roles, cuentas activas y registro de pagos.', href: '#usuarios' },
      { title: 'Pagos del mes', text: 'Ingresos por efectivo y transferencia.', href: '#pagos' },
      { title: 'Reservas', text: 'Todas las reservas y apartados; puedes intervenir en cualquiera.', href: '/panel/reservas' },
      { title: 'Prospectos y visitas', text: 'Todos los mensajes y visitas del sitio.', href: '/panel/prospectos' },
      { title: 'Ver catálogo público', text: 'Comprueba cómo se ven las propiedades publicadas.', href: '/propiedades' },
    ]}>
    <AdminMetrics refreshKey={refreshKey} />
    <ModerationQueue />
    <TeamManager roles={['AGENCY', 'DEVELOPER', 'AGENT', 'BUYER', 'ADMIN']} title="Crear cuentas" intro="Además del registro público, tú puedes crear agencias, desarrolladoras, vendedores, compradores y otros administradores. Las cuentas que creas tú quedan aprobadas de inmediato." />
    <AdminUsers me={user} onChanged={changed} />
    <AdminPayments refreshKey={refreshKey} />
    <CustomFieldsManager />
    <FanpageAdmin />
    <PublishFlow />
  </PanelShell>;
}

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{user => <AdminPanel user={user} />}</ProtectedPanel>;
}
