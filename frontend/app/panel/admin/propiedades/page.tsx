"use client";
import Link from 'next/link';
import { Plus } from 'lucide-react';
import ProtectedPanel from '@/components/protected-panel';
import AdminShell from '@/components/admin/admin-shell';
import ModerationQueue from '@/components/admin/moderation-queue';
import ExpirySettings from '@/components/admin/expiry-settings';

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{user => <AdminShell user={user} active="propiedades">
    <div className="adm-top"><div><h1>Propiedades</h1><p className="adm-date">Nada se publica sin tu aprobación. Revisa que datos, precio y fotos sean correctos.</p></div>
      <div className="adm-top-acts"><Link className="button button-navy" href="/panel/agente/propiedades#nueva"><Plus size={16} aria-hidden /> Nueva propiedad</Link><Link className="button button-outline" href="/panel/agente/propiedades">Todas las propiedades</Link></div></div>
    <ModerationQueue title="Por revisar" />
    <section className="adm-sec"><div className="adm-card adm-pad">
      <b>Todas las propiedades</b>
      <p className="muted" style={{ margin: '4px 0 12px' }}>Edita, publica, pausa, programa, cambia la disponibilidad, configura las reservas o elimina cualquier propiedad, de cualquier anunciante. Ahí ves también las pausadas, las programadas y su historial.</p>
      <Link className="button button-outline" href="/panel/agente/propiedades">Abrir la lista completa</Link>
    </div></section>
    <ExpirySettings />
  </AdminShell>}</ProtectedPanel>;
}
