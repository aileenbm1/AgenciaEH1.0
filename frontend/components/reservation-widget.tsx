"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authJson, currentToken, getCurrentUser } from '@/lib/auth';
import { mxn } from '@/lib/data';
import ReservationReview, { ReviewProperty } from './reservation-review';

type Unit = 'NIGHTLY' | 'WEEKLY' | 'MONTHLY';
type Settings = { nearby?: string | null; enabled: boolean; modes: Unit[]; nightPrice: number | null; weekPrice: number | null; monthPrice: number | null; minStay: number; maxStay: number | null; minWeeks: number; maxWeeks: number | null; minMonths: number; maxMonths: number | null; maxGuests: number; deposit: number; taxRate: number;
  cancellationPolicy: string | null; rules: string | null; seasons: { name?: string; from: string; to: string; price: number }[]; saleRequests: boolean; monthlyRent: number | null; salePrice: number | null; operation: string; availability: string };
type Busy = { from: string; to: string; type: string };
type Quote = { lines: { label: string; amount: number }[]; total: number; checkOut?: string; available?: boolean; nights?: number; deposit?: number };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayIso = () => iso(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PAYMENT_LABEL: Record<string, string> = { CONTADO: 'Contado', CREDITO: 'Crédito bancario', INFONAVIT: 'Infonavit', FOVISSSTE: 'Fovissste', OTRO: 'Otro' };
const UNIT_LABEL: Record<Unit, string> = { NIGHTLY: 'Por noche', WEEKLY: 'Por semana', MONTHLY: 'Por mes' };
const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const addDay = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const tomorrowIso = () => addDay(todayIso(), 1);
const shortDay = (d: string) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
const fmt = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Calendario mensual: marca días ocupados y permite elegir entrada/salida. */
function Calendar({ busy, from, to, onPick, single, pickingOut, children }: { busy: Busy[]; from: string; to: string; onPick: (d: string) => void; single: boolean; pickingOut: boolean; children?: React.ReactNode }) {
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
        const taken = isBusy(d), inRange = from && to && d >= from && d < to;
        // Al elegir la salida sí se puede tocar el día en que empieza otra reserva (uno sale y otro entra).
        const outOk = pickingOut && d > from && busy.some(b => b.from === d);
        const past = d < t;
        const sel = d === from || (!single && d === to);
        return <button type="button" key={d} disabled={past || (taken && !outOk)} onClick={() => onPick(d)}
          className={`cal-day${taken ? ' busy' : ''}${inRange ? ' range' : ''}${sel ? ' sel' : ''}`} aria-label={`${d}${taken ? ' (ocupado)' : ''}`}>{Number(d.slice(8))}</button>;
      })())}
    </div>
    <div className="cal-legend"><span><i className="dot busy" /> Ocupado</span><span><i className="dot sel" /> Tu selección</span></div>
    {children}
  </div>;
}

/** Reserva en línea en la ficha (RF-22 a RF-24): renta por noche (tipo Airbnb), por semana o por mes, y apartado de compra. */
export default function ReservationWidget({ propertyId, slug, operation, property }: { propertyId: string; slug: string; operation: 'RENT' | 'SALE' | 'BOTH'; property?: ReviewProperty }) {
  const router = useRouter();
  const [data, setData] = useState<{ settings: Settings; busy: Busy[] } | null>(null);
  const [tab, setTab] = useState<'RENT' | 'SALE'>(operation === 'SALE' ? 'SALE' : 'RENT');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [months, setMonths] = useState('1'); const [weeks, setWeeks] = useState('1'); const [guests, setGuests] = useState('1');
  const [unit, setUnit] = useState<Unit>('NIGHTLY');
  const [paymentType, setPaymentType] = useState('CONTADO'); const [note, setNote] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null); const [qErr, setQErr] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [clash, setClash] = useState('');
  const [review, setReview] = useState(false);
  const [popClosed, setPopClosed] = useState(false);
  useEffect(() => { setPopClosed(false); }, [from, to, weeks, months, guests, unit]);
  const [logged, setLogged] = useState(false);
  // La sesión puede venir solo de la cookie de renovación: se confirma con el servidor.
  useEffect(() => { if (currentToken()) setLogged(true); else getCurrentUser().then(u => setLogged(!!u)).catch(() => {}); }, []);
  useEffect(() => { fetch(`/api/v1/reservations/calendar/${propertyId}`).then(r => r.ok ? r.json() : null).then(setData).catch(() => {}); }, [propertyId]);
  const s = data?.settings;
  const rentOn = !!s?.enabled && (operation === 'RENT' || operation === 'BOTH');
  const saleOn = !!s?.saleRequests && (operation === 'SALE' || operation === 'BOTH') && s?.availability === 'AVAILABLE';
  useEffect(() => { if (s && !rentOn && saleOn) setTab('SALE'); }, [s, rentOn, saleOn]);
  // Al cargar: primera modalidad disponible y plazos mínimos.
  useEffect(() => { if (!s) return; setUnit(s.modes[0] || 'MONTHLY'); setWeeks(String(s.minWeeks || 1)); setMonths(String(s.minMonths || 1)); }, [s]);

  const kind = tab === 'SALE' ? 'SALE' : unit;
  const ready = kind === 'SALE' || (kind === 'NIGHTLY' ? !!(from && to) : !!from);
  useEffect(() => {
    setQuote(null); setQErr('');
    if (!ready || !s) return;
    const body = { propertyId, kind, checkIn: from || undefined, checkOut: kind === 'NIGHTLY' ? to : undefined, weeks: kind === 'WEEKLY' ? Number(weeks) : undefined, months: kind === 'MONTHLY' ? Number(months) : undefined, guests: kind === 'SALE' ? undefined : Number(guests) };
    const t = setTimeout(() => fetch('/api/v1/reservations/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(Array.isArray(d.message) ? d.message.join(' ') : d.message); setQuote(d); })
      .catch(e => setQErr(e.message)), 250);
    return () => clearTimeout(t);
  }, [ready, kind, from, to, weeks, months, guests, propertyId, s]);

  if (!data || (!rentOn && !saleOn)) return null;
  const pick = (d: string) => {
    setClash('');
    if (kind !== 'NIGHTLY') { setFrom(d); return; }
    if (!from || (from && to) || d <= from) { setFrom(d); setTo(''); return; }
    // No se puede elegir un rango que pase por encima de días ocupados.
    const hit = data!.busy.find(b => from < b.to && b.from < d);
    if (hit) { setClash(`Entre esas fechas hay días ocupados (del ${fmt(hit.from)} al ${fmt(hit.to)}). Elige una salida anterior u otras fechas.`); return; }
    setTo(d);
  };

  async function submit() {
    setBusy(true); setError('');
    try {
      const r = await authJson<{ id: string }>('/reservations', { method: 'POST', body: JSON.stringify({ propertyId, kind, checkIn: from || undefined, checkOut: kind === 'NIGHTLY' ? to : undefined, weeks: kind === 'WEEKLY' ? Number(weeks) : undefined, months: kind === 'MONTHLY' ? Number(months) : undefined, guests: kind === 'SALE' ? undefined : Number(guests), paymentType: kind === 'SALE' ? paymentType : undefined, note }) });
      router.push(`/panel/reservas/${r.id}?nueva=1`);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar la solicitud.'); }
    finally { setBusy(false); }
  }

  return <section className={`reserve-box${tab === 'RENT' ? ' has-cal' : ''}`} id="reservar">
    <h3>{rentOn && saleOn ? 'Reservar o apartar en línea' : rentOn ? 'Reserva en línea' : 'Apartar en línea'}</h3>
    {rentOn && saleOn && <div className="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'RENT'} className={tab === 'RENT' ? 'selected' : ''} onClick={() => setTab('RENT')}>Rentar</button>
      <button type="button" role="tab" aria-selected={tab === 'SALE'} className={tab === 'SALE' ? 'selected' : ''} onClick={() => setTab('SALE')}>Comprar</button>
    </div>}
    {tab === 'RENT' && s && <>
      {s.modes.length > 1 && <div className="unit-tabs" role="tablist" aria-label="Modalidad de renta">{s.modes.map(m =>
        <button key={m} type="button" role="tab" aria-selected={unit === m} className={unit === m ? 'selected' : ''} onClick={() => { setUnit(m); setTo(''); }}>
          {UNIT_LABEL[m]}<small>{mxn(Number(m === 'NIGHTLY' ? s.nightPrice : m === 'WEEKLY' ? s.weekPrice : s.monthPrice))}</small></button>)}</div>}
      <p className="muted">{unit === 'NIGHTLY' ? <>Desde <b>{mxn(Number(s.nightPrice))}</b> por noche · mínimo {s.minStay} noche(s){` · hasta ${s.maxGuests} huéspedes`}</>
        : unit === 'WEEKLY' ? <><b>{mxn(Number(s.weekPrice))}</b> por semana · mínimo {s.minWeeks} semana(s)</>
        : <><b>{mxn(Number(s.monthPrice))}</b> al mes · plazo mínimo {s.minMonths} mes(es)</>}</p>
      <Calendar busy={data.busy} from={from} to={kind === 'NIGHTLY' ? to : quote?.checkOut || ''} onPick={pick} single={kind !== 'NIGHTLY'} pickingOut={kind === 'NIGHTLY' && !!from && !to}>
        {ready && !popClosed && <div className="cal-pop" role="dialog" aria-label="Tu selección">
          <button type="button" className="cal-pop-x" onClick={() => setPopClosed(true)} aria-label="Cerrar">✕</button>
          <div className="cal-pop-top"><div><b>{shortDay(from)} → {kind === 'NIGHTLY' ? shortDay(to) : quote?.checkOut ? shortDay(quote.checkOut) : '…'}</b>
            <small>{kind === 'NIGHTLY' ? `${quote?.nights ?? '…'} ${quote?.nights === 1 ? 'noche' : 'noches'}` : kind === 'WEEKLY' ? `${weeks} ${weeks === '1' ? 'semana' : 'semanas'}` : `${months} ${months === '1' ? 'mes' : 'meses'}`} · {guests} {guests === '1' ? 'persona' : 'personas'}</small></div>
            {quote && quote.available !== false && <span className="cal-pop-total">{mxn(quote.total)}</span>}</div>
          {(qErr || quote?.available === false) ? <p className="cal-pop-err">{qErr || 'Esas fechas chocan con días ocupados. Elige otras.'}</p> : !quote && <p className="cal-pop-err muted">Calculando el total…</p>}
          <div className="cal-pop-acts">
            <button type="button" className="clear" onClick={() => { setFrom(''); setTo(''); }}>Borrar fechas</button>
            <button type="button" className="go" disabled={!quote || quote.available === false} onClick={() => { setError(''); setReview(true); }}>Ver detalles y reservar</button>
          </div>
        </div>}
      </Calendar>
      <div className="reserve-fields">
        <div><small>{kind === 'NIGHTLY' ? 'Entrada' : 'Inicio'}</small><b>{from ? fmt(from) : 'Elige en el calendario'}</b></div>
        {kind === 'NIGHTLY' && <div><small>Salida</small><b>{to ? fmt(to) : from ? 'Elige la salida' : '—'}</b></div>}
        {kind === 'WEEKLY' && <label>Semanas<select value={weeks} onChange={e => setWeeks(e.target.value)}>{range(s.minWeeks || 1, Math.min(52, s.maxWeeks || 12)).map(n => <option key={n} value={n}>{n} semana(s)</option>)}</select></label>}
        {kind === 'MONTHLY' && <label>Plazo<select value={months} onChange={e => setMonths(e.target.value)}>{range(s.minMonths || 1, Math.min(60, s.maxMonths || 24)).map(n => <option key={n} value={n}>{n} mes(es)</option>)}</select></label>}
        <label>{kind === 'MONTHLY' ? 'Personas que vivirán' : 'Huéspedes'}<select value={Math.min(Number(guests) || 1, s.maxGuests)} onChange={e => setGuests(e.target.value)}>{range(1, s.maxGuests).map(n => <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>)}</select>
          <small className="muted">Máximo {s.maxGuests}</small></label>
      </div>
    </>}
    {tab === 'SALE' && <div className="reserve-fields">
      <label>Forma de pago<select value={paymentType} onChange={e => setPaymentType(e.target.value)}><option value="CONTADO">Contado</option><option value="CREDITO">Crédito bancario</option><option value="INFONAVIT">Infonavit</option><option value="FOVISSSTE">Fovissste</option><option value="OTRO">Otro</option></select></label>
    </div>}
    {clash && <p className="auth-error" role="alert">{clash}</p>}
    {qErr && <p className="auth-error">{qErr}</p>}
    {quote?.available === false && (() => {
      const hit = quote.checkOut ? data.busy.find(b => from < b.to && b.from < quote.checkOut!) : null;
      return <p className="auth-error" role="alert">Esas fechas chocan con días ya ocupados{hit ? ` (del ${fmt(hit.from)} al ${fmt(hit.to)})` : ''}. Elige otro inicio{kind !== 'NIGHTLY' ? ' o un plazo más corto' : ''}.</p>;
    })()}
    {tab === 'SALE' && quote && <div className="quote">
      {quote.lines.map(l => <div key={l.label}><span>{l.label}</span><b>{mxn(l.amount)}</b></div>)}
    </div>}
    {error && !review && <div className="notice" role="alert">{error}</div>}
    {tab === 'RENT' && !ready && <p className="muted small reserve-hint">Elige tus fechas en el calendario para ver el total y reservar.</p>}
    {tab === 'RENT' && ready && popClosed && quote && quote.available !== false && <button type="button" className="button button-navy full" onClick={() => { setError(''); setReview(true); }}>Ver detalles y reservar · {mxn(quote.total)}</button>}
    {tab === 'SALE' && <button type="button" className="button button-navy full" disabled={!quote} onClick={() => { setError(''); setReview(true); }}>Ver detalles y solicitar apartado</button>}
    {review && quote && <ReservationReview property={property || { title: 'Propiedad', place: '' }} kind={kind} from={from} to={kind === 'NIGHTLY' ? to : quote.checkOut}
      nights={kind === 'NIGHTLY' ? quote.nights : undefined} weeks={kind === 'WEEKLY' ? Number(weeks) : undefined} months={kind === 'MONTHLY' ? Number(months) : undefined} guests={kind === 'SALE' ? undefined : Number(guests)}
      paymentLabel={kind === 'SALE' ? PAYMENT_LABEL[paymentType] : undefined} total={quote.total} deposit={Number(quote.deposit || 0)}
      rules={tab === 'RENT' ? s?.rules || null : null} nearby={s?.nearby || null} cancellationPolicy={tab === 'RENT' ? s?.cancellationPolicy || null : null}
      lines={quote.lines} note={note} onNote={setNote} logged={logged} loginHref={`/acceso?next=${encodeURIComponent(`/propiedades/${slug}#reservar`)}`}
      busy={busy} error={error} onClose={() => setReview(false)} onConfirm={submit} />}
  </section>;
}
