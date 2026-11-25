"use client";
import { useEffect, useState } from 'react';
import { COMPARE_EVENT, MAX_COMPARE, readCompare, writeCompare } from './property-tools';

/** Botón “+ Comparar” de cada tarjeta del catálogo. */
export default function CompareToggle({ slug }: { slug: string }) {
  const [on, setOn] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const sync = () => { const l = readCompare(); setOn(l.includes(slug)); setFull(l.length >= MAX_COMPARE); };
    sync(); window.addEventListener(COMPARE_EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(COMPARE_EVENT, sync); window.removeEventListener('storage', sync); };
  }, [slug]);
  const toggle = () => { const l = readCompare(); if (l.includes(slug)) writeCompare(l.filter(s => s !== slug)); else if (l.length < MAX_COMPARE) writeCompare([...l, slug]); };
  return <button type="button" className={`cmp-toggle${on ? ' on' : ''}`} onClick={toggle} disabled={!on && full} aria-pressed={on} title={!on && full ? `Ya tienes ${MAX_COMPARE} para comparar` : undefined}>
    {on ? '✓ En comparar' : '+ Comparar'}</button>;
}
