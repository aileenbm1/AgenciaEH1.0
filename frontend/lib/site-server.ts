// Solo servidor: lee el diseño publicado del sitio desde la API.
import { getJson } from './api-transport';
import { SiteConfig, withDefaults } from './site';

export async function getSite(): Promise<SiteConfig> {
  const { data } = await getJson<{ config: Partial<SiteConfig> | null }>('site');
  const site = withDefaults(data?.config);
  // Datos de contacto de las variables de entorno si el administrador no los ha escrito.
  const envPhone = (process.env.CONTACT_PHONE || '').replace(/[^\d+]/g, '');
  const envEmail = process.env.CONTACT_EMAIL || '';
  return {
    ...site,
    contact: { ...site.contact, email: site.contact.email || envEmail || 'contacto@agenciaeh.mx', whatsapp: site.contact.whatsapp || envPhone, phone: site.contact.phone || '' },
  };
}
