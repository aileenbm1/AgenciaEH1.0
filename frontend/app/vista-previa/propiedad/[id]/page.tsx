"use client";
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedPanel from '@/components/protected-panel';
import PreviewFrame from '@/components/preview-frame';
import PropertyDetailView from '@/components/property-detail-view';
import { authJson, SessionUser } from '@/lib/auth';
import { ApiProperty } from '@/lib/properties';
import { PROPERTY_STATUS } from '@/lib/roles';

type Preview = ApiProperty & { status: string; reviewNote: string | null };

function PropertyPreview({ user }: { user: SessionUser }) {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => authJson<Preview>(`/properties/preview/${id}`).then(setP).catch(e => setError(e instanceof Error ? e.message : 'No se pudo abrir la vista previa.')), [id]);
  useEffect(() => { load(); }, [load]);
  if (error) return <main className="page-wrap"><p className="notice">{error}</p></main>;
  if (!p) return <main className="page-wrap"><p className="muted">Cargando vista previa…</p></main>;
  const st = PROPERTY_STATUS[p.status] || { label: p.status, help: '' };
  const admin = user.role === 'ADMIN';
  const canSend = p.status === 'DRAFT' || p.status === 'REJECTED';
  const publish = canSend ? {
    label: admin ? 'Publicar' : 'Enviar a revisión',
    run: async () => { await authJson(`/properties/${p.id}/submit`, { method: 'POST' }); return admin ? '¡Publicada! Ya aparece en el catálogo.' : 'Enviada a revisión. Te avisaremos cuando el administrador la apruebe.'; },
  } : null;
  return <PreviewFrame title={p.title} label={p.status === 'PUBLISHED' ? 'Ya está publicada' : 'Aún no es pública'} status={`${st.label}. ${st.help}${p.status === 'REJECTED' && p.reviewNote ? ` Motivo: ${p.reviewNote}` : ''}`} editHref="/panel/agente/propiedades" publish={publish} onReload={load}>
    <PropertyDetailView raw={p} preview />
  </PreviewFrame>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{u => <PropertyPreview user={u} />}</ProtectedPanel>;
}
