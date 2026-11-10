"use client";
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';
import { CustomField } from '@/lib/properties';

const TYPES = { TEXT: 'Texto', NUMBER: 'Número', BOOLEAN: 'Sí / No', SELECT: 'Lista de opciones' } as const;

/** RF-03: el administrador crea campos extra para las propiedades (aparecen en el formulario, la ficha y, si quiere, en los filtros). */
export default function CustomFieldsManager() {
  const [items, setItems] = useState<CustomField[] | null>(null);
  const [f, setF] = useState({ label: '', type: 'BOOLEAN' as keyof typeof TYPES, options: '', required: false, filterable: true });
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const load = useCallback(() => authJson<CustomField[]>('/admin/custom-fields').then(setItems).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault(); setBusy('new'); setError(''); setOk('');
    try {
      await authJson('/admin/custom-fields', { method: 'POST', body: JSON.stringify({ label: f.label, type: f.type, required: f.required, filterable: f.filterable,
        options: f.type === 'SELECT' ? f.options.split(',').map(o => o.trim()).filter(Boolean) : undefined, position: (items?.length || 0) + 1 }) });
      setOk(`Campo "${f.label}" creado. Ya aparece en el formulario de propiedades.`); setF({ ...f, label: '', options: '' }); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear.'); } finally { setBusy(''); }
  }
  async function patch(x: CustomField, change: Partial<CustomField>) {
    setBusy(x.id); setError('');
    try { await authJson(`/admin/custom-fields/${x.id}`, { method: 'PATCH', body: JSON.stringify(change) }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); } finally { setBusy(''); }
  }
  async function remove(x: CustomField) {
    if (!confirm(`¿Borrar el campo "${x.label}"? Se pierden los valores capturados en todas las propiedades. Si solo quieres ocultarlo, desactívalo.`)) return;
    setBusy(x.id);
    try { await authJson(`/admin/custom-fields/${x.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo borrar.'); } finally { setBusy(''); }
  }

  return <section id="campos" className="admin-section">
    <h2 className="panel-subtitle">Campos personalizados {items && <em className="count">{items.length}</em>}</h2>
    <p className="muted lead">Datos extra para las propiedades (por ejemplo: "Acepta mascotas", "Amueblado", "Cajones de estacionamiento"). Aparecen en el formulario del anunciante, en la ficha y, si los marcas como filtro, en la búsqueda.</p>
    <form onSubmit={create} className="dashboard-card property-form team-form">
      <h3>Nuevo campo</h3>
      <div className="form-grid">
        <label>Nombre<input required minLength={2} maxLength={80} value={f.label} onChange={e => setF({ ...f, label: e.target.value })} placeholder="Acepta mascotas" /></label>
        <label>Tipo<select value={f.type} onChange={e => setF({ ...f, type: e.target.value as keyof typeof TYPES })}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {f.type === 'SELECT' && <label>Opciones (separadas por coma)<input required value={f.options} onChange={e => setF({ ...f, options: e.target.value })} placeholder="Sí, No, Semi" /></label>}
      </div>
      <label className="switch"><input type="checkbox" checked={f.filterable} onChange={e => setF({ ...f, filterable: e.target.checked })} /> Mostrar como filtro en la búsqueda</label>
      <label className="switch"><input type="checkbox" checked={f.required} onChange={e => setF({ ...f, required: e.target.checked })} /> Obligatorio para enviar a revisión</label>
      {error && <div className="notice" role="alert">{error}</div>}
      {ok && <div className="notice ok" role="status">{ok}</div>}
      <button className="button button-navy" disabled={busy === 'new'}>{busy === 'new' ? 'Creando…' : 'Crear campo'}</button>
    </form>
    {items && items.length > 0 && <div className="table-wrap"><table className="admin-table">
      <thead><tr><th>Campo</th><th>Tipo</th><th>Filtro</th><th>Obligatorio</th><th>Activo</th><th /></tr></thead>
      <tbody>{items.map(x => <tr key={x.id}>
        <td><b>{x.label}</b><small>{x.key}{x.options.length ? ` · ${x.options.join(', ')}` : ''}</small></td>
        <td>{TYPES[x.type]}</td>
        <td><input type="checkbox" aria-label="Filtro" checked={x.filterable} disabled={busy === x.id} onChange={e => patch(x, { filterable: e.target.checked })} /></td>
        <td><input type="checkbox" aria-label="Obligatorio" checked={x.required} disabled={busy === x.id} onChange={e => patch(x, { required: e.target.checked })} /></td>
        <td><input type="checkbox" aria-label="Activo" checked={x.active} disabled={busy === x.id} onChange={e => patch(x, { active: e.target.checked })} /></td>
        <td><button type="button" className="inline-link danger-link" onClick={() => remove(x)}>Borrar</button></td>
      </tr>)}</tbody></table></div>}
  </section>;
}
