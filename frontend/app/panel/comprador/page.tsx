"use client";
import ProtectedPanel from '@/components/protected-panel';
import { PanelShell } from '@/components/panel-shell';
import BuyerSections from '@/components/buyer-sections';

export default function Page() {
  return <ProtectedPanel allowed={['BUYER']}>{user => <PanelShell user={user}
    intro="Encuentra tu próximo espacio: guarda favoritos, recibe avisos de nuevas propiedades y agenda visitas con el asesor."
    actions={[
      { title: 'Buscar propiedades', text: 'Filtra y guarda tu búsqueda para recibir avisos.', href: '/propiedades', primary: true },
      { title: 'Mis reservas', text: 'Rentas y apartados: estado, cita de pago, chat y documentos.', href: '/panel/reservas' },
      { title: 'Mis favoritos', text: 'Las propiedades que guardaste.', href: '#favoritos' },
      { title: 'Comparar', text: 'Pon lado a lado varias opciones.', href: '/comparar' },
      { title: 'Mis mensajes y visitas', text: 'En qué va cada solicitud.', href: '#solicitudes' },
    ]}>
    <BuyerSections />
  </PanelShell>}</ProtectedPanel>;
}
