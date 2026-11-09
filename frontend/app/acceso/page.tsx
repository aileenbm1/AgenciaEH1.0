"use client";
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authenticate, getCurrentUser, roleHome, UserRole } from '@/lib/auth';
import { ROLES, SIGNUP_ROLES } from '@/lib/roles';

type Mode = 'login' | 'register';
type SignupRole = 'BUYER' | 'AGENT' | 'AGENCY';

export default function Access() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<SignupRole | null>(null);
  const [fullName, setFullName] = useState(''); const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [next, setNext] = useState<string | null>(null);

  // Lee ?registro=1&rol=AGENT&next=/ruta sin depender de Suspense.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('registro')) setMode('register');
    const r = q.get('rol') as SignupRole | null;
    if (r && ['BUYER', 'AGENT', 'AGENCY'].includes(r)) setRole(r);
    const n = q.get('next'); if (n && n.startsWith('/')) setNext(n);
    // Si ya hay sesión, no tiene sentido mostrar este formulario.
    getCurrentUser().then(u => { if (u) router.replace(roleHome[u.role]); }).catch(() => {});
  }, [router]);

  function switchMode(m: Mode) { setMode(m); setError(''); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'register' && !role) { setError('Elige cómo usarás Agencia EH.'); return; }
    setBusy(true); setError('');
    try {
      const payload = mode === 'login'
        ? { email, password }
        : { fullName, email, password, role: role!, ...(role === 'AGENCY' ? { agencyName } : {}) };
      const result = await authenticate(mode, payload);
      const home = roleHome[result.user.role as UserRole];
      router.push(next || (mode === 'register' ? `${home}?bienvenida=1` : home));
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }

  const selected = role ? ROLES[role] : null;

  return <main className="auth-wrap"><section className={`auth-card${mode === 'register' ? ' wide' : ''}`}>
    <span className="eyebrow">BIENVENIDO A AGENCIA EH</span>
    <h1>{mode === 'login' ? 'Qué gusto tenerte de vuelta.' : 'Crea tu cuenta'}</h1>
    <p className="muted lead">{mode === 'login'
      ? 'Ingresa y te llevaremos directo a tu panel según tu tipo de cuenta.'
      : 'Primero dinos cómo usarás la plataforma: de eso depende lo que podrás hacer.'}</p>

    <div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'selected' : ''} onClick={() => switchMode('login')}>Ingresar</button>
      <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'selected' : ''} onClick={() => switchMode('register')}>Crear cuenta</button>
    </div>

    <form onSubmit={submit}>
      {mode === 'register' && <fieldset className="role-picker">
        <legend><span className="step-num">1</span> ¿Cómo usarás Agencia EH?</legend>
        <div className="role-options">
          {SIGNUP_ROLES.map(r => <label key={r.id} className={`role-option${role === r.id ? ' active' : ''}`}>
            <input type="radio" name="role" value={r.id} checked={role === r.id} onChange={() => setRole(r.id as SignupRole)} />
            <b>{r.label}</b>
            <span>{r.who}</span>
          </label>)}
        </div>
        {selected && <div className="role-explain">
          <p>{selected.summary}</p>
          <ul>{selected.can.map(c => <li key={c}>{c}</li>)}</ul>
        </div>}
        <small className="muted">Las cuentas de administrador las crea el equipo de Agencia EH. <Link href="/como-funciona">Ver todos los roles</Link></small>
      </fieldset>}

      {mode === 'register' && <p className="form-step"><span className="step-num">2</span> Tus datos</p>}
      {mode === 'register' && <label>Nombre completo<input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} autoComplete="name" placeholder="Tu nombre" /></label>}
      {mode === 'register' && role === 'AGENCY' && <label>Nombre de la agencia<input value={agencyName} onChange={e => setAgencyName(e.target.value)} required minLength={2} placeholder="Nombre comercial" /></label>}
      <label>Correo electrónico<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="nombre@correo.com" /></label>
      <label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 10 : 1} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Mínimo 10 caracteres' : 'Tu contraseña'} /></label>
      {mode === 'login' && <Link className="small-link" href="/recuperar">¿Olvidaste tu contraseña?</Link>}
      {error && <p role="alert" className="auth-error">{error}</p>}
      <button className="button button-navy full" type="submit" disabled={busy}>
        {busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : selected ? `Crear cuenta de ${selected.label.toLowerCase()}` : 'Crear cuenta'}
      </button>
    </form>
    <small className="muted">{mode === 'login'
      ? <>¿No tienes cuenta? <button type="button" className="inline-link" onClick={() => switchMode('register')}>Crea una aquí</button>.</>
      : 'Te enviaremos un correo para verificar tu cuenta.'}</small>
  </section></main>;
}
