"use client";
import { FormEvent, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';

type Season = { name?: string; from: string; to: string; price: number | string };
type Unit = 'NIGHTLY' | 'WEEKLY' | 'MONTHLY';
type Settings = { enabled: boolean; modes: Unit[]; nightPrice: number | null; weekPrice: number | string | null; monthPrice: number | string | null; minStay: number; maxStay: number | null; minWeeks: number; maxWeeks: number | null; minMonths: number; maxMonths: number | null; maxGuests: number | null; deposit: number; taxRate: number; cancellationPolicy: string | null; seasons: Season[]; saleRequests: boolean; monthlyRent: number | null };
type Range = { id?: string; from: string; to: string; type: 'RESERVED' | 'BLOCKED'; reason?: string | null };

const fmt = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Reservas en línea por propiedad (RF-21, RF-27): por noche, semana y/o mes, precios, temporadas, política y fechas bloqueadas. */
export default function RentalSettings({ propertyId, operation }: { propertyId: string; operation: 'RENT' | 'SALE' | 'BOTH' }) {
  const [s, setS] = useState<Settings | null>(null);
  const [ranges, setRanges] = useState<Range[]>([]);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState({ from: '', to: '', reason: '' });
  const rentable = operation !== 'SALE', sellable = operation !== 'RENT';

  useEffect(() => {
    authJson<Settings>(`/reservations/settings/${propertyId}`).then(setS).catch(e => setErr(e.message));
    authJson<Range[]>(`/reservations/blocks/${propertyId}`).then(setRanges).catch(() => {});
  }, [propertyId]);
  if (!s) return <p className="muted">{err || 'Cargando…'}</p>;
  const set = (k: keyof Settings, v: unknown) => setS({ ...s, [k]: v });
  const setSeason = (i: number, k: keyof Season, v: string) => set('seasons', s.seasons.map((x, j) => j === i ? { ...x, [k]: v } : x));

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try {
      setS(await authJson<Settings>(`/reservations/settings/${propertyId}`, { method: 'PUT', body: JSON.stringify({ ...s, seasons: s!.seasons.map(x => ({ ...x, price: Number(x.price) })) }) }));
      setMsg('Configuración guardada.');
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  }
  async function addBlock(e: FormEvent) {
    e.preventDefault(); setErr('');
    try { setRanges(await authJson<Range[]>(`/reservations/blocks/${propertyId}`, { method: 'POST', body: JSON.stringify({ ...block, to: block.to || block.from }) })); setBlock({ from: '', to: '', reason: '' }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo bloquear.'); }
  }
  async function removeBlock(id: string) {
    try { setRanges(await authJson<Range[]>(`/reservations/blocks/item/${id}`, { method: 'DELETE' })); } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo quitar.'); }
  }

  return <div className="rental-settings">
    <form onSubmit={save} className="form-grid">
      {rentable && <>
        <label className="check wide"><input type="checkbox" checked={s.enabled} onChange={e => set('enabled', e.target.checked)} /> Aceptar reservas de renta en línea</label>
        {s.enabled && <>
          <div className="wide unit-config">
            <b>Modalidades que aceptas</b> <small className="muted">(puedes activar varias; el interesado elige al reservar)</small>
            {([['NIGHTLY', 'Por noche', 'Estancias cortas tipo Airbnb, con temporadas.'], ['WEEKLY', 'Por semana', 'Precio fijo por cada 7 noches.'], ['MONTHLY', 'Por mes', 'Contrato por meses.']] as [Unit, string, string][]).map(([m, l, h]) => {
              const on = s.modes.includes(m);
              return <div key={m} className={`unit-row${on ? ' on' : ''}`}>
                <label className="check"><input type="checkbox" checked={on} onChange={e => set('modes', e.target.checked ? [...s.modes, m] : s.modes.filter(x => x !== m))} /> <b>{l}</b> <small className="muted">{h}</small></label>
                {on && m === 'NIGHTLY' && <div className="form-grid">
                  <label>Precio por noche (MXN)<input type="number" min="1" required value={s.nightPrice ?? ''} onChange={e => set('nightPrice', e.target.value)} /></label>
                  <label>Noches mínimas<input type="number" min="1" value={s.minStay} onChange={e => set('minStay', e.target.value)} /></label>
                  <label>Noches máximas (opcional)<input type="number" min="1" value={s.maxStay ?? ''} onChange={e => set('maxStay', e.target.value)} /></label>
                </div>}
                {on && m === 'WEEKLY' && <div className="form-grid">
                  <label>Precio por semana (MXN)<input type="number" min="1" required value={s.weekPrice ?? ''} onChange={e => set('weekPrice', e.target.value)} /></label>
                  <label>Semanas mínimas<input type="number" min="1" max="52" value={s.minWeeks} onChange={e => set('minWeeks', e.target.value)} /></label>
                  <label>Semanas máximas (opcional)<input type="number" min="1" max="52" value={s.maxWeeks ?? ''} onChange={e => set('maxWeeks', e.target.value)} /></label>
                </div>}
                {on && m === 'MONTHLY' && <div className="form-grid">
                  <label>Precio por mes (MXN)<input type="number" min="1" value={s.monthPrice ?? ''} placeholder={s.monthlyRent ? String(s.monthlyRent) : ''} onChange={e => set('monthPrice', e.target.value)} /></label>
                  <label>Meses mínimos<input type="number" min="1" max="60" value={s.minMonths} onChange={e => set('minMonths', e.target.value)} /></label>
                  <label>Meses máximos (opcional)<input type="number" min="1" max="60" value={s.maxMonths ?? ''} onChange={e => set('maxMonths', e.target.value)} /></label>
                </div>}
              </div>;
            })}
          </div>
          {(s.modes.includes('NIGHTLY') || s.modes.includes('WEEKLY')) && <label>Huéspedes máximos (opcional)<input type="number" min="1" max="100" value={s.maxGuests ?? ''} onChange={e => set('maxGuests', e.target.value)} /></label>}
          <label>Depósito de garantía (MXN)<input type="number" min="0" value={s.deposit} onChange={e => set('deposit', e.target.value)} /></label>
          <label>Impuestos (%)<input type="number" min="0" max="50" step="0.01" value={s.taxRate} onChange={e => set('taxRate', e.target.value)} /></label>
          <label className="wide">Política de cancelación<textarea rows={2} maxLength={1000} value={s.cancellationPolicy || ''} onChange={e => set('cancellationPolicy', e.target.value)} placeholder="Ej.: Cancelación gratuita hasta 7 días antes; después se retiene el anticipo." /></label>
          {s.modes.includes('NIGHTLY') && <div className="wide">
            <b>Temporadas (precio por noche distinto)</b>
            {s.seasons.map((x, i) => <div className="season-row" key={i}>
              <input aria-label="Nombre" placeholder="Nombre (ej. Semana Santa)" value={x.name || ''} onChange={e => setSeason(i, 'name', e.target.value)} />
              <input aria-label="Desde" type="date" value={x.from} onChange={e => setSeason(i, 'from', e.target.value)} />
              <input aria-label="Hasta" type="date" value={x.to} onChange={e => setSeason(i, 'to', e.target.value)} />
              <input aria-label="Precio por noche" type="number" min="1" placeholder="$ / noche" value={x.price} onChange={e => setSeason(i, 'price', e.target.value)} />
              <button type="button" className="button button-ghost" onClick={() => set('seasons', s.seasons.filter((_, j) => j !== i))}>Quitar</button>
            </div>)}
            {s.seasons.length < 20 && <button type="button" className="inline-link" onClick={() => set('seasons', [...s.seasons, { name: '', from: '', to: '', price: '' }])}>+ Agregar temporada</button>}
          </div>}
        </>}
      </>}
      {sellable && <label className="check wide"><input type="checkbox" checked={s.saleRequests} onChange={e => set('saleRequests', e.target.checked)} /> Aceptar solicitudes de apartado de compra en línea</label>}
      {err && <div className="notice wide" role="alert">{err}</div>}
      {msg && <div className="notice ok wide" role="status">{msg}</div>}
      <div className="wide"><button className="button button-navy" disabled={busy}>{busy ? 'Guardando…' : 'Guardar configuración'}</button></div>
    </form>

    {rentable && <div className="blocks">
      <h4>Calendario: fechas ocupadas y bloqueadas</h4>
      <p className="muted">Bloquea días en que no se puede rentar (mantenimiento, uso propio, rentas por fuera). Las reservas aprobadas se marcan solas.</p>
      {ranges.length === 0 ? <p className="muted">No hay fechas ocupadas.</p> : <ul className="block-list">{ranges.map((r, i) => <li key={r.id || i}>
        <i className={`status-pill ${r.type === 'BLOCKED' ? 'neutral' : 'ok'}`}>{r.type === 'BLOCKED' ? 'Bloqueado' : 'Reservado'}</i>
        {fmt(r.from)} → {fmt(r.to)}{r.reason ? ` · ${r.reason}` : ''}
        {r.type === 'BLOCKED' && r.id && <button type="button" className="inline-link" onClick={() => removeBlock(r.id!)}>Quitar</button>}
      </li>)}</ul>}
      <form onSubmit={addBlock} className="season-row">
        <input aria-label="Desde" type="date" required value={block.from} onChange={e => setBlock({ ...block, from: e.target.value })} />
        <input aria-label="Hasta" type="date" value={block.to} min={block.from} onChange={e => setBlock({ ...block, to: e.target.value })} />
        <input aria-label="Motivo" placeholder="Motivo (opcional)" maxLength={200} value={block.reason} onChange={e => setBlock({ ...block, reason: e.target.value })} />
        <button className="button button-outline">Bloquear</button>
      </form>
    </div>}
  </div>;
}
