"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch, currentToken, getCurrentUser } from '@/lib/auth';

/** Enlace "Editar fanpage" visible solo para quien puede editarla (anunciante, su agencia o admin). */
export default function FanpageEditLink({ propertyId }: { propertyId: string }) {
  const [can, setCan] = useState(false);
  useEffect(() => {
    if (!currentToken()) return;
    getCurrentUser().then(u => { if (u && u.role !== 'BUYER') authFetch(`/fanpages/${propertyId}`).then(r => setCan(r.ok)).catch(() => {}); }).catch(() => {});
  }, [propertyId]);
  return can ? <Link className="small-link" href={`/panel/fanpage/${propertyId}`}>✎ Editar fanpage</Link> : null;
}
