// Fanpage por bloques: tipos, catálogo de bloques y utilidades compartidas por la página pública y el editor.
// Nadie escribe HTML ni CSS: solo textos, fotos del sitio, colores (#RRGGBB) y fuentes de una lista fija.
import { ApiProperty } from './properties';
import { mxn } from './data';

export type Theme = { primary: string; accent: string; background: string; text: string; font: 'clasica' | 'moderna' | 'elegante' | 'redonda' };
export type BlockType = 'hero' | 'text' | 'gallery' | 'features' | 'price' | 'video' | 'cta' | 'contact' | 'share' | 'map' | 'reserve' | 'agent';
export type Block = { id: string; type: BlockType; hidden?: boolean; bg?: 'light' | 'dark' | 'accent'; [k: string]: any };
export type FanpageData = { custom: boolean; theme: Theme; blocks: Block[] };

export const FONTS: Record<Theme['font'], { label: string; title: string; body: string }> = {
  clasica: { label: 'Clásica', title: 'Georgia, "Times New Roman", serif', body: 'Arial, Helvetica, sans-serif' },
  moderna: { label: 'Moderna', title: '"Helvetica Neue", Arial, sans-serif', body: '"Helvetica Neue", Arial, sans-serif' },
  elegante: { label: 'Elegante', title: '"Palatino Linotype", "Book Antiqua", Palatino, serif', body: 'Georgia, serif' },
  redonda: { label: 'Redonda', title: '"Trebuchet MS", Verdana, sans-serif', body: 'Verdana, Geneva, sans-serif' },
};

export const PALETTES: { name: string; theme: Omit<Theme, 'font'> }[] = [
  { name: 'Agencia EH', theme: { primary: '#172536', accent: '#C5A46D', background: '#F7F5F0', text: '#333A40' } },
  { name: 'Mar', theme: { primary: '#0E4F5C', accent: '#F2A65A', background: '#FFFDF8', text: '#22313A' } },
  { name: 'Bosque', theme: { primary: '#2F4A3A', accent: '#C9A227', background: '#F6F4EE', text: '#2E3430' } },
  { name: 'Moderno', theme: { primary: '#1F2A44', accent: '#3FA796', background: '#FFFFFF', text: '#2B2F36' } },
  { name: 'Terracota', theme: { primary: '#5B2E1F', accent: '#D98E5F', background: '#FBF6F1', text: '#3A2C26' } },
];

export const BLOCKS: Record<BlockType, { label: string; icon: string; help: string; make: () => Omit<Block, 'id'> }> = {
  hero: { icon: '🖼', label: 'Portada', help: 'Foto grande con título y botón.', make: () => ({ type: 'hero', bg: 'dark', title: '{titulo}', subtitle: '{colonia}, {ciudad}', imageUrl: '', buttonText: 'Quiero informes', target: 'contact' }) },
  text: { icon: '📝', label: 'Texto', help: 'Título y párrafos.', make: () => ({ type: 'text', bg: 'light', title: 'Título', body: 'Escribe aquí.', align: 'left' }) },
  gallery: { icon: '📷', label: 'Galería', help: 'Fotos de la propiedad.', make: () => ({ type: 'gallery', bg: 'light', title: 'Galería', images: [], useProperty: true, layout: 'grid' }) },
  features: { icon: '✅', label: 'Características', help: 'Lista de ventajas y datos.', make: () => ({ type: 'features', bg: 'light', title: 'Características', items: [], auto: true }) },
  price: { icon: '💰', label: 'Precio', help: 'Precio de venta y/o renta.', make: () => ({ type: 'price', bg: 'light', title: 'Precio', note: '', showRent: true }) },
  video: { icon: '▶️', label: 'Video', help: 'Enlace de YouTube o Vimeo.', make: () => ({ type: 'video', bg: 'light', title: 'Recorrido en video', url: '' }) },
  cta: { icon: '📣', label: 'Llamado a la acción', help: 'Texto destacado con botón.', make: () => ({ type: 'cta', bg: 'accent', title: '¿Te gustó?', text: 'Agenda una visita hoy.', buttonText: 'Agendar visita', target: 'contact' }) },
  contact: { icon: '✉️', label: 'Formulario de contacto', help: 'Mensaje o visita; llega como prospecto.', make: () => ({ type: 'contact', bg: 'light', title: '¿Te interesa?', text: 'Déjanos tus datos.', showWhatsapp: true }) },
  share: { icon: '🔗', label: 'Compartir', help: 'Botones para redes sociales.', make: () => ({ type: 'share', bg: 'light', title: 'Compártela' }) },
  map: { icon: '📍', label: 'Mapa', help: 'Ubicación de la propiedad; se elige aquí mismo.', make: () => ({ type: 'map', bg: 'light', title: 'Ubicación', note: '' }) },
  reserve: { icon: '📅', label: 'Reserva en línea', help: 'Calendario y cotización para rentar o apartar.', make: () => ({ type: 'reserve', bg: 'light', title: 'Reserva en línea', text: 'Elige tus fechas; el pago es por transferencia o en efectivo.' }) },
  agent: { icon: '👤', label: 'Asesor', help: 'Foto, nombre y WhatsApp del asesor.', make: () => ({ type: 'agent', bg: 'light', title: 'Tu asesor', text: '', showWhatsapp: true }) },
};
export const TARGETS: Record<string, string> = { contact: 'Ir al formulario de contacto', whatsapp: 'Abrir WhatsApp del asesor', reserve: 'Reservar / apartar en línea', property: 'Ver ficha completa' };

export const newId = () => Math.random().toString(36).slice(2, 10);

/** Sustituye {titulo}, {precio}, etc. por los datos de la propiedad (texto plano). */
export function fill(text: string, p: ApiProperty) {
  const vals: Record<string, string> = {
    titulo: p.title, precio: mxn(Number(p.price)), renta: p.rentPrice ? mxn(Number(p.rentPrice)) : '', colonia: p.neighborhood || p.municipality, ciudad: p.municipality,
    descripcion: p.description || '', recamaras: String(p.bedrooms ?? ''), banos: String(p.bathrooms ?? ''), m2: String(Number(p.builtArea || p.landArea || 0) || ''), tipo: p.propertyType,
  };
  return String(text || '').replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m));
}

export const TOKENS_HELP = 'Puedes usar {titulo}, {precio}, {renta}, {colonia}, {ciudad}, {descripcion}, {recamaras}, {banos}, {m2} y {tipo}.';

/** Extrae el ID de un video de YouTube/Vimeo (igual que el servidor). */
export function videoEmbed(b: Block): string | null {
  let provider = b.provider as string | null, id = b.videoId as string | null;
  if (b.url) {
    const u = String(b.url).trim();
    let m = u.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) { provider = 'youtube'; id = m[1]; }
    else { m = u.match(/^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})/i); if (m) { provider = 'vimeo'; id = m[1]; } else { provider = null; id = null; } }
  }
  if (provider === 'youtube' && id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  if (provider === 'vimeo' && id && /^\d{6,12}$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  return null;
}
/** URL editable para el campo de video del editor. */
export const videoUrl = (b: Block) => b.url ?? (b.provider === 'youtube' && b.videoId ? `https://youtu.be/${b.videoId}` : b.provider === 'vimeo' && b.videoId ? `https://vimeo.com/${b.videoId}` : '');
