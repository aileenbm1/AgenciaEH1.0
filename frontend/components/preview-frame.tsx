"use client";
import { ReactNode, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Laptop, RefreshCw, Smartphone, X } from 'lucide-react';

export type PreviewPublish = { label: string; run: () => Promise<string> } | null;

/** Lee ?marco=1: la misma página dentro del marco de celular (sin la franja). */
export function useEmbedded() {
  const [embed, setEmbed] = useState<boolean | null>(null);
  useEffect(() => { setEmbed(new URLSearchParams(window.location.search).get('marco') === '1'); }, []);
  return embed;
}

/**
 * Vista previa a pantalla completa: muestra la página real con el borrador y una franja arriba
 * ("Vista previa · Aún no es pública") con Volver a editar, Publicar y el cambio computadora / celular.
 * En modo celular la misma página se carga dentro de un marco de 390 px para que se vea como en un teléfono de verdad.
 */
export default function PreviewFrame({ title, status, label, editHref, publish, onReload, children }: {
  title: string; status: string; label: string; editHref: string; publish: PreviewPublish; onReload: () => void; children: ReactNode;
}) {
  const router = useRouter();
  const embed = useEmbedded();
  const bar = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<'desk' | 'phone'>('desk');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (embed !== false) return;
    document.body.classList.add('pv-mode');
    const el = bar.current;
    const ro = el ? new ResizeObserver(() => document.documentElement.style.setProperty('--pv-h', `${el.offsetHeight}px`)) : null;
    if (el && ro) ro.observe(el);
    return () => { document.body.classList.remove('pv-mode'); ro?.disconnect(); };
  }, [embed]);
  useEffect(() => { if (embed === false) document.title = `Vista previa · ${title}`; }, [embed, title]);

  if (embed === null) return null;
  if (embed) return <>{children}</>;

  const back = () => {
    // Si la vista previa se abrió desde el editor, se cierra esta pestaña y se vuelve a la del editor.
    const o = window.opener as Window | null;
    if (o && !o.closed) { try { o.focus(); } catch { /* otra pestaña */ } window.close(); }
    setTimeout(() => router.push(editHref), 150);
  };
  const reload = () => { setMsg(null); onReload(); frame.current?.contentWindow?.location.reload(); };
  const doPublish = async () => {
    if (!publish) return;
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await publish.run() }); reload(); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'No se pudo publicar.' }); } finally { setBusy(false); }
  };
  const src = () => { const u = new URL(window.location.href); u.searchParams.set('marco', '1'); return u.pathname + u.search; };

  return <>
    <div className="pv-bar" ref={bar} role="region" aria-label="Vista previa">
      <div className="pv-info">
        <Eye size={18} strokeWidth={1.75} aria-hidden />
        <div><b>Vista previa · {label}</b><small>{status}</small></div>
      </div>
      <div className="pv-devices" role="group" aria-label="Ver como">
        <button type="button" className={device === 'desk' ? 'on' : ''} aria-pressed={device === 'desk'} onClick={() => setDevice('desk')}><Laptop size={16} aria-hidden /> <span>Computadora</span></button>
        <button type="button" className={device === 'phone' ? 'on' : ''} aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}><Smartphone size={16} aria-hidden /> <span>Celular</span></button>
      </div>
      <div className="pv-acts">
        <button type="button" className="pv-icon" onClick={reload} title="Actualizar con lo último que guardaste" aria-label="Actualizar"><RefreshCw size={16} aria-hidden /></button>
        <button type="button" className="button pv-back" onClick={back}><X size={15} aria-hidden /> Volver<span>a editar</span></button>
        {publish && <button type="button" className="button button-gold" disabled={busy} onClick={doPublish}>{busy ? 'Un momento…' : publish.label}</button>}
      </div>
      {msg && <p className={`pv-msg ${msg.ok ? 'ok' : 'bad'}`} role="status">{msg.text}</p>}
    </div>
    {device === 'phone'
      ? <div className="pv-phone-wrap"><div className="pv-phone"><iframe ref={frame} src={src()} title={`${title} en celular`} /></div></div>
      : children}
  </>;
}
