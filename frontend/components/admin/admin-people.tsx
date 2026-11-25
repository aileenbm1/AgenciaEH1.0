"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeDollarSign, Ellipsis, ListFilter, Mail, Pencil, Plus, Search, UserCheck, UserCog, UserX } from 'lucide-react';
import { authJson, SessionUser, UserRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import TeamManager from '@/components/team-manager';
import { AdminUser, fmtDate } from './admin-types';
import Modal from './modal';
import RegisterPayment from './register-payment';
import UserEditor from './user-editor';
import { refreshPending } from './use-pending';

type Page = { items: AdminUser[]; total: number; page: number; pages: number };
type Counts = { total: number; byRole: Record<UserRole, number>; pending: number };
const ROLE_IDS: UserRole[] = ['AGENCY', 'AGENT', 'DEVELOPER', 'BUYER', 'ADMIN'];
const PLURAL: Record<UserRole, string> = { AGENCY: 'Agencias', AGENT: 'Agentes', DEVELOPER: 'Desarrolladoras', BUYER: 'Compradores', ADMIN: 'Administradores' };
const HELP: Record<UserRole, string> = {
  BUYER: 'Puede buscar, guardar favoritos y reservar. No publica propiedades.',
  AGENT: 'Publica propiedades y atiende interesados. Puede pertenecer a una agencia.',
  AGENCY: 'Publica a nombre de su agencia y ve los interesados y reservas de su equipo.',
  DEVELOPER: 'Publica desarrollos y preventas; funciona como una agencia.',
  ADMIN: 'Acceso total: revisa propiedades, crea cuentas, registra pagos y edita el sitio.',
};

type Confirm = { kind: 'role'; user: AdminUser; role: UserRole } | { kind: 'active'; user: AdminUser } | { kind: 'reject'; user: AdminUser };

/** Personas: lista compacta, filtros y acciones en el menú "⋯" (los cambios delicados piden confirmación). */
export default function AdminPeople({ me }: { me: SessionUser }) {
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ membership: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState('');
  const [menu, setMenu] = useState('');
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [paying, setPaying] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('crear')) setCreating(true);
    if (q.get('filtro') === 'pendientes') setTab('pending');
  }, []);
  const loadCounts = useCallback(() => authJson<{ users: Counts }>('/admin/metrics').then(m => setCounts(m.users)).catch(() => {}), []);
  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), take: '25' });
    if (search) qs.set('search', search);
    if (tab === 'pending') qs.set('approval', 'PENDING'); else if (tab !== 'all') qs.set('role', tab);
    if (filters.membership) qs.set('membership', filters.membership);
    if (filters.status) qs.set('status', filters.status);
    try { setData(await authJson<Page>(`/admin/users?${qs}`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las cuentas.'); }
  }, [page, search, tab, filters]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { loadCounts(); }, [loadCounts]);
  // El menú "⋯" se cierra al tocar fuera de él.
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(''); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [menu]);
  const changed = () => { load(); loadCounts(); refreshPending(); };

  async function patch(u: AdminUser, change: { role?: UserRole; isActive?: boolean; approval?: 'APPROVED' | 'REJECTED' }, msg: string) {
    setBusy(u.id); setError(''); setOk('');
    try { await authJson(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify(change) }); setOk(msg); setConfirm(null); changed(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar.'); }
    finally { setBusy(''); }
  }
  async function resend(u: AdminUser) {
    setMenu(''); setBusy(u.id); setError(''); setOk('');
    try { const r = await authJson<{ emailSent: boolean; activationLink: string }>(`/users/${u.id}/invite`, { method: 'POST' });
      setOk(r.emailSent ? `Enviamos un nuevo enlace de activación a ${u.email}.` : `El correo automático no está configurado. Comparte este enlace con ${u.fullName}: ${r.activationLink}`); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo generar el enlace.'); }
    finally { setBusy(''); }
  }

  const chip = (key: string, label: string, n?: number) => <button key={key} type="button" className={`adm-chip${tab === key ? ' on' : ''}`} aria-pressed={tab === key} onClick={() => { setTab(key); setPage(1); }}>{label}{n !== undefined && <i>{n}</i>}</button>;
  const memberPill = (u: AdminUser) => u.role === 'BUYER' ? <i className="adm-pill mute">No aplica</i> : u.role === 'ADMIN' ? <i className="adm-pill mute">—</i>
    : u.membership ? <i className={`adm-pill ${u.membership.active ? 'ok' : 'warn'}`}>{u.membership.active ? `Activa · vence ${fmtDate(u.membership.periodEnd)}` : `Vencida · ${fmtDate(u.membership.periodEnd)}`}</i>
    : <i className="adm-pill warn">Sin membresía</i>;

  return <section className="adm-people">
    <div className="adm-top"><div><h1>Personas</h1><p className="adm-date">Cuentas de agencias, agentes, desarrolladoras, compradores y administradores.</p></div>
      <div className="adm-top-acts"><button type="button" className="button button-navy" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Crear cuenta</button></div></div>

    <div className="adm-toolbar">
      <label className="adm-search"><Search size={18} aria-hidden /><input type="search" placeholder="Buscar por nombre, correo o teléfono" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      <button type="button" className={`button button-outline${showFilters || filters.membership || filters.status ? ' is-on' : ''}`} onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}><ListFilter size={16} aria-hidden /> Filtros{filters.membership || filters.status ? ' •' : ''}</button>
    </div>
    {showFilters && <div className="adm-filters">
      <label>Membresía<select value={filters.membership} onChange={e => { setFilters({ ...filters, membership: e.target.value }); setPage(1); }}><option value="">Todas</option><option value="active">Activa</option><option value="expired">Vencida</option><option value="none">Sin membresía</option></select></label>
      <label>Estado<select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}><option value="">Activas y desactivadas</option><option value="active">Solo activas</option><option value="inactive">Solo desactivadas</option></select></label>
      {(filters.membership || filters.status) && <button type="button" className="inline-link" onClick={() => setFilters({ membership: '', status: '' })}>Quitar filtros</button>}
    </div>}
    <div className="adm-chips">{chip('all', 'Todas', counts?.total)}{counts && counts.pending > 0 && chip('pending', 'Por aprobar', counts.pending)}{ROLE_IDS.map(r => chip(r, PLURAL[r], counts?.byRole[r]))}</div>

    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    {!data ? <p className="muted">Cargando…</p> : data.items.length === 0 ? <div className="adm-empty">No hay cuentas con esa búsqueda o filtro.</div>
      : <div className="adm-card adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Nombre</th><th>Tipo de cuenta</th><th>Membresía</th><th>Alta</th><th><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{data.items.map(u => { const self = u.id === me.id;
          return <tr key={u.id} className={u.isActive ? '' : 'is-off'}>
            <td><div className="adm-user"><span className="adm-av sm">{u.fullName.trim().charAt(0).toUpperCase()}</span><div><b>{u.fullName}{self && <small> (tú)</small>}</b><small>{u.email}{u.phone ? ` · ${u.phone}` : ''}</small></div></div></td>
            <td className="adm-cell-tags"><i className="adm-pill">{ROLES[u.role]?.label || u.role}</i>
              {u.approvalStatus === 'PENDING' && <i className="adm-pill warn">Por aprobar</i>}{u.approvalStatus === 'REJECTED' && <i className="adm-pill bad">Rechazada</i>}
              {!u.isActive && <i className="adm-pill bad">Desactivada</i>}{u.isActive && !u.emailVerified && <i className="adm-pill mute">Sin activar</i>}</td>
            <td className="adm-cell-tags">{memberPill(u)}</td>
            <td className="adm-cell-date">{fmtDate(u.createdAt)}{u.properties ? <small>{u.properties} propiedad{u.properties === 1 ? '' : 'es'}</small> : null}</td>
            <td className="adm-cell-acts">
              {u.approvalStatus === 'PENDING' && <button type="button" className="button button-gold adm-sm" disabled={busy === u.id} onClick={() => patch(u, { approval: 'APPROVED' }, `Cuenta de ${u.fullName} aprobada: ya puede publicar. Le avisamos por correo.`)}>Aprobar</button>}
              <div className="adm-menu-wrap" ref={menu === u.id ? menuRef : undefined}>
                <button type="button" className="adm-dots" aria-label={`Acciones para ${u.fullName}`} aria-expanded={menu === u.id} onClick={() => setMenu(menu === u.id ? '' : u.id)}><Ellipsis size={18} /></button>
                {menu === u.id && <div className="adm-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setMenu(''); setEditing(u); }}><Pencil size={16} aria-hidden />Editar datos</button>
                  {u.role !== 'BUYER' && u.role !== 'ADMIN' && <button type="button" role="menuitem" onClick={() => { setMenu(''); setPaying(u); }}><BadgeDollarSign size={16} aria-hidden />Membresía y pagos</button>}
                  {!self && <button type="button" role="menuitem" onClick={() => { setMenu(''); setConfirm({ kind: 'role', user: u, role: u.role }); }}><UserCog size={16} aria-hidden />Cambiar tipo de cuenta…</button>}
                  {u.isActive && !u.emailVerified && <button type="button" role="menuitem" onClick={() => resend(u)}><Mail size={16} aria-hidden />Reenviar enlace de activación</button>}
                  {u.approvalStatus === 'PENDING' && <button type="button" role="menuitem" onClick={() => { setMenu(''); setConfirm({ kind: 'reject', user: u }); }}><UserX size={16} aria-hidden />Rechazar solicitud…</button>}
                  {!self && <><hr /><button type="button" role="menuitem" className={u.isActive ? 'red' : ''} onClick={() => { setMenu(''); setConfirm({ kind: 'active', user: u }); }}>{u.isActive ? <><UserX size={16} aria-hidden />Desactivar cuenta…</> : <><UserCheck size={16} aria-hidden />Reactivar cuenta…</>}</button></>}
                </div>}
              </div>
            </td>
          </tr>; })}</tbody>
      </table></div>}

    {data && data.pages > 1 && <div className="pager">
      <button className="button button-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
      <span className="muted">Página {data.page} de {data.pages}</span>
      <button className="button button-outline" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
    </div>}

    {creating && <Modal title="Crear cuenta" onClose={() => setCreating(false)} wide>
      <TeamManager compact roles={['AGENCY', 'AGENT', 'DEVELOPER', 'BUYER', 'ADMIN']} title="" intro="" onCreated={changed} />
    </Modal>}
    {editing && <Modal title={`Editar · ${editing.fullName}`} onClose={() => setEditing(null)} wide>
      <UserEditor key={editing.id} user={data?.items.find(x => x.id === editing.id) ?? editing} me={me} onClose={() => setEditing(null)}
        onSaved={changed} onDeleted={msg => { setEditing(null); setOk(msg); changed(); }} />
    </Modal>}
    {paying && <RegisterPayment initial={paying} onClose={() => setPaying(null)} onSaved={changed} />}

    {confirm?.kind === 'role' && <Modal title={`Cambiar tipo de cuenta · ${confirm.user.fullName}`} onClose={() => setConfirm(null)}>
      <p className="muted">Ahora es <b>{ROLES[confirm.user.role]?.label}</b>. Elige el nuevo tipo:</p>
      <div className="adm-reasons">{ROLE_IDS.map(r => <label key={r} className={confirm.role === r ? 'on' : ''}><input type="radio" name="rol" checked={confirm.role === r} onChange={() => setConfirm({ ...confirm, role: r })} />
        <span><b>{ROLES[r].label}</b><small>{HELP[r]}</small></span></label>)}</div>
      <p className="muted small">El cambio se aplica la próxima vez que {confirm.user.fullName.split(' ')[0]} inicie sesión.</p>
      <div className="adm-modal-acts"><button type="button" className="button button-outline" onClick={() => setConfirm(null)}>Cancelar</button>
        <button type="button" className="button button-navy" disabled={confirm.role === confirm.user.role || busy === confirm.user.id}
          onClick={() => patch(confirm.user, { role: confirm.role }, `${confirm.user.fullName} ahora es ${ROLES[confirm.role].label}.`)}>Confirmar cambio</button></div>
    </Modal>}
    {confirm?.kind === 'active' && <Modal title={`${confirm.user.isActive ? 'Desactivar' : 'Reactivar'} la cuenta de ${confirm.user.fullName}`} onClose={() => setConfirm(null)}>
      <p className="muted">{confirm.user.isActive ? 'Ya no podrá iniciar sesión. No se borra nada (ni su cuenta ni sus propiedades): puedes reactivarla cuando quieras.' : 'Podrá volver a iniciar sesión con su correo y contraseña.'}</p>
      <div className="adm-modal-acts"><button type="button" className="button button-outline" onClick={() => setConfirm(null)}>Cancelar</button>
        <button type="button" className={`button ${confirm.user.isActive ? 'adm-danger' : 'button-navy'}`} disabled={busy === confirm.user.id}
          onClick={() => patch(confirm.user, { isActive: !confirm.user.isActive }, `Cuenta de ${confirm.user.fullName} ${confirm.user.isActive ? 'desactivada' : 'reactivada'}.`)}>{confirm.user.isActive ? 'Sí, desactivar' : 'Sí, reactivar'}</button></div>
    </Modal>}
    {confirm?.kind === 'reject' && <Modal title={`Rechazar la solicitud de ${confirm.user.fullName}`} onClose={() => setConfirm(null)}>
      <p className="muted">Le avisaremos por correo que su cuenta de {ROLES[confirm.user.role]?.label.toLowerCase()} no fue aprobada. Podrás aprobarla más adelante si cambias de opinión.</p>
      <div className="adm-modal-acts"><button type="button" className="button button-outline" onClick={() => setConfirm(null)}>Cancelar</button>
        <button type="button" className="button adm-danger" disabled={busy === confirm.user.id} onClick={() => patch(confirm.user, { approval: 'REJECTED' }, `Solicitud de ${confirm.user.fullName} rechazada.`)}>Sí, rechazar</button></div>
    </Modal>}
  </section>;
}
