"use client";
import { FormEvent, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';

type Pay = { bank: string | null; clabe: string | null; holder: string | null; notes: string | null; amount?: string | null; whatsapp?: string | null };

/** Datos bancarios para recibir transferencias (anunciante) o para cobrar membresías (administrador, con monto y WhatsApp). */
export default function PayoutForm({ endpoint, membership = false, onSaved }: { endpoint: string; membership?: boolean; onSaved?: () => void }) {
  const [f, setF] = useState<Pay | null>(null);
  const [busy, setBusy] = useState(false); const [ok, setOk] = useState(''); const [err, setErr] = useState('');
  useEffect(() => { authJson<Pay>(endpoint).then(setF).catch(e => setErr(e.message)); }, [endpoint]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (!f) return; setBusy(true); setOk(''); setErr('');
    try { setF(await authJson<Pay>(endpoint, { method: 'PUT', body: JSON.stringify(f) })); setOk('Datos guardados.'); onSaved?.(); }
    catch (x) { setErr(x instanceof Error ? x.message : 'No se pudieron guardar.'); } finally { setBusy(false); }
  }
  if (!f) return err ? <div className="notice">{err}</div> : <p className="muted">Cargando…</p>;
  const set = (k: keyof Pay) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const clabe = (f.clabe || '').replace(/\D/g, '');
  return <form onSubmit={save} className="dashboard-card property-form payout-form">
    <div className="form-grid">
      <label>Banco<input maxLength={80} value={f.bank || ''} onChange={set('bank')} placeholder="Ej. BBVA, Banorte, Santander" /></label>
      <label>CLABE interbancaria (18 dígitos)<input inputMode="numeric" maxLength={22} value={f.clabe || ''} onChange={set('clabe')} placeholder="012 345 67890123456 7" />
        {clabe.length > 0 && clabe.length !== 18 && <small className="auth-error">Lleva {clabe.length} de 18 dígitos.</small>}</label>
      <label>A nombre de<input maxLength={120} value={f.holder || ''} onChange={set('holder')} placeholder="Titular de la cuenta" /></label>
      {membership && <label>Precio de la membresía<input maxLength={80} value={f.amount || ''} onChange={set('amount')} placeholder="Ej. $4,800 al año" /></label>}
      {membership && <label>WhatsApp para enviar comprobantes<input inputMode="tel" maxLength={25} value={f.whatsapp || ''} onChange={set('whatsapp')} placeholder="4771234567" /></label>}
    </div>
    <label>Indicaciones (opcional)<textarea rows={2} maxLength={300} value={f.notes || ''} onChange={set('notes')} placeholder={membership ? 'Ej. También puedes pagar en efectivo en nuestra oficina.' : 'Ej. Pon tu nombre en el concepto. También acepto efectivo al entregar las llaves.'} /></label>
    {err && <div className="notice" role="alert">{err}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}
    <button className="button button-navy" disabled={busy}>{busy ? 'Guardando…' : 'Guardar datos'}</button>
  </form>;
}
