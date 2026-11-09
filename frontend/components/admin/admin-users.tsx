"use client";
import { useCallback, useEffect, useState } from 'react';
import { authJson, SessionUser, UserRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { AdminUser, fmtDate } from './admin-types';
import UserMembership from './payment-form';

type Page = { items: AdminUser[]; total: number; page: number; pages: number };
const ROLE_IDS: UserRole[] = ['BUYER', 'AGENT', 'AGENCY', 'ADMIN'];

export default function AdminUsers({ me, onChanged }: { me: SessionUser; onChanged: () => void }) {
  const [filters, setFilters] = useState({ search: '', role: '', status: '', membership: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), take: '20' });
    Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
    try { setData(await authJson<Page>(`/admin/users?${qs}`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar los usuarios.'); }
  }, [filters, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function update(u: AdminUser, change: { role?: UserRole; isActive?: boolean }) {
    const what = change.role ? `cambiar el rol de ${u.fullName} a "${ROLES[change.role].label}"` : change.isActive ? `reactivar la cuenta de ${u.fullName}` : `desactivar la cuenta de ${u.fullName}? Ya no podrá iniciar sesión`;
    if (!confirm(`¿Seguro que quieres ${what}?`)) { load(); return; }
    setBusy(u.id); setError(''); setOk('');
    try {
      await authJson(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify(change) });
      setOk(change.role ? `${u.fullName} ahora es ${ROLES[change.role].label}. El cambio se aplica cuando vuelva a iniciar sesión.` : change.isActive ? `Cuenta de ${u.fullName} reactivada.` : `Cuenta de ${u.fullName} desactivada.`);
      await load(); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); await load(); }
    finally { setBusy(''); }
  }

  const setFilter = (k: keyof typeof filters) => (e: { target: { value: string } }) => { setPage(1); setFilters(f => ({ ...f, [k]: e.target.value })); };

  return <section id="usuarios" className="admin-section">
    <div className="section-heading"><h2 className="panel-subtitle">Usuarios y membresías {data && <em className="count">{data.total}</em>}</h2></div>
    <div className="filterbar admin-filters">
      <input type="search" placeholder="Buscar por nombre, correo o teléfono" value={filters.search} onChange={setFilter('search')} />
      <select value={filters.role} onChange={setFilter('role')}><option value="">Todos los roles</option>{ROLE_IDS.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}</select>
      <select value={filters.membership} onChange={setFilter('membership')}><option value="">Toda membresía</option><option value="active">Membresía activa</option><option value="expired">Membresía vencida</option><option value="none">Sin membresía</option></select>
      <select value={filters.status} onChange={setFilter('status')}><option value="">Activos e inactivos</option><option value="active">Solo activos</option><option value="inactive">Solo desactivados</option></select>
    </div>
    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    {selected && <UserMembership user={data?.items.find(x => x.id === selected.id) ?? selected} onClose={() => setSelected(null)} onSaved={() => { load(); onChanged(); }} />}

    {!data ? <p className="muted">Cargando usuarios…</p> : data.items.length === 0 ? <div className="empty-start">No hay usuarios con esos filtros.</div>
      : <div className="user-list">{data.items.map(u => {
        const self = u.id === me.id; const m = u.membership;
        return <article key={u.id} className={`dashboard-card user-row${u.isActive ? '' : ' is-inactive'}`}>
          <div className="user-main">
            <span className="session-avatar">{u.fullName.trim().charAt(0).toUpperCase()}</span>
            <div>
              <h3>{u.fullName}{self && <small> (tú)</small>}</h3>
              <p className="meta">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
              <p className="meta">Alta {fmtDate(u.createdAt)}{u.createdBy ? ` por ${u.createdBy}` : ''} · {u.properties} propiedad(es){u.emailVerified ? '' : ' · sin activar'}</p>
            </div>
          </div>
          <div className="user-tags">
            {!u.isActive && <i className="status-pill bad">Desactivado</i>}
            {m ? <i className={`status-pill ${m.active ? 'ok' : 'warn'}`}>{m.active ? 'Membresía activa' : u.role === 'ADMIN' ? 'Membresía vencida' : 'Vencida · sin acceso'} · {m.plan} · {fmtDate(m.periodEnd)}</i> : <i className="status-pill neutral">Sin membresía</i>}
          </div>
          <div className="user-actions">
            <label className="sr-only" htmlFor={`rol-${u.id}`}>Rol</label>
            <select id={`rol-${u.id}`} value={u.role} disabled={self || busy === u.id} onChange={e => update(u, { role: e.target.value as UserRole })}>
              {ROLE_IDS.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
            <button className="button button-navy" onClick={() => { setSelected(u); setTimeout(() => document.getElementById('membresia')?.scrollIntoView({ behavior: 'smooth' }), 50); }}>Membresía y pagos</button>
            {!self && <button className="button button-ghost" disabled={busy === u.id} onClick={() => update(u, { isActive: !u.isActive })}>{u.isActive ? 'Desactivar' : 'Reactivar'}</button>}
          </div>
        </article>;
      })}</div>}

    {data && data.pages > 1 && <div className="pager">
      <button className="button button-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
      <span className="muted">Página {data.page} de {data.pages}</span>
      <button className="button button-outline" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
    </div>}
  </section>;
}
