"use client";
import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiAuth } from '@/lib/auth';

function Restablecer() {
  const q = useSearchParams();
  const welcome = !!q.get('bienvenida');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (password !== confirm) { setErr('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try { await apiAuth('reset-password', { token: q.get('token') || '', password }); setMsg(welcome ? '¡Listo! Tu cuenta está activa.' : 'Contraseña actualizada.'); }
    catch (x) { setErr(x instanceof Error ? x.message : 'No fue posible guardar la contraseña.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><section className="auth-card">
    <span className="eyebrow">{welcome ? 'BIENVENIDO A AGENCIA EH' : 'RECUPERAR ACCESO'}</span>
    <h1>{welcome ? 'Activa tu cuenta' : 'Elige una nueva contraseña'}</h1>
    {msg ? <>
      <div className="notice ok" role="status">{msg} Ya puedes ingresar con tu correo y tu contraseña.</div>
      <Link className="button button-navy full" href="/acceso">Ingresar</Link>
    </> : <form onSubmit={submit} className="auth-form">
      <p className="muted lead">{welcome ? 'Crea la contraseña con la que entrarás a tu cuenta.' : 'Escribe tu nueva contraseña.'} Mínimo 10 caracteres.</p>
      <label>Contraseña<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label>Confirmar contraseña<input type="password" required minLength={10} maxLength={72} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
      {err && <p role="alert" className="auth-error">{err}</p>}
      <button className="button button-navy full" disabled={busy}>{busy ? 'Guardando…' : welcome ? 'Activar mi cuenta' : 'Guardar contraseña'}</button>
    </form>}
  </section></main>;
}

export default function Page() { return <Suspense fallback={<main className="auth-wrap"><section className="auth-card"><p className="muted">Cargando…</p></section></main>}><Restablecer /></Suspense>; }
