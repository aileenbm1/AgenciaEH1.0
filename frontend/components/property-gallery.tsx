"use client";
import { useState } from 'react';
import { ApiImage } from '@/lib/properties';

/** Galería de la ficha: foto grande + miniaturas con etiqueta y número de posición. */
export default function PropertyGallery({ images, title }: { images: ApiImage[]; title: string }) {
  const photos = images.length ? images : [{ url: '/placeholder-property.svg', label: null, position: 0 }];
  const [i, setI] = useState(0);
  const cur = photos[i];
  return <div className="gallery">
    <div className="detail-image" style={{ backgroundImage: `url(${cur.url})` }} role="img" aria-label={cur.label || title}>
      {cur.label && <span className="gallery-label">{cur.label}</span>}
      <span className="gallery-count">{i + 1} / {photos.length}</span>
      {photos.length > 1 && <>
        <button type="button" className="gallery-nav prev" onClick={() => setI((i - 1 + photos.length) % photos.length)} aria-label="Foto anterior">‹</button>
        <button type="button" className="gallery-nav next" onClick={() => setI((i + 1) % photos.length)} aria-label="Foto siguiente">›</button>
      </>}
    </div>
    {photos.length > 1 && <ul className="gallery-thumbs">{photos.map((p, k) => <li key={p.url + k}>
      <button type="button" className={k === i ? 'is-on' : ''} onClick={() => setI(k)} style={{ backgroundImage: `url(${p.url})` }} aria-label={`${k + 1}. ${p.label || 'Foto'}`}>
        <span>{k + 1}{p.label ? ` · ${p.label}` : ''}</span>
      </button>
    </li>)}</ul>}
  </div>;
}
