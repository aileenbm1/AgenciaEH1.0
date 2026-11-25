"use client";
import { ReactNode, useEffect, useRef } from 'react';

/** Ventana encima de la página (se cierra con Esc, con la ✕ o tocando fuera). */
export default function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', k); box.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, []);
  return <div className="adm-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`adm-modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={box}>
      <div className="adm-modal-head"><h3>{title}</h3><button type="button" className="adm-x" onClick={onClose} aria-label="Cerrar">✕</button></div>
      <div className="adm-modal-body">{children}</div>
    </div>
  </div>;
}
