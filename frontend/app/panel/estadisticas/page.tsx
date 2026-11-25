"use client";
import ProtectedPanel from '@/components/protected-panel';
import PublisherShell from '@/components/publisher/publisher-shell';
import ProfileStats from '@/components/profile-stats';

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <PublisherShell user={user} active="estadisticas">
    <div className="adm-top"><div><h1>Estadísticas</h1><p className="adm-date">Cuántas personas ven tus propiedades y tu perfil, y cuántas te escriben o reservan.</p></div></div>
    <ProfileStats team={user.role !== 'AGENT'} />
  </PublisherShell>}</ProtectedPanel>;
}
