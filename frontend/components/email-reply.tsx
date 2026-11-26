"use client";
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Copy, Mail } from 'lucide-react';

/**
 * “Responder por correo” que funciona aunque la computadora no tenga programa de correo:
 * ofrece abrir Gmail u Outlook en el navegador (con el correo, asunto y saludo ya escritos),
 * la app de correo del equipo, o copiar la dirección.
 */
export default function EmailReply({ to, subject, body = '', label = 'Responder por correo' }: { to: string; subject: string; body?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); };
  }, [open]);
  const e = encodeURIComponent;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${e(to)}&su=${e(subject)}&body=${e(body)}`;
  const outlook = `https://outlook.live.com/mail/0/deeplink/compose?to=${e(to)}&subject=${e(subject)}&body=${e(body)}`;
  const mailto = `mailto:${to}?subject=${e(subject)}&body=${e(body)}`;
  const copy = async () => { try { await navigator.clipboard.writeText(to); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copia el correo:', to); } };
  return <div className="er" ref={box}>
    <button type="button" className="button button-outline" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(v => !v)}><Mail size={16} aria-hidden /> {label} <ChevronDown size={14} aria-hidden /></button>
    {open && <div className="er-menu" role="menu">
      <a role="menuitem" href={gmail} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Abrir en Gmail</a>
      <a role="menuitem" href={outlook} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Abrir en Outlook / Hotmail</a>
      <a role="menuitem" href={mailto} onClick={() => setOpen(false)}>App de correo de este equipo</a>
      <button type="button" role="menuitem" onClick={copy}><Copy size={14} aria-hidden /> {copied ? '¡Correo copiado!' : `Copiar ${to}`}</button>
    </div>}
  </div>;
}
