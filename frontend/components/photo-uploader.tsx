"use client";
import { ChangeEvent, useRef, useState } from 'react';
import { uploadImage } from '@/lib/auth';

const MAX_PHOTOS = 20;
const MAX_SIDE = 1600;      // px del lado mayor
const QUALITY = 0.82;       // calidad JPEG

/** Reduce la foto en el navegador (lado mayor 1600 px, JPEG) antes de subirla. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // el navegador no la puede leer: se envía tal cual y la API la valida
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#fff'; // fondo blanco para PNG con transparencia
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', QUALITY));
  return blob && blob.size < file.size ? blob : file;
}

type Props = { value: string[]; onChange: (urls: string[]) => void; onBusyChange?: (busy: boolean) => void };

export default function PhotoUploader({ value, onChange, onBusyChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError('');
    const room = MAX_PHOTOS - value.length;
    if (room <= 0) { setError(`Máximo ${MAX_PHOTOS} fotos por propiedad.`); return; }
    const batch = files.slice(0, room);
    if (files.length > room) setError(`Solo se agregaron ${room} de ${files.length}: el máximo es ${MAX_PHOTOS} fotos.`);
    onBusyChange?.(true);
    let urls = [...value];
    try {
      for (let i = 0; i < batch.length; i++) {
        setProgress(`Subiendo foto ${i + 1} de ${batch.length}…`);
        try {
          const url = await uploadImage(await shrink(batch[i]), batch[i].name);
          urls = [...urls, url];
          onChange(urls);
        } catch (err) {
          setError(`"${batch[i].name}": ${err instanceof Error ? err.message : 'no se pudo subir.'}`);
        }
      }
    } finally { setProgress(''); onBusyChange?.(false); }
  }

  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));
  const makeCover = (i: number) => onChange([value[i], ...value.filter((_, j) => j !== i)]);
  function addLink() {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) { setError('El enlace debe empezar con https://'); return; }
    if (value.length >= MAX_PHOTOS) { setError(`Máximo ${MAX_PHOTOS} fotos por propiedad.`); return; }
    onChange([...value, url]); setLink(''); setError('');
  }

  return <div className="photo-uploader">
    <span className="photo-uploader-label">Fotografías <small>({value.length}/{MAX_PHOTOS}) · la primera es la portada</small></span>
    {value.length > 0 && <ul className="photo-grid">
      {value.map((url, i) => <li key={url + i} className={i === 0 ? 'is-cover' : ''}>
        <img src={url} alt={`Foto ${i + 1}`} />
        {i === 0 ? <span className="photo-badge">Portada</span>
          : <button type="button" className="photo-cover" onClick={() => makeCover(i)}>Hacer portada</button>}
        <button type="button" className="photo-remove" aria-label={`Quitar foto ${i + 1}`} onClick={() => remove(i)}>×</button>
      </li>)}
    </ul>}
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple hidden onChange={pick} />
    <button type="button" className="button button-outline photo-add" disabled={!!progress || value.length >= MAX_PHOTOS} onClick={() => input.current?.click()}>
      {progress || (value.length ? '+ Agregar más fotos' : '+ Subir fotos')}
    </button>
    <small className="muted">JPG, PNG o WebP. Se reducen automáticamente antes de subirse.</small>
    <details className="photo-link">
      <summary>O agregar por enlace</summary>
      <div><input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }} />
        <button type="button" className="button button-outline" onClick={addLink}>Agregar</button></div>
    </details>
    {error && <div className="notice" role="alert">{error}</div>}
  </div>;
}
