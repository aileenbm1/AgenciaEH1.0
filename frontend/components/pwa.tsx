"use client";
import { useEffect, useState } from 'react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Registra el service worker y ofrece "Instalar app" cuando el navegador lo permite. */
export default function Pwa() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  useEffect(() => {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const h = (e: Event) => { e.preventDefault(); try { if (localStorage.getItem('eh_pwa_no')) return; } catch { /* sin almacenamiento */ } setEvt(e as InstallEvent); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (!evt) return null;
  return <div className="pwa-banner" role="dialog" aria-label="Instalar la app">
    <span>Instala Agencia EH en tu celular para entrar más rápido.</span>
    <button className="button button-gold" onClick={async () => { await evt.prompt(); setEvt(null); }}>Instalar</button>
    <button className="inline-link" onClick={() => { try { localStorage.setItem('eh_pwa_no', '1'); } catch { /* */ } setEvt(null); }}>Ahora no</button>
  </div>;
}
