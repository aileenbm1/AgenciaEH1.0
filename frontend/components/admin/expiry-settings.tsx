"use client";
import { useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';

type Cfg = { enabled: boolean; remind: number; pause: number };

/** Vigencia de anuncios: a los N días se pregunta “¿sigue disponible?” y a los M se pausa sola. */
export default function ExpirySettings() {
  const [c, setC] = useState<Cfg | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => { authJson<Cfg>('/admin/listing-expiry').then(setC).catch(() => {}); }, []);
  if (!c) return null;
  const save = async () => { setMsg(null); try { setC(await authJson<Cfg>('/admin/listing-expiry', { method: 'PATCH', body: JSON.stringify(c) })); setMsg({ ok: true, t: 'Guardado.' }); } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : 'No se pudo guardar.' }); } };
  return <section className="adm-sec"><div className="adm-card adm-pad exp-card">
    <b>Vigencia de anuncios</b>
    <p className="muted">Para que el catálogo no tenga propiedades que ya se rentaron o vendieron: si un anuncio no tiene movimiento (confirmación, edición o reservas), se le pregunta al anunciante si sigue disponible y, si no responde, se pausa solo. Puede reactivarlo con un clic.</p>
    <label className="check"><input type="checkbox" checked={c.enabled} onChange={e => setC({ ...c, enabled: e.target.checked })} /> Activar la vigencia automática</label>
    {c.enabled && <div className="exp-row">
      <label>Preguntar “¿sigue disponible?” a los<input type="number" min={7} max={365} value={c.remind} onChange={e => setC({ ...c, remind: Number(e.target.value) })} /> días</label>
      <label>Pausar sola a los<input type="number" min={8} max={730} value={c.pause} onChange={e => setC({ ...c, pause: Number(e.target.value) })} /> días</label>
    </div>}
    <div className="exp-acts"><button type="button" className="button button-navy" onClick={save}>Guardar</button>{msg && <span className={msg.ok ? 'ok-text' : 'bad-text'} role="status">{msg.t}</span>}</div>
  </div></section>;
}
