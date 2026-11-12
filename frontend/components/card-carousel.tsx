"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Carrusel de fotos de la tarjeta del catálogo.
 * - Avanza solo cada pocos segundos mientras la tarjeta está a la vista.
 * - Se detiene al pasar el ratón o al tocar la foto (en celular, el primer toque la detiene y el segundo abre la propiedad).
 * - Al hacer clic se abre la ficha mostrando esa misma foto.
 */
export default function CardCarousel({ images, href, title, children }: { images: string[]; href: string; title: string; children?: React.ReactNode }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const [held, setHeld] = useState(false);   // detenido por toque
  const [visible, setVisible] = useState(false);
  const touch = useRef(false);
  const n = images.length;

  useEffect(() => {
    const el = box.current; if (!el || n < 2) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.5 });
    io.observe(el); return () => io.disconnect();
  }, [n]);

  useEffect(() => {
    if (n < 2 || !visible || hover || held) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Cada tarjeta arranca con un pequeño desfase para que no cambien todas a la vez.
    const t = setInterval(() => setI(x => (x + 1) % n), 3500 + (title.length % 7) * 150);
    return () => clearInterval(t);
  }, [n, visible, hover, held, title]);

  const open = (e?: React.MouseEvent) => { e?.preventDefault(); router.push(i > 0 ? `${href}?foto=${i + 1}` : href); };
  const go = (e: React.MouseEvent, d: number) => { e.preventDefault(); e.stopPropagation(); setHeld(true); setI(x => (x + d + n) % n); };

  return <div ref={box} className={`property-photo card-carousel${held ? ' is-held' : ''}`}
    onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
    onPointerDown={e => { touch.current = e.pointerType === 'touch'; }}
    onClick={e => {
      // En pantallas táctiles el primer toque solo detiene el carrusel.
      if (touch.current && !held && n > 1) { e.preventDefault(); setHeld(true); return; }
      open(e);
    }}
    role="link" tabIndex={0} aria-label={`${title} · foto ${i + 1} de ${Math.max(n, 1)}`}
    onKeyDown={e => { if (e.key === 'Enter') open(); if (e.key === 'ArrowRight' && n > 1) setI(x => (x + 1) % n); if (e.key === 'ArrowLeft' && n > 1) setI(x => (x - 1 + n) % n); }}>
    <div className="cc-track" style={{ transform: `translateX(-${i * 100}%)` }}>
      {(n ? images : ['/placeholder-property.svg']).map((u, k) => <div key={u + k} className="cc-slide" style={{ backgroundImage: `url(${u})` }} aria-hidden={k !== i} />)}
    </div>
    {children}
    {n > 1 && <>
      <button type="button" className="cc-nav prev" onClick={e => go(e, -1)} aria-label="Foto anterior">‹</button>
      <button type="button" className="cc-nav next" onClick={e => go(e, 1)} aria-label="Foto siguiente">›</button>
      <div className="cc-dots" aria-hidden>{images.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
      {held && <span className="cc-hint">⏸ Toca de nuevo para ver la propiedad</span>}
    </>}
  </div>;
}
