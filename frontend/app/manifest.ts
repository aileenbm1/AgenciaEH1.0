import type { MetadataRoute } from 'next';

/** PWA: la plataforma se puede instalar en el celular como una app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agencia EH · Propiedades en Guanajuato',
    short_name: 'Agencia EH',
    description: 'Busca, reserva y promociona propiedades en el Bajío.',
    lang: 'es-MX',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F5F0',
    theme_color: '#172536',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Buscar propiedades', url: '/propiedades', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Mis reservas', url: '/panel/reservas', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
