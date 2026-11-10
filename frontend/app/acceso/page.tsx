"use client";
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authenticate, getCurrentUser, roleHome, UserRole } from '@/lib/auth';
import { ROLES } from '@/lib/roles';

type Mode = 'login' | 'register';
type SignupRole = 'BUYER' | 'AGENT' | 'AGENCY' | 'DEVELOPER';

export default function Access() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  // El registro público solo se muestra si la API lo permite (PUBLIC_SIGNUP).
  const [signupOpen, setSignupOpen] = useState(false);
  const [closedNotice, setClosedNotice] = useState(false);
  // Registro público: solo compradores/inquilinos. Las demás cuentas las crea el administrador.
  const role: SignupRole = 'BUYER';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [next, setNext] = useState<string | null>(null);

  // Lee ?registro=1&rol=AGENT&next=/ruta sin depender de Suspense.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get('rol');
    if (r && r !== 'BUYER') { router.replace('/anunciar'); return; }
    const n = q.get('next'); if (n && n.startsWith('/')) setNext(n);
    // Si ya hay sesión, no tiene sentido mostrar este formulario.
    fetch('/api/v1/auth/config').then(r => r.json()).then(c => {
      const open = !!c.publicSignup; setSignupOpen(open);
      if (q.get('registro')) { if (open) setMode('register'); else setClosedNotice(true); }
    }).catch(() => {});
    getCurrentUser().then(u => { if (u) router.replace(roleHome[u.role]); }).catch(() => {});
  }, [router]);

  function switchMode(m: Mode) { setMode(m); setError(''); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const payload: Record<string, string> = mode === 'login'
        ? { email, password }
        : { fullName, email, password, role };
      const result = await authenticate(mode, payload);
      const home = roleHome[result.user.role as UserRole];
      router.push(next || (mode === 'register' ? `${home}?bienvenida=1` : home));
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }

  const selected = ROLES[role];

  return <main className="auth-wrap"><section className={`auth-card${mode === 'register' ? ' wide' : ''}`}>
    <span className="eyebrow">BIENVENIDO A AGENCIA EH</span>
    <h1>{mode === 'login' ? 'Qué gusto tenerte de vuelta.' : 'Crea tu cuenta'}</h1>
    <p className="muted lead">{mode === 'login'
      ? 'Ingresa y te llevaremos directo a tu panel según tu tipo de cuenta.'
      : 'Cuenta de comprador o inquilino: guarda favoritos, renta o aparta en línea y da seguimiento a tus solicitudes.'}</p>

    {closedNotice && <div className="notice" role="status">El registro público está cerrado. Tu cuenta la crea el administrador de Agencia EH: pídele tu enlace de activación.</div>}
    <div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'selected' : ''} onClick={() => switchMode('login')}>Ingresar</button>
      {signupOpen && <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'selected' : ''} onClick={() => switchMode('register')}>Crear cuenta</button>}
    </div>

    <form onSubmit={submit}>
      {mode === 'register' && <div className="role-explain">
        <p><b>{selected.label}</b>: {selected.summary}</p>
        <ul>{selected.can.map(c => <li key={c}>{c}</li>)}</ul>
        <small className="muted">¿Eres agente, agencia o desarrolladora? <Link className="inline-link" href="/anunciar">Solicita tu cuenta</Link>: la crea el administrador.</small>
      </div>}

      {mode === 'register' && <label>Nombre completo<input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} autoComplete="name" placeholder="Tu nombre" /></label>}
      <label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="nombre@correo.com" /></label>
      <label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 10 : 1} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Mínimo 10 caracteres' : 'Tu contraseña'} /></label>
      {mode === 'login' && <Link className="small-link" href="/recuperar">¿Olvidaste tu contraseña?</Link>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="button button-navy full" type="submit" disabled={busy}>
        {busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
      </button>
    </form>
    <small className="muted">{mode === 'login'
      ? signupOpen ? <>¿No tienes cuenta? <button type="button" className="inline-link" onClick={() => switchMode('register')}>Crea una aquí</button>.</>
        : <>¿No tienes cuenta? Las cuentas las crea el administrador de Agencia EH. <Link className="inline-link" href="/anunciar">Solicítala aquí</Link>.</>
      : 'Te enviaremos un correo para verificar tu cuenta.'}</small>
  </section></main>;
}
