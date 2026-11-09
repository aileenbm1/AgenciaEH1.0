"use client";
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import ProtectedPanel from '@/components/protected-panel';
import { updateProfile, roleHome, SessionUser } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

function Profile({ initial }: { initial: SessionUser }) {
  const [u, setU] = useState(initial);
  const [name, setName] = useState(initial.fullName); const [phone, setPhone] = useState(initial.phone || '');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    try { setU(await updateProfile({ fullName: name, phone })); setMsg('Tus datos se actualizaron correctamente.'); }
    catch (x) { setErr(x instanceof Error ? x.message : 'No fue posible guardar.'); }
  }
  const role = ROLES[u.role];
  return <main className="auth-wrap"><section className="auth-card">
    <Link href={roleHome[u.role]} className="back-link">← Volver a mi panel</Link>
    <span className="eyebrow" style={{ display: 'block', marginTop: 18 }}>MI CUENTA</span>
    <h1>Tu perfil</h1>
    <span className="role-badge">{role.label}</span>
    <p className="muted lead">{u.email} · {u.emailVerified ? 'Correo verificado' : 'Correo pendiente de verificación'}</p>
    <form onSubmit={save}>
      <label>Nombre completo<input value={name} onChange={e => setName(e.target.value)} required minLength={2} /></label>
      <label>Teléfono<input value={phone} onChange={e => setPhone(e.target.value)} maxLength={25} placeholder="Para que los interesados te contacten" /></label>
      {err && <p role="alert" className="auth-error">{err}</p>}
      {msg && <p className="notice ok" role="status">{msg}</p>}
      <button className="button button-navy full">Guardar cambios</button>
    </form>
    <small className="muted">Tu tipo de cuenta no se puede cambiar desde aquí. Si lo necesitas, contacta al administrador.</small>
  </section></main>;
}

export default function Cuenta() {
  return <ProtectedPanel allowed={['BUYER', 'AGENT', 'AGENCY', 'ADMIN']}>{u => <Profile initial={u} />}</ProtectedPanel>;
}
