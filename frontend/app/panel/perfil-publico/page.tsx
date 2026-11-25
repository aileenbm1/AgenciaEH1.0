"use client";
import ProtectedPanel from '@/components/protected-panel';
import PublisherShell from '@/components/publisher/publisher-shell';
import AgencyProfileEditor from '@/components/agency-profile-editor';
import AgentProfileEditor from '@/components/agent-profile-editor';

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <PublisherShell user={user} active="perfil">
    <div className="adm-top"><div><h1>Perfil público</h1><p className="adm-date">Es la página que ven los clientes cuando tocan tu nombre en una propiedad. Una buena foto y tu WhatsApp generan más contactos.</p></div></div>
    {user.role === 'AGENT' ? <AgentProfileEditor /> : <AgencyProfileEditor developer={user.role === 'DEVELOPER'} />}
  </PublisherShell>}</ProtectedPanel>;
}
