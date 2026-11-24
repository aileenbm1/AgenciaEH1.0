"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { mxn } from '@/lib/data';

const OsmMap = dynamic(() => import('./osm-map'), { ssr: false, loading: () => <div className="rv-map-empty" style={{ height: 230 }}>Cargando mapa…</div> });

import type { ReviewProperty } from '@/lib/reservations';
export type { ReviewProperty };
type Props = {
  property: ReviewProperty;
  kind: 'NIGHTLY' | 'WEEKLY' | 'MONTHLY' | 'SALE';
  from: string; to?: string; nights?: number; weeks?: number; months?: number; guests?: number; paymentLabel?: string;
  total: number; deposit: number; rules: string | null; nearby: string | null; cancellationPolicy: string | null;
  busy: boolean; error: string; onClose: () => void; onConfirm: () => void;
};

const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const addDay = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
/** Fecha de hoy en México (las reglas de cancelación y pago se calculan con la hora de México). */
const todayMx = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const ICONS: [RegExp, string][] = [[/fiesta|evento|reuni/i, '🎉'], [/fum/i, '🚭'], [/mascota/i, '🐾'], [/silencio|ruido/i, '🤫'], [/daño|desperfecto/i, '🛠'], [/pago|liquida/i, '💳'],
  [/entrada|salida|check|hora/i, '🕒'], [/persona|huésped|visita/i, '👥'], [/limpi|basura/i, '🧹'], [/llave|cerradura/i, '🔑'], [/estacion|auto|coche/i, '🚗'], [/alberca|piscina/i, '🏊']];
const icon = (r: string) => ICONS.find(([re]) => re.test(r))?.[1] || '•';
const lines = (s: string | null) => String(s || '').split(/\n+/).map(x => x.trim()).filter(Boolean);

/** Ventana para revisar ubicación, reglas, cancelación y pagos antes de enviar la solicitud. */
export default function ReservationReview(p: Props) {
  const [ok, setOk] = useState(false);
  const [active, setActive] = useState('ubicacion');
  const body = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // Bloquea el scroll de la página, cierra con Esc y lleva el foco a la ventana.
  const latest = useRef(p); latest.current = p;
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !latest.current.busy) latest.current.onClose(); };
    window.addEventListener('keydown', k); box.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, []);

  const rules = lines(p.rules), nearby = lines(p.nearby);
  const sale = p.kind === 'SALE', shortStay = p.kind === 'NIGHTLY' || p.kind === 'WEEKLY';
  const today = todayMx();
  const noCancel = !sale && !!p.from && p.from <= addDay(today, 1);
  // Último momento para cancelar: 24 h después de enviar la solicitud y siempre antes del día de entrada.
  const in24 = new Date(Date.now() + 864e5);
  const checkInStart = p.from && !sale ? new Date(p.from + 'T00:00:00-06:00') : null;
  const until = checkInStart && checkInStart < in24 ? checkInStart : in24;
  const untilText = until.toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Mexico_City' });
  const payBy = shortStay && p.from ? addDay(p.from, -1) : '';
  const dates = sale ? 'Apartado de compra' : p.kind === 'NIGHTLY' ? `${day(p.from)} → ${p.to ? day(p.to) : ''}` : `${p.kind === 'MONTHLY' ? 'Inicio' : 'Del'} ${day(p.from)}${p.to ? ` → ${day(p.to)}` : ''}`;
  const length = p.kind === 'NIGHTLY' ? `${p.nights} ${p.nights === 1 ? 'noche' : 'noches'}` : p.kind === 'WEEKLY' ? `${p.weeks} ${p.weeks === 1 ? 'semana' : 'semanas'}` : p.kind === 'MONTHLY' ? `${p.months} ${p.months === 1 ? 'mes' : 'meses'}` : p.paymentLabel || '';
  const go = (id: string) => { setActive(id); const el = body.current?.querySelector(`#rv-${id}`) as HTMLElement | null; if (el && body.current) body.current.scrollTo({ top: el.offsetTop - 8, behavior: 'smooth' }); };
  const tabs: [string, string][] = [['ubicacion', '📍 Ubicación'], ...(rules.length ? [['reglas', '📋 Reglas'] as [string, string]] : []), ['cancelacion', '↩️ Cancelación'], ['pagos', '💳 Pagos']];

  return <div className="rv-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !p.busy) p.onClose(); }}>
    <div className="rv" role="dialog" aria-modal="true" aria-labelledby="rv-title" tabIndex={-1} ref={box}>
      <div className="rv-handle" aria-hidden />
      <div className="rv-head">
        {p.property.image && <img src={p.property.image} alt="" />}
        <div><h2 id="rv-title">Revisa antes de enviar tu solicitud</h2><p>{p.property.title} · {p.property.place}</p></div>
        <button type="button" className="rv-x" onClick={p.onClose} disabled={p.busy} aria-label="Cerrar">✕</button>
      </div>
      <div className="rv-trip">
        <span className="rv-chip">📅 <b>{dates}</b></span>
        {length && <span className="rv-chip">{sale ? '💼' : '🌙'} <b>{length}</b></span>}
        {!!p.guests && <span className="rv-chip">👥 <b>{p.guests} {p.guests === 1 ? 'persona' : 'personas'}</b></span>}
        <span className="rv-chip total">Total <b>{mxn(p.total)}</b></span>
      </div>
      <div className="rv-tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={active === k} className={active === k ? 'on' : ''} onClick={() => go(k)}>{l}</button>)}</div>
      <div className="rv-body" ref={body}>
        <div className="rv-col">
          <section className="rv-sec" id="rv-ubicacion"><h3><span className="ic">📍</span>Ubicación</h3>
            {p.property.lat != null && p.property.lng != null
              ? <div className="rv-map"><OsmMap height={230} points={[{ lat: Number(p.property.lat), lng: Number(p.property.lng), title: p.property.title, approx: !p.property.exact }]} />
                <span className="rv-maptag"><b>{p.property.place}</b></span>
                <a className="rv-mapbtn" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${p.property.lat}&mlon=${p.property.lng}#map=${p.property.exact ? 17 : 14}/${p.property.lat}/${p.property.lng}`}>⤢ Ampliar mapa</a></div>
              : <div className="rv-map-empty">📍 {p.property.place}</div>}
            {nearby.length > 0 && <ul className="rv-near">{nearby.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            <p className="rv-note">{p.property.exact ? 'Ubicación indicada por el anunciante.' : 'Zona aproximada.'} La dirección exacta y las indicaciones de llegada se comparten en el chat cuando el anunciante aprueba tu solicitud.</p>
          </section>
          <section className="rv-sec" id="rv-pagos"><h3><span className="ic">💳</span>Pagos (no se cobra en línea)</h3>
            <div className="rv-pay">
              <div className="hi"><span>{sale ? 'Anticipo para apartar' : 'Anticipo para apartar tus fechas'}: el anunciante te indica el monto al aprobar · transferencia o efectivo</span></div>
              {shortStay && payBy && <div><span>Liquida el total a más tardar el <b>{day(payBy)}</b> (un día antes de llegar). Puedes pagar en abonos.</span><b>{mxn(p.total)}</b></div>}
              {p.kind === 'MONTHLY' && <div><span>Las rentas mensuales y el contrato se acuerdan en el chat con el anunciante.</span><b>{mxn(p.total)}</b></div>}
              {sale && <div><span>Precio de la propiedad · {p.paymentLabel}</span><b>{mxn(p.total)}</b></div>}
              {p.deposit > 0 && !sale && <div><span>Incluye depósito en garantía (se devuelve si no hay daños)</span><b>{mxn(p.deposit)}</b></div>}
            </div>
            {shortStay && <p className="rv-note">Te enviaremos recordatorios por correo 3 días antes y el día límite de pago.</p>}
          </section>
        </div>
        <div className="rv-col">
          {rules.length > 0 && <section className="rv-sec" id="rv-reglas"><h3><span className="ic">📋</span>Reglas de la casa</h3>
            <ul className="rv-rules">{rules.map((r, i) => <li key={i}><span aria-hidden>{icon(r)}</span>{r}</li>)}</ul></section>}
          <section className="rv-sec" id="rv-cancelacion"><h3><span className="ic">↩️</span>Política de cancelación</h3>
            {noCancel
              ? <div className="rv-alert strong">⚠ Estás reservando con un día o menos de anticipación: <b>esta reserva no se podrá cancelar</b>.</div>
              : <><div className="rv-tl">
                <div><b>Hoy · envías tu solicitud</b><small>Puedes cancelar sin costo desde tu panel.</small></div>
                <div><b>Hasta el {untilText}</b><small>Último momento para cancelar (24 horas después de enviar la solicitud{sale ? '' : ' y siempre antes del día de llegada'}).</small></div>
                <div className="no"><b>Después de esa hora</b><small>Ya no es posible cancelar.</small></div>
              </div>
                {!sale && <div className="rv-alert">⚠ Si reservas para hoy o mañana (1 día o menos de anticipación), no hay cancelación.</div>}</>}
            {p.cancellationPolicy && <p className="rv-note"><b>Nota del anunciante:</b> {p.cancellationPolicy}</p>}
          </section>
        </div>
      </div>
      <div className="rv-foot">
        {p.error && <div className="notice rv-error" role="alert">{p.error}</div>}
        <label><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> He leído {rules.length ? 'las reglas de la casa, ' : ''}la política de cancelación y las condiciones de pago.</label>
        <button type="button" className="button button-ghost" onClick={p.onClose} disabled={p.busy}>{sale ? 'Volver' : 'Cambiar fechas'}</button>
        <button type="button" className="button button-navy" onClick={p.onConfirm} disabled={!ok || p.busy}>{p.busy ? 'Enviando…' : 'Enviar solicitud'}</button>
      </div>
    </div>
  </div>;
}
