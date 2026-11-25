"use client";
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedPanel from '@/components/protected-panel';
import PreviewFrame from '@/components/preview-frame';
import FanpageView from '@/components/fanpage-view';
import { authJson } from '@/lib/auth';
import { ApiProperty } from '@/lib/properties';
import { Block, Theme } from '@/lib/fanpage';

type Editor = { property: ApiProperty & { status: string }; status: string; reviewNote: string | null; hasPublished: boolean; unpublishedChanges: boolean; theme: Theme; blocks: Block[]; requireApproval: boolean };
const LABEL: Record<string, string> = { NEW: 'Diseño automático (aún no la has personalizado).', DRAFT: 'Borrador.', PENDING: 'En aprobación del administrador.', PUBLISHED: 'Publicada.', REJECTED: 'El administrador pidió cambios.' };

function FanpagePreview() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [d, setD] = useState<Editor | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => authJson<Editor>(`/fanpages/${propertyId}`).then(setD).catch(e => setError(e instanceof Error ? e.message : 'No se pudo abrir la vista previa.')), [propertyId]);
  useEffect(() => { load(); }, [load]);
  if (error) return <main className="page-wrap"><p className="notice">{error}</p></main>;
  if (!d) return <main className="page-wrap"><p className="muted">Cargando vista previa…</p></main>;
  const propPublic = d.property.status === 'PUBLISHED';
  const isPublic = propPublic && d.hasPublished && !d.unpublishedChanges;
  const canPublish = d.status !== 'PENDING' && (d.unpublishedChanges || !d.hasPublished);
  const note = [LABEL[d.status] || '', d.status === 'REJECTED' && d.reviewNote ? `Motivo: ${d.reviewNote}.` : '',
    propPublic ? '' : 'La propiedad todavía no está publicada: la fanpage se verá en internet cuando el administrador la apruebe.'].filter(Boolean).join(' ');
  return <PreviewFrame title={d.property.title} label={isPublic ? 'Ya está publicada' : propPublic && d.hasPublished ? 'Cambios sin publicar' : 'Aún no es pública'} status={isPublic ? 'Así se ve hoy en internet.' : note} editHref={`/panel/fanpage/${propertyId}`} onReload={load}
    publish={canPublish ? { label: d.requireApproval ? 'Enviar a aprobación' : 'Publicar', run: async () => { await authJson(`/fanpages/${propertyId}/publish`, { method: 'POST' }); return d.requireApproval ? 'Enviada a aprobación del administrador.' : '¡Fanpage publicada!'; } } : null}>
    <main className="fanpage-wrap"><FanpageView property={d.property} theme={d.theme} blocks={d.blocks} preview /></main>
  </PreviewFrame>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}><FanpagePreview /></ProtectedPanel>;
}
