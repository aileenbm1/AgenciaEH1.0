"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authJson, currentToken, getCurrentUser } from '@/lib/auth';
import { mxn } from '@/lib/data';

type Settings = { enabled: boolean; mode: 'MONTHLY' | 'NIGHTLY'; nightPrice: number | null; minStay: number; maxStay: number | null; maxGuests: number | null; deposit: number; taxRate: number;
  cancellationPolicy: string | null; seasons: { name?: string; from: string; to: string; price: number }[]; saleRequests: boolean; monthlyRent: number | null; salePrice: number | null; operation: string; availability: string };
type Busy = { from: string; to: string; type: string };
type Quote = { lines: { label: string; amount: number }[]; total: number; checkOut?: string; available?: boolean };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayIso = () => iso(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fmt = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Calendario mensual: marca días ocupados y permite elegir entrada/salida. */
function Calendar({ busy, from, to, onPick, single }: { busy: Busy[]; from: string; to: string; onPick: (d: string) => void; single: boolean }) {
  const [cursor, setCursor] = useState(() => { const t = new Date(); return new Date(Date.UTC(t.getFullYear(), t.getMonth(), 1)); });
  const isBusy = (d: string) => busy.some(b => d >= b.from && d < b.to);
  const days = useMemo(() => {
    const y = cursor.getUTCFullYear(), m = cursor.getUTCMonth();
    const first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // lunes = 0
    const n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => iso(new Date(Date.UTC(y, m, i + 1))))];
  }, [cursor]);
  const t = todayIso();
  return <div className="cal">
    <div className="cal-head">
      <button type="button" onClick={() => setCursor(c => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() - 1, 1)))} disabled={iso(cursor) <= t.slice(0, 8) + '01'} aria-label="Mes anterior">‹</button>
      <b>{MONTHS[cursor.getUTCMonth()]} {cursor.getUTCFullYear()}</b>
      <button type="button" onClick={() => setCursor(c => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1)))} aria-label="Mes siguiente">›</button>
    </div>
    <div className="cal-grid">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="cal-dow">{d}</span>)}
      {days.map((d, i) => d === null ? <span key={i} /> : (() => {
        const past = d < t, taken = isBusy(d), inRange = !single && from && to && d >= from && d < to;
        const sel = d === from || (!single && d === to);
        return <button type="button" key={d} disabled={past || taken} onClick={() => onPick(d)}
          className={`cal-day${taken ? ' busy' : ''}${inRange ? ' range' : ''}${sel ? ' sel' : ''}`} aria-label={`${d}${taken ? ' (ocupado)' : ''}`}>{Number(d.slice(8))}</button>;
      })())}
    </div>
    <div className="cal-legend"><span><i className="dot busy" /> Ocupado</span><span><i className="dot sel" /> Tu selección</span></div>
  </div>;
}

/** Reserva en línea en la ficha (RF-22 a RF-24): renta por noche o mensual, y apartado de compra. */
export default function ReservationWidget({ propertyId, slug, operation }: { propertyId: string; slug: string; operation: 'RENT' | 'SALE' | 'BOTH' }) {
  const router = useRouter();
  const [data, setData] = useState<{ settings: Settings; busy: Busy[] } | null>(null);
  const [tab, setTab] = useState<'RENT' | 'SALE'>(operation === 'SALE' ? 'SALE' : 'RENT');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [months, setMonths] = useState(''); const [guests, setGuests] = useState('1');
  const [paymentType, setPaymentType] = useState('CONTADO'); const [note, setNote] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null); const [qErr, setQErr] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [logged, setLogged] = useState(false);
  // La sesión puede venir solo de la cookie de renovación: se confirma con el servidor.
  useEffect(() => { if (currentToken()) setLogged(true); else getCurrentUser().then(u => setLogged(!!u)).catch(() => {}); }, []);
  useEffect(() => { fetch(`/api/v1/reservations/calendar/${propertyId}`).then(r => r.ok ? r.json() : null).then(setData).catch(() => {}); }, [propertyId]);
  const s = data?.settings;
  const rentOn = !!s?.enabled && (operation === 'RENT' || operation === 'BOTH');
  const saleOn = !!s?.saleRequests && (operation === 'SALE' || operation === 'BOTH') && s?.availability === 'AVAILABLE';
  useEffect(() => { if (s && !rentOn && saleOn) setTab('SALE'); }, [s, rentOn, saleOn]);
  useEffect(() => { if (s?.mode === 'MONTHLY' && !months) setMonths(String(Math.max(1, s.minStay))); }, [s, months]);

  const kind = tab === 'SALE' ? 'SALE' : s?.mode === 'NIGHTLY' ? 'NIGHTLY' : 'MONTHLY';
  const ready = kind === 'SALE' || (kind === 'NIGHTLY' ? !!(from && to) : !!(from && months));
  useEffect(() => {
    setQuote(null); setQErr('');
    if (!ready || !s) return;
    const body = { propertyId, kind, checkIn: from || undefined, checkOut: kind === 'NIGHTLY' ? to : undefined, months: kind === 'MONTHLY' ? Number(months) : undefined, guests: kind === 'NIGHTLY' ? Number(guests) : undefined };
    const t = setTimeout(() => fetch('/api/v1/reservations/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(Array.isArray(d.message) ? d.message.join(' ') : d.message); setQuote(d); })
      .catch(e => setQErr(e.message)), 250);
    return () => clearTimeout(t);
  }, [ready, kind, from, to, months, guests, propertyId, s]);

  if (!data || (!rentOn && !saleOn)) return null;
  const pick = (d: string) => {
    if (kind !== 'NIGHTLY') { setFrom(d); return; }
    if (!from || (from && to) || d <= from) { setFrom(d); setTo(''); }
    else setTo(d);
  };

  async function submit() {
    setBusy(true); setError('');
    try {
      const r = await authJson<{ id: string }>('/reservations', { method: 'POST', body: JSON.stringify({ propertyId, kind, checkIn: from || undefined, checkOut: kind === 'NIGHTLY' ? to : undefined, months: kind === 'MONTHLY' ? Number(months) : undefined, guests: kind === 'NIGHTLY' ? Number(guests) : undefined, paymentType: kind === 'SALE' ? paymentType : undefined, note }) });
      router.push(`/panel/reservas/${r.id}?nueva=1`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud.'); }
    finally { setBusy(false); }
  }

  return <section className="reserve-box" id="reservar">
    <h3>{rentOn && saleOn ? 'Reservar o apartar en línea' : rentOn ? 'Reserva en línea' : 'Apartar en línea'}</h3>
    {rentOn && saleOn && <div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'RENT'} className={tab === 'RENT' ? 'selected' : ''} onClick={() => setTab('RENT')}>Rentar</button>
      <button type="button" role="tab" aria-selected={tab === 'SALE'} className={tab === 'SALE' ? 'selected' : ''} onClick={() => setTab('SALE')}>Comprar</button>
    </div>}
    {tab === 'RENT' && s && <>
      <p className="muted">{s.mode === 'NIGHTLY' ? <>Desde <b>{mxn(Number(s.nightPrice))}</b> por noche · mínimo {s.minStay} noche(s){s.maxGuests ? ` · hasta ${s.maxGuests} huéspedes` : ''}</> : <><b>{mxn(Number(s.monthlyRent))}</b> al mes · plazo mínimo {Math.max(1, s.minStay)} mes(es)</>}</p>
      <Calendar busy={data.busy} from={from} to={to} onPick={pick} single={kind !== 'NIGHTLY'} />
      <div className="reserve-fields">
        <div><small>{kind === 'NIGHTLY' ? 'Entrada' : 'Inicio'}</small><b>{from ? fmt(from) : 'Elige en el calendario'}</b></div>
        {kind === 'NIGHTLY' ? <div><small>Salida</small><b>{to ? fmt(to) : from ? 'Elige la salida' : '—'}</b></div>
          : <label>Plazo<select value={months} onChange={e => setMonths(e.target.value)}>{Array.from({ length: Math.min(60, s.maxStay || 24) - Math.max(1, s.minStay) + 1 }, (_, i) => i + Math.max(1, s.minStay)).map(n => <option key={n} value={n}>{n} mes(es)</option>)}</select></label>}
        {kind === 'NIGHTLY' && <label>Huéspedes<input type="number" min="1" max={s.maxGuests || 100} value={guests} onChange={e => setGuests(e.target.value)} /></label>}
      </div>
    </>}
    {tab === 'SALE' && <div className="reserve-fields">
      <label>Forma de pago<select value={paymentType} onChange={e => setPaymentType(e.target.value)}><option value="CONTADO">Contado</option><option value="CREDITO">Crédito bancario</option><option value="INFONAVIT">Infonavit</option><option value="FOVISSSTE">Fovissste</option><option value="OTRO">Otro</option></select></label>
    </div>}
    {qErr && <p className="auth-error">{qErr}</p>}
    {quote && <div className="quote">
      {quote.lines.map(l => <div key={l.label}><span>{l.label}</span><b>{mxn(l.amount)}</b></div>)}
      <div className="quote-total"><span>Total</span><b>{mxn(quote.total)}</b></div>
      {kind === 'MONTHLY' && quote.checkOut && <small className="muted">Contrato hasta el {fmt(quote.checkOut)}. El pago es por transferencia o en persona; se acuerda en el chat.</small>}
      {kind !== 'MONTHLY' && <small className="muted">No se cobra en línea: el pago (y el anticipo para apartar) se hace por transferencia o en persona.</small>}
    </div>}
    {(ready || tab === 'SALE') && <label>Mensaje para el anunciante (opcional)<textarea rows={2} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} /></label>}
    {s?.cancellationPolicy && tab === 'RENT' && <details><summary>Política de cancelación</summary><p>{s.cancellationPolicy}</p></details>}
    {error && <div className="notice" role="alert">{error}</div>}
    {logged ? <button type="button" className="button button-navy full" disabled={busy || !quote || quote.available === false} onClick={submit}>{busy ? 'Enviando…' : tab === 'SALE' ? 'Solicitar apartado' : 'Solicitar reserva'}</button>
      : <Link className="button button-navy full" href={`/acceso?next=${encodeURIComponent(`/propiedades/${slug}#reservar`)}`}>Inicia sesión o crea tu cuenta para reservar</Link>}
    <small className="muted">El agente, la agencia o el administrador revisa tu solicitud y la aprueba. Después acuerdan el pago (transferencia o en persona) desde el chat.</small>
  </section>;
}
