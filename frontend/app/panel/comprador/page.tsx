"use client";
import ProtectedPanel from '@/components/protected-panel';
import { PanelShell } from '@/components/panel-shell';

export default function Page() {
  return <ProtectedPanel allowed={['BUYER']}>{user => <PanelShell user={user}
    intro="Encuentra tu próximo espacio: busca, compara y habla directo con el asesor de cada propiedad."
    actions={[
      { title: 'Buscar propiedades', text: 'Filtra por municipio, tipo, precio y recámaras.', href: '/propiedades', primary: true },
      { title: 'Comparar', text: 'Pon lado a lado las características de varias opciones.', href: '/comparar' },
      { title: 'Cómo funciona', text: 'Qué pasa cuando contactas a un asesor.', href: '/como-funciona' },
    ]}>
    <section className="flow">
      <h2 className="panel-subtitle">Tu recorrido</h2>
      <ol className="flow-steps">
        <li><span className="step-num">1</span><div><b>Explora</b><p>Todas las propiedades del catálogo ya fueron revisadas por Agencia EH.</p></div></li>
        <li><span className="step-num">2</span><div><b>Compara</b><p>Revisa precio, metros y recámaras antes de decidir.</p></div></li>
        <li><span className="step-num">3</span><div><b>Contacta</b><p>Desde la ficha, escribe al asesor por WhatsApp o correo para agendar una visita.</p></div></li>
      </ol>
    </section>
  </PanelShell>}</ProtectedPanel>;
}
