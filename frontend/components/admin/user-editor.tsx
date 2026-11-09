"use client";
import { FormEvent, useState } from 'react';
import { authJson, SessionUser } from '@/lib/auth';
import { AdminUser } from './admin-types';

type Link = { link: string; emailSent: boolean; email: string; expiresInHours: number };

/** Editar datos, cambiar contraseña o borrar un usuario (solo administradores). */
export default function UserEditor({ user, me, onClose, onSaved, onDeleted }: {
  user: AdminUser; me: SessionUser; onClose: () => void; onSaved: (msg: string) => void; onDeleted: (msg: string) => void;
}) {
  const self = user.id === me.id;
  const [data, setData] = useState({ fullName: user.fullName, email: user.email, phone: user.phone || '' });
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [link, setLink] = useState<Link | null>(null); const [copied, setCopied] = useState(false);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(''); setOk('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(''); }
  };

  const saveData = (e: FormEvent) => { e.preventDefault(); run('data', async () => {
    const changedEmail = data.email.trim().toLowerCase() !== user.email;
    await authJson(`/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ fullName: data.fullName, email: data.email, phone: data.phone }) });
    const msg = `Datos de ${data.fullName} guardados.${changedEmail ? ' Al cambiar el correo se cerraron sus sesiones: deberá entrar con el correo nuevo.' : ''}`;
    setOk(msg); onSaved(msg);
  }); };

  const savePassword = (e: FormEvent) => { e.preventDefault();
    if (pw.password !== pw.confirm) { setError('Las contraseñas no coinciden.'); return; }
    run('pw', async () => {
      const r = await authJson<{ message: string }>(`/admin/users/${user.id}/password`, { method: 'POST', body: JSON.stringify({ password: pw.password }) });
      setPw({ password: '', confirm: '' }); setOk(`${r.message} Compártele la contraseña por un medio seguro.`);
    });
  };

  const makeLink = () => run('link', async () => {
    setCopied(false); setLink(await authJson<Link>(`/admin/users/${user.id}/password-link`, { method: 'POST' }));
  });

  const remove = (e: FormEvent) => { e.preventDefault(); run('delete', async () => {
    const r = await authJson<{ message: string }>(`/admin/users/${user.id}/delete`, { method: 'POST', body: JSON.stringify({ confirmEmail }) });
    onDeleted(r.message);
  }); };

  const copy = async () => { try { await navigator.clipboard.writeText(link!.link); setCopied(true); } catch { setCopied(false); } };
  const wa = link ? encodeURIComponent(`Hola ${user.fullName.split(' ')[0]}, entra a este enlace para elegir tu nueva contraseña de Agencia EH (vence en ${link.expiresInHours} horas): ${link.link}`) : '';

  return <section className="dashboard-card form-card user-editor" id="editar">
    <div className="section-heading"><h2>Editar · {user.fullName}{self ? ' (tú)' : ''}</h2><button type="button" className="inline-link" onClick={onClose}>Cerrar</button></div>
    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    <form onSubmit={saveData} className="property-form">
      <h3>Datos</h3>
      <div className="form-grid">
        <label>Nombre completo<input required minLength={2} maxLength={100} value={data.fullName} onChange={e => setData({ ...data, fullName: e.target.value })} /></label>
        <label>Correo<input required type="email" maxLength={190} value={data.email} onChange={e => setData({ ...data, email: e.target.value })} /></label>
        <label>Teléfono<input type="tel" maxLength={25} value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} /></label>
      </div>
      <button className="button button-navy" disabled={busy === 'data'}>{busy === 'data' ? 'Guardando…' : 'Guardar datos'}</button>
    </form>

    <form onSubmit={savePassword} className="property-form">
      <h3>Contraseña</h3>
      <p className="muted">Escribe una nueva contraseña y compártela con la persona, o envíale un enlace para que ella elija la suya. En ambos casos se cierran sus sesiones abiertas.</p>
      <div className="form-grid">
        <label>Nueva contraseña<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={pw.password} onChange={e => setPw({ ...pw, password: e.target.value })} placeholder="Mínimo 10 caracteres" /></label>
        <label>Confirmar contraseña<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} /></label>
      </div>
      <div className="property-actions">
        <button className="button button-navy" disabled={busy === 'pw'}>{busy === 'pw' ? 'Guardando…' : 'Cambiar contraseña'}</button>
        <button type="button" className="button button-outline" disabled={busy === 'link'} onClick={makeLink}>{busy === 'link' ? 'Generando…' : 'Enviar enlace para que la elija'}</button>
      </div>
      {link && <div className="notice ok invite-box" role="status">
        <span>{link.emailSent ? `Se lo enviamos por correo a ${link.email}; también puedes compartirlo.` : 'El correo automático no está configurado: copia el enlace o compártelo por WhatsApp.'} Vence en {link.expiresInHours} horas y solo sirve una vez.</span>
        <input readOnly value={link.link} onFocus={e => e.target.select()} aria-label="Enlace para elegir contraseña" />
        <div className="property-actions">
          <button type="button" className="button button-outline" onClick={copy}>{copied ? '¡Copiado!' : 'Copiar enlace'}</button>
          <a className="button button-outline" href={`https://wa.me/?text=${wa}`} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>
        </div>
      </div>}
    </form>

    {!self && <form onSubmit={remove} className="property-form danger-zone">
      <h3>Borrar usuario</h3>
      <p className="muted">Se borra la cuenta <b>junto con sus {user.properties} propiedad(es) y fotos, y su historial de pagos</b>. Las cuentas que haya creado se conservan. <b>No se puede deshacer.</b> Si solo quieres impedir que entre, usa <b>Desactivar</b>.</p>
      <label>Para confirmar, escribe su correo: <b>{user.email}</b><input value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} autoComplete="off" /></label>
      <button className="button button-danger" disabled={busy === 'delete' || confirmEmail.trim().toLowerCase() !== user.email}>{busy === 'delete' ? 'Borrando…' : 'Borrar usuario definitivamente'}</button>
    </form>}
  </section>;
}
