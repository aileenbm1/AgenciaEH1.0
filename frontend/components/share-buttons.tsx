"use client";
import { useState } from 'react';
import { Share2 } from 'lucide-react';

const abs = (path: string) => (typeof window !== 'undefined' ? window.location.origin : '') + path;

/** Compartir un inmueble (cualquier persona, con o sin cuenta). */
export default function ShareButtons({ path, title, compact = false }: { path: string; title: string; compact?: boolean }) {
  const [msg, setMsg] = useState('');
  const text = `${title} · Agencia EH`;
  async function nativeOrCopy() {
    const url = abs(path);
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch { return; /* el usuario canceló */ }
    try { await navigator.clipboard.writeText(url); setMsg('¡Enlace copiado!'); } catch { setMsg(url); }
    setTimeout(() => setMsg(''), 2500);
  }
  if (compact) return <span className="share-compact">
    <button type="button" className="share-icon" onClick={nativeOrCopy} aria-label={`Compartir ${title}`} title="Compartir"><Share2 size={16} strokeWidth={1.8} aria-hidden /></button>
    {msg && <span className="share-toast" role="status">{msg}</span>}
  </span>;
  const url = encodeURIComponent(abs(path)); const t = encodeURIComponent(text);
  return <div className="share-box">
    <b>Compartir</b>
    <div className="share-links">
      <button type="button" className="button button-outline" onClick={nativeOrCopy}><Share2 size={15} aria-hidden /> Compartir</button>
      <a className="share-link wa" href={`https://wa.me/?text=${t}%20${url}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className="share-link fb" href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer">Facebook</a>
      <a className="share-link x" href={`https://twitter.com/intent/tweet?url=${url}&text=${t}`} target="_blank" rel="noopener noreferrer">X</a>
      <a className="share-link in" href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
      <button type="button" className="share-link" onClick={async () => { try { await navigator.clipboard.writeText(abs(path)); setMsg('¡Enlace copiado! Pégalo en Instagram u otra red.'); } catch { setMsg(abs(path)); } }}>Copiar enlace</button>
    </div>
    {msg && <small className="muted" role="status">{msg}</small>}
  </div>;
}
