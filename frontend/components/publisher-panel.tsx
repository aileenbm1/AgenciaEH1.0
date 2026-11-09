"use client";
import { useEffect, useState } from 'react';
import { authJson, SessionUser } from '@/lib/auth';
import { PanelShell, PublishFlow, PanelAction } from './panel-shell';
import TeamManager from './team-manager';

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
  const isAgency = user.role === 'AGENCY';

  const actions: PanelAction[] = [
    { title: 'Nueva propiedad', text: 'Captura un inmueble. Se guarda como borrador hasta que lo envíes a revisión.', href: '/panel/agente/propiedades#nueva', primary: true },
    { title: 'Mis propiedades', text: total ? `${total} registrada(s). Revisa su estado, envíalas a revisión o elimínalas.` : 'Aquí verás el estado de cada publicación.', href: '/panel/agente/propiedades' },
    { title: isAgency ? 'Mi equipo y clientes' : 'Mis clientes', text: isAgency ? 'Crea cuentas para tus vendedores y compradores.' : 'Crea cuentas para tus compradores.', href: '#cuentas' },
    { title: 'Ver catálogo público', text: 'Así ven los compradores tus propiedades ya publicadas.', href: '/propiedades' },
  ];

  return <PanelShell user={user} actions={actions}
    intro={isAgency
      ? 'Publica propiedades a nombre de tu agencia. Cada una pasa por revisión antes de aparecer en el catálogo.'
      : 'Publica tus propiedades. Cada una pasa por revisión antes de aparecer en el catálogo.'}>
    {error && <div className="notice" role="alert">{error}</div>}
    {counts && total === 0 && <div className="empty-start">
      <b>Empieza aquí:</b> aún no tienes propiedades. Crea la primera; tarda unos minutos.
    </div>}
    <PublishFlow counts={counts} />
    {isAgency
      ? <TeamManager roles={['AGENT', 'BUYER']} title="Mi equipo y clientes" intro="Crea las cuentas de los vendedores de tu agencia y de tus compradores. Los vendedores quedan ligados a tu agencia." />
      : <TeamManager roles={['BUYER']} title="Mis clientes" intro="Crea cuentas para tus compradores o inquilinos." />}
  </PanelShell>;
}
