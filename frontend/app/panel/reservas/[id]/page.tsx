"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedPanel from '@/components/protected-panel';
import { authFetch, authJson, SessionUser } from '@/lib/auth';
import { mxn } from '@/lib/data';
import { fmtDay, fmtWhen, PAY_METHOD, PAY_TYPE, RES_KIND, RES_STATUS, ResRow } from '@/lib/reservations';

type Detail = ResRow & {
  viewer: { isGuest: boolean; isManager: boolean }; cancellationPolicy: string | null;
  messages: { id: string; fullName: string; body: string; createdAt: string; mine: boolean }[];
  documents: { id: string; kind: string | null; fileName: string; mime: string; size: number; createdAt: string; uploadedBy: string; mine: boolean }[];
};
const DOC_KINDS = ['Identificación', 'Comprobante de ingresos', 'Comprobante de domicilio', 'Contrato', 'Comprobante de pago', 'Otro'];
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function ReservationDetail({ user }: { user: SessionUser }) {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Detail | null>(null);
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'' | 'approve' | 'reject' | 'schedule' | 'deposit' | 'complete' | 'cancel'>('');
  const [f, setF] = useState<Record<string, string>>({});
  const [text, setText] = useState(''); const [docKind, setDocKind] = useState(DOC_KINDS[0]);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setR(await authJson<Detail>(`/reservations/${id}`)); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la reserva.'); }
  }, [id]);
  useEffect(() => { load(); if (new URLSearchParams(window.location.search).has('nueva')) setOk('¡Solicitud enviada! El anunciante la revisará y te avisaremos por correo. Puedes escribirle aquí mismo.'); }, [load]);
  useEffect(() => { const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [r?.messages.length]);

  async function run(fn: () => Promise<Detail>, done: string) {
    setBusy(true); setError(''); setOk('');
    try { setR(await fn()); setOk(done); setForm(''); setF({}); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar.'); } finally { setBusy(false); }
  }
  const act = (action: string, extra: Record<string, unknown>, done: string) => run(() => authJson<Detail>(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) }), done);
  function submitForm(e: FormEvent) {
    e.preventDefault();
    if (form === 'approve') act('approve', { advanceRequired: f.advance ? Number(f.advance) : undefined, note: f.note }, 'Solicitud aprobada. Agenda la cita de pago.');
    if (form === 'reject') act('reject', { note: f.note }, 'Solicitud rechazada.');
    if (form === 'cancel') act('cancel', { note: f.note }, 'Reserva cancelada.');
    if (form === 'schedule') act('schedule', { appointmentAt: new Date(f.at).toISOString(), place: f.place }, 'Cita agendada; avisamos por correo.');
    if (form === 'deposit') act('deposit', { amount: Number(f.amount), method: f.method || 'CASH', notes: f.notes }, 'Anticipo registrado: la reserva queda apartada.');
    if (form === 'complete') act('complete', { amount: Number(f.amount), method: f.method || 'CASH', notes: f.notes }, 'Pago registrado: operación cerrada.');
  }
  async function send(e: FormEvent) {
    e.preventDefault(); if (!text.trim()) return;
    await run(() => authJson<Detail>(`/reservations/${id}/messages`, { method: 'POST', body: JSON.stringify({ body: text }) }), '');
    setText('');
  }
  async function upload(e: FormEvent) {
    e.preventDefault(); const file = fileRef.current?.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('El archivo pesa más de 10 MB.'); return; }
    const fd = new FormData(); fd.append('file', file); fd.append('kind', docKind);
    await run(async () => { const res = await authFetch(`/reservations/${id}/documents`, { method: 'POST', body: fd }); const d = await res.json(); if (!res.ok) throw new Error(Array.isArray(d.message) ? d.message.join(' ') : d.message); return d; }, 'Documento subido.');
    if (fileRef.current) fileRef.current.value = '';
  }
  async function download(docId: string, name: string) {
    const res = await authFetch(`/reservations/${id}/documents/${docId}`);
    if (!res.ok) { setError('No se pudo descargar el documento.'); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  if (!r) return <main className="page-wrap"><p className="muted">{error || 'Cargando…'}</p></main>;
  const st = RES_STATUS[r.status] || { label: r.status, tone: 'neutral' as const };
  const { isGuest, isManager } = r.viewer;
  const open = ['PENDING', 'APPROVED', 'DEPOSIT_PAID'].includes(r.status);
  const closed = ['REJECTED', 'CANCELLED'].includes(r.status);
  const steps = [
    { t: 'Solicitada', done: true, at: fmtWhen(r.createdAt) },
    { t: 'Aprobada', done: ['APPROVED', 'DEPOSIT_PAID', 'COMPLETED'].includes(r.status) },
    { t: 'Cita de pago', done: !!r.appointmentAt, at: r.appointmentAt ? fmtWhen(r.appointmentAt) : undefined },
    { t: 'Apartada (anticipo)', done: !!r.advancePaidAt, at: r.advancePaidAt ? fmtWhen(r.advancePaidAt) : undefined },
    { t: 'Pagada / cerrada', done: r.status === 'COMPLETED', at: r.paidAt ? fmtWhen(r.paidAt) : undefined },
  ];
  const other = isGuest ? r.owner : r.guest;

  return <main className="page-wrap">
    <Link href="/panel/reservas" className="back-link">← Volver a reservas</Link>
    <div className="page-heading panel-heading"><div>
      <span className="eyebrow">{RES_KIND[r.kind].toUpperCase()}</span>
      <h1>{r.property.title}</h1>
      <p><i className={`status-pill ${st.tone}`}>{st.label}</i> <Link className="inline-link" href={`/propiedades/${r.property.slug}`}>Ver propiedad</Link></p>
    </div></div>
    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    {!closed ? <ol className="res-timeline">{steps.map(s => <li key={s.t} className={s.done ? 'done' : ''}><b>{s.t}</b>{s.at && <small>{s.at}</small>}</li>)}</ol>
      : <div className="notice">Esta reserva está {st.label.toLowerCase()}.{r.ownerNote ? ` Nota: ${r.ownerNote}` : ''}</div>}

    <div className="res-detail">
      <div>
        <section className="dashboard-card"><h3>Detalle</h3>
          <dl className="facts">
            {r.kind === 'NIGHTLY' && <><div><dt>Entrada</dt><dd>{fmtDay(r.checkIn)}</dd></div><div><dt>Salida</dt><dd>{fmtDay(r.checkOut)}</dd></div><div><dt>Noches</dt><dd>{r.nights}</dd></div><div><dt>Huéspedes</dt><dd>{r.guests ?? '—'}</dd></div></>}
            {r.kind === 'MONTHLY' && <><div><dt>Inicio</dt><dd>{fmtDay(r.checkIn)}</dd></div><div><dt>Fin de contrato</dt><dd>{fmtDay(r.checkOut)}</dd></div><div><dt>Plazo</dt><dd>{r.months} mes(es)</dd></div></>}
            {r.kind === 'SALE' && <div><dt>Forma de pago</dt><dd>{PAY_TYPE[r.paymentType || ''] || '—'}</dd></div>}
            <div><dt>Subtotal</dt><dd>{mxn(r.subtotal)}</dd></div>
            {r.taxes > 0 && <div><dt>Impuestos</dt><dd>{mxn(r.taxes)}</dd></div>}
            {r.deposit > 0 && <div><dt>Depósito</dt><dd>{mxn(r.deposit)}</dd></div>}
            <div><dt>Total</dt><dd><b>{mxn(r.total)}</b></dd></div>
            {r.advanceRequired != null && <div><dt>Anticipo para apartar</dt><dd>{mxn(r.advanceRequired)}</dd></div>}
            {r.advanceAmount != null && <div><dt>Anticipo recibido</dt><dd>{mxn(r.advanceAmount)} · {PAY_METHOD[r.advanceMethod || '']}</dd></div>}
            {r.paidAmount != null && <div><dt>Pago registrado</dt><dd>{mxn(r.paidAmount)} · {PAY_METHOD[r.paidMethod || '']}</dd></div>}
          </dl>
          {r.guestNote && <p><b>Mensaje del interesado:</b> {r.guestNote}</p>}
          {r.ownerNote && !closed && <p><b>Nota del anunciante:</b> {r.ownerNote}</p>}
          {r.paymentNotes && <p className="muted">Notas de pago: {r.paymentNotes}</p>}
          <p className="muted">El pago no se cobra en línea: se entrega en persona en la cita y aquí queda registrado.</p>
        </section>

        <section className="dashboard-card"><h3>Cita de pago</h3>
          {r.appointmentAt ? <p><b>{fmtWhen(r.appointmentAt)}</b><br />{r.appointmentPlace}<br />
            {r.guestConfirmedAt ? <i className="status-pill ok">Confirmada por el interesado</i> : <i className="status-pill warn">Falta confirmar</i>}</p>
            : <p className="muted">{r.status === 'PENDING' ? 'Se agenda cuando la solicitud se apruebe.' : 'Aún no hay cita agendada.'}</p>}
          {isGuest && r.appointmentAt && !r.guestConfirmedAt && open && <button className="button button-navy" disabled={busy} onClick={() => act('confirm', {}, 'Confirmaste la cita.')}>Confirmar asistencia</button>}
        </section>

        <section className="dashboard-card"><h3>{isGuest ? 'Anunciante' : 'Interesado'}</h3>
          <p><b>{other.fullName}</b>{other.phone && <><br />Tel. <a className="inline-link" href={`tel:${other.phone}`}>{other.phone}</a> · <a className="inline-link" target="_blank" rel="noreferrer" href={`https://wa.me/${other.phone.replace(/\D/g, '').replace(/^(\d{10})$/, '52$1')}`}>WhatsApp</a></>}{other.email && <><br /><a className="inline-link" href={`mailto:${other.email}`}>{other.email}</a></>}</p>
          {isGuest && !other.phone && <p className="muted">Los datos de contacto aparecen cuando el anunciante aprueba tu solicitud. Mientras, usa el chat.</p>}
        </section>

        {(isManager || (isGuest && open)) && <section className="dashboard-card"><h3>Acciones</h3>
          <div className="property-actions">
            {isManager && r.status === 'PENDING' && <><button className="button button-navy" onClick={() => setForm('approve')}>Aprobar</button><button className="button button-outline" onClick={() => setForm('reject')}>Rechazar</button></>}
            {isManager && ['APPROVED', 'DEPOSIT_PAID'].includes(r.status) && <button className="button button-outline" onClick={() => { setForm('schedule'); setF({ at: r.appointmentAt ? localInput(new Date(r.appointmentAt)) : '', place: r.appointmentPlace || '' }); }}>{r.appointmentAt ? 'Cambiar cita' : 'Agendar cita de pago'}</button>}
            {isManager && r.status === 'APPROVED' && <button className="button button-navy" onClick={() => { setForm('deposit'); setF({ amount: String(r.advanceRequired || ''), method: 'CASH' }); }}>Registrar anticipo (apartar)</button>}
            {isManager && ['APPROVED', 'DEPOSIT_PAID'].includes(r.status) && <button className="button button-navy" onClick={() => { setForm('complete'); setF({ amount: String(Math.max(0, r.total - (r.advanceAmount || 0))), method: 'CASH' }); }}>Registrar pago y cerrar</button>}
            {isManager && r.status === 'APPROVED' && <button className="button button-ghost" onClick={() => setForm('reject')}>Rechazar</button>}
            {open && (isManager || r.status !== 'DEPOSIT_PAID') && <button className="button button-ghost" onClick={() => setForm('cancel')}>Cancelar reserva</button>}
          </div>
          {isGuest && r.status === 'DEPOSIT_PAID' && !isManager && <p className="muted">Tu reserva ya tiene anticipo: para cancelarla escribe al anunciante en el chat.</p>}
          {form && <form className="form-grid action-form" onSubmit={submitForm}>
            {form === 'approve' && <><label>Anticipo para apartar (opcional, MXN)<input type="number" min="1" value={f.advance || ''} onChange={e => setF({ ...f, advance: e.target.value })} /></label>
              <label className="wide">Nota para el interesado (opcional)<textarea rows={2} value={f.note || ''} onChange={e => setF({ ...f, note: e.target.value })} /></label></>}
            {(form === 'reject' || form === 'cancel') && <label className="wide">Motivo (opcional)<textarea rows={2} value={f.note || ''} onChange={e => setF({ ...f, note: e.target.value })} /></label>}
            {form === 'schedule' && <><label>Fecha y hora<input type="datetime-local" required value={f.at || ''} onChange={e => setF({ ...f, at: e.target.value })} /></label>
              <label>Lugar<input required minLength={3} maxLength={250} value={f.place || ''} onChange={e => setF({ ...f, place: e.target.value })} placeholder="Oficina, la propiedad, notaría…" /></label></>}
            {(form === 'deposit' || form === 'complete') && <><label>Monto recibido (MXN)<input type="number" min="1" step="0.01" required value={f.amount || ''} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
              <label>Forma de pago<select value={f.method || 'CASH'} onChange={e => setF({ ...f, method: e.target.value })}><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option></select></label>
              <label className="wide">Notas (folio, recibo…)<input maxLength={500} value={f.notes || ''} onChange={e => setF({ ...f, notes: e.target.value })} /></label></>}
            <div className="wide property-actions"><button className="button button-navy" disabled={busy}>{busy ? 'Guardando…' : 'Confirmar'}</button><button type="button" className="inline-link" onClick={() => setForm('')}>Cerrar</button></div>
          </form>}
          {r.cancellationPolicy && <details><summary>Política de cancelación</summary><p>{r.cancellationPolicy}</p></details>}
        </section>}
      </div>

      <div>
        <section className="dashboard-card chat"><h3>Chat de la reserva</h3>
          <div className="chat-log" aria-live="polite">
            {r.messages.length === 0 && <p className="muted">Escribe para acordar detalles, documentos y la cita de pago.</p>}
            {r.messages.map(m => <div key={m.id} className={`chat-msg${m.mine ? ' mine' : ''}`}><small>{m.mine ? 'Tú' : m.fullName} · {fmtWhen(m.createdAt)}</small><p>{m.body}</p></div>)}
            <div ref={chatEnd} />
          </div>
          {!closed && <form onSubmit={send} className="chat-form"><textarea rows={2} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Escribe un mensaje…" aria-label="Mensaje" /><button className="button button-navy" disabled={busy || !text.trim()}>Enviar</button></form>}
        </section>

        <section className="dashboard-card"><h3>Documentos</h3>
          <p className="muted">Privados: solo los ven el interesado, el anunciante y el administrador. PDF, JPG o PNG, máximo 10 MB.</p>
          {r.documents.length === 0 ? <p className="muted">Sin documentos.</p> : <ul className="doc-list">{r.documents.map(d => <li key={d.id}>
            <button type="button" className="inline-link" onClick={() => download(d.id, d.fileName)}>{d.fileName}</button>
            <small className="muted"> {d.kind ? `${d.kind} · ` : ''}{Math.ceil(d.size / 1024)} KB · {d.uploadedBy}</small>
            {(d.mine || user.role === 'ADMIN') && <button type="button" className="inline-link" onClick={() => confirm('¿Borrar el documento?') && run(() => authJson<Detail>(`/reservations/${id}/documents/${d.id}`, { method: 'DELETE' }), 'Documento borrado.')}>Borrar</button>}
          </li>)}</ul>}
          {!closed && <form onSubmit={upload} className="doc-form">
            <select value={docKind} onChange={e => setDocKind(e.target.value)} aria-label="Tipo de documento">{DOC_KINDS.map(k => <option key={k}>{k}</option>)}</select>
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" required aria-label="Archivo" />
            <button className="button button-outline" disabled={busy}>Subir</button>
          </form>}
        </section>
      </div>
    </div>
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{user => <ReservationDetail user={user} />}</ProtectedPanel>;
}
