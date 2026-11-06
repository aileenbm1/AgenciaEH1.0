"use client";
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticate } from '@/lib/auth';

type Mode = 'login' | 'register';
export default function Access() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [role, setRole] = useState<'BUYER'|'AGENT'|'AGENCY'>('BUYER');
  const [fullName, setFullName] = useState(''); const [agencyName, setAgencyName] = useState('');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await authenticate(mode, mode === 'login' ? { email, password } : { fullName, email, password, role, ...(role === 'AGENCY' ? { agencyName } : {}) });
      const destinations = { BUYER: '/panel/comprador', AGENT: '/panel/agente', AGENCY: '/panel/agencia', ADMIN: '/panel/admin' };
      router.push(destinations[result.user.role]); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Ocurrió un error. Intenta nuevamente.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><section className="auth-card"><span className="eyebrow">BIENVENIDO A AGENCIA EH</span><h1>{mode === 'login' ? 'Qué gusto tenerte de vuelta.' : 'Comienza tu experiencia inmobiliaria.'}</h1><p className="muted">Encuentra tu próximo espacio en Guanajuato.</p><div className="auth-tabs"><button type="button" className={mode === 'login' ? 'selected' : ''} onClick={() => {setMode('login');setError('')}}>Ingresar</button><button type="button" className={mode === 'register' ? 'selected' : ''} onClick={() => {setMode('register');setError('')}}>Crear cuenta</button></div><form onSubmit={submit}>{mode === 'register' && <><label>Nombre completo<input value={fullName} onChange={e=>setFullName(e.target.value)} required minLength={2} autoComplete="name" placeholder="Tu nombre" /></label><label>Quiero registrarme como<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="BUYER">Comprador</option><option value="AGENT">Agente</option><option value="AGENCY">Agencia</option></select></label>{role === 'AGENCY' && <label>Nombre de la agencia<input value={agencyName} onChange={e=>setAgencyName(e.target.value)} required minLength={2} placeholder="Nombre comercial" /></label>}</>}<label>Correo electrónico<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="nombre@correo.com" /></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={mode === 'register' ? 10 : 1} maxLength={72} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Mínimo 10 caracteres' : 'Tu contraseña'} /></label>{error && <p role="alert" className="auth-error">{error}</p>}<button className="button button-navy full" type="submit" disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button></form><small className="muted">Tus credenciales se procesan mediante una conexión segura con Agencia EH.</small></section></main>;
}
