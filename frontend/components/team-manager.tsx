"use client";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { authJson, UserRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

type Created = { id: string; fullName: string; email: string; phone?: string | null; role: UserRole; isActive: boolean; activated: boolean; invitePending: boolean; createdAt: string };
type Invite = { activationLink: string; emailSent: boolean; expiresInDays: number };

/** Crear cuentas según el rol (admin: todas; agencia: agentes y compradores; agente: compradores) y ver las creadas. */
export default function TeamManager({ roles, title, intro }: { roles: UserRole[]; title: string; intro: string }) {
  const empty = { fullName: '', email: '', phone: '', role: roles[0], agencyName: '' };
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState<Created[] | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const [invite, setInvite] = useState<(Invite & { name: string; email: string }) | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => authJson<Created[]>('/users/mine').then(setItems).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy('create'); setError(''); setInvite(null); setCopied(false);
    try {
      const r = await authJson<Invite>('/users', { method: 'POST', body: JSON.stringify({ ...form, phone: form.phone || undefined, agencyName: form.role === 'AGENCY' || form.role === 'DEVELOPER' ? form.agencyName : undefined }) });
      setInvite({ ...r, name: form.fullName, email: form.email });
      setForm({ ...empty, role: form.role }); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.'); }
    finally { setBusy(''); }
  }

  async function resend(u: Created) {
    setBusy(u.id); setError(''); setInvite(null); setCopied(false);
    try { const r = await authJson<Invite>(`/users/${u.id}/invite`, { method: 'POST' }); setInvite({ ...r, name: u.fullName, email: u.email }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo generar el enlace.'); }
    finally { setBusy(''); }
  }

  async function copy() { try { await navigator.clipboard.writeText(invite!.activationLink); setCopied(true); } catch { setCopied(false); } }
  const waText = invite ? encodeURIComponent(`Hola ${invite.name.split(' ')[0]}, te creé una cuenta en Agencia EH. Activa tu cuenta y elige tu contraseña aquí (vence en ${invite.expiresInDays} días): ${invite.activationLink}`) : '';

  return <section id="cuentas" className="admin-section">
    <h2 className="panel-subtitle">{title} {items && <em className="count">{items.length}</em>}</h2>
    <p className="muted lead">{intro}</p>

    <form onSubmit={create} className="dashboard-card property-form team-form">
      <h3>Crear cuenta</h3>
      <div className="form-grid">
        {roles.length > 1 && <label>Tipo de cuenta<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>{roles.map(r => <option key={r} value={r}>{ROLES[r].label}</option>)}</select></label>}
        <label>Nombre completo<input required minLength={2} maxLength={100} value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
        {(form.role === 'AGENCY' || form.role === 'DEVELOPER') && <label>{form.role === 'DEVELOPER' ? 'Nombre de la desarrolladora' : 'Nombre de la agencia'}<input required minLength={2} maxLength={140} value={form.agencyName} onChange={e => setForm({ ...form, agencyName: e.target.value })} /></label>}
        <label>Correo<input required type="email" maxLength={190} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nombre@correo.com" /></label>
        <label>Teléfono (opcional)<input type="tel" maxLength={25} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
      </div>
      <small className="muted">La persona recibirá un enlace para activar su cuenta y elegir su contraseña. No necesitas inventarle una.</small>
      <button className="button button-navy" disabled={busy === 'create'}>{busy === 'create' ? 'Creando…' : `Crear cuenta de ${ROLES[form.role].label.toLowerCase()}`}</button>
    </form>

    {error && <div className="notice" role="alert">{error}</div>}
    {invite && <div className="notice ok invite-box" role="status">
      <b>Enlace de activación para {invite.name}</b>
      <span>{invite.emailSent ? `Se lo enviamos por correo a ${invite.email}; también puedes compartirlo por WhatsApp.` : 'El correo automático no está configurado: copia el enlace o compártelo por WhatsApp.'} Vence en {invite.expiresInDays} días y solo sirve una vez.</span>
      <input readOnly value={invite.activationLink} onFocus={e => e.target.select()} aria-label="Enlace de activación" />
      <div className="property-actions">
        <button type="button" className="button button-outline" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar enlace'}</button>
        <a className="button button-outline" href={`https://wa.me/?text=${waText}`} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
      </div>
    </div>}

    {items === null ? <p className="muted">Cargando…</p> : items.length === 0 ? <div className="empty-start">Aún no has creado cuentas.</div>
      : <div className="table-wrap"><table className="admin-table">
        <thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th /></tr></thead>
        <tbody>{items.map(u => <tr key={u.id}>
          <td><b>{u.fullName}</b><small>{u.email}{u.phone ? ` · ${u.phone}` : ''}</small></td>
          <td>{ROLES[u.role]?.label || u.role}</td>
          <td>{!u.isActive ? <i className="status-pill bad">Desactivada</i> : u.activated ? <i className="status-pill ok">Activa</i> : <i className="status-pill warn">{u.invitePending ? 'Pendiente de activar' : 'Enlace vencido'}</i>}</td>
          <td>{!u.activated && u.isActive && <button type="button" className="inline-link" disabled={busy === u.id} onClick={() => resend(u)}>{u.invitePending ? 'Nuevo enlace' : 'Reenviar enlace'}</button>}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
