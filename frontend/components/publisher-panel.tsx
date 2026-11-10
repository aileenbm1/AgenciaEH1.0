"use client";
import { useEffect, useState } from 'react';
import { authJson, SessionUser } from '@/lib/auth';
import { PanelShell, PublishFlow, PanelAction } from './panel-shell';
import AgencyProfileEditor from './agency-profile-editor';
import AgentProfileEditor from './agent-profile-editor';
import ProfileStats from './profile-stats';

/** Panel compartido por Agente y Agencia: ambos publican propiedades con el mismo flujo. */
export function PublisherPanel({ user }: { user: SessionUser }) {
  const [counts, setCounts] = useState<Record<string, number> | undefined>();
  const [error, setError] = useState('');
  useEffect(() => {
    authJson<{ status: string }[]>('/properties/mine')
      .then(items => setCounts(items.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {} as Record<string, number>)))
      .catch(e => setError(e.message));
  }, []);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  // Agencia y desarrolladora: empresas con equipo de vendedores.
  const isAgency = user.role === 'AGENCY' || user.role === 'DEVELOPER';
  const orgWord = user.role === 'DEVELOPER' ? 'desarrolladora' : 'agencia';

  const actions: PanelAction[] = [
    { title: 'Nueva propiedad', text: 'Captura un inmueble. Se guarda como borrador hasta que lo envíes a revisión.', href: '/panel/agente/propiedades#nueva', primary: true },
    { title: 'Mis propiedades', text: total ? `${total} registrada(s). Revisa su estado, envíalas a revisión o elimínalas.` : 'Aquí verás el estado de cada publicación.', href: '/panel/agente/propiedades' },
    { title: 'Reservas y apartados', text: 'Solicitudes de renta y compra en línea: acéptalas, acuerda el pago (transferencia o en persona) y regístralo.', href: '/panel/reservas' },
    { title: 'Prospectos y visitas', text: isAgency ? 'Mensajes y visitas tuyos y de tus vendedores.' : 'Mensajes y solicitudes de visita de tus propiedades.', href: '/panel/prospectos' },
    { title: 'Ver catálogo público', text: 'Así ven los compradores tus propiedades ya publicadas.', href: '/propiedades' },
  ];

  return <PanelShell user={user} actions={actions}
    intro={isAgency
      ? `Publica propiedades a nombre de tu ${orgWord}. Cada una pasa por revisión antes de aparecer en el catálogo.`
      : 'Publica tus propiedades. Cada una pasa por revisión antes de aparecer en el catálogo.'}>
    {error && <div className="notice" role="alert">{error}</div>}
    {counts && total === 0 && <div className="empty-start">
      <b>Empieza aquí:</b> aún no tienes propiedades. Crea la primera; tarda unos minutos.
    </div>}
    <PublishFlow counts={counts} />
    {user.approvalStatus !== 'PENDING' && <ProfileStats team={isAgency} />}
    {isAgency ? <AgencyProfileEditor /> : <AgentProfileEditor />}
    <p className="muted">¿Necesitas una cuenta nueva (un asesor para tu equipo, por ejemplo)? Las cuentas las crea el administrador de Agencia EH.</p>
  </PanelShell>;
}
