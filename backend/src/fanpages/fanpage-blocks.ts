import { BadRequestException } from '@nestjs/common';
import { DEMO_PATH_RE, MEDIA_PATH_RE } from '../uploads/media';

/**
 * Fanpage por bloques. SEGURIDAD: nadie (ni el admin) escribe HTML, CSS ni scripts.
 * Solo se aceptan estos tipos de bloque con campos de texto plano, colores en
 * formato #RRGGBB, fuentes de una lista fija, fotos del propio sitio y videos de
 * YouTube/Vimeo (se guarda solo el ID). Todo lo demás se descarta al guardar.
 */
export const BLOCK_TYPES = ['hero', 'text', 'gallery', 'features', 'price', 'video', 'cta', 'contact', 'share', 'map'] as const;
export type BlockType = typeof BLOCK_TYPES[number];
export const FONTS = ['clasica', 'moderna', 'elegante', 'redonda'] as const;
export const TARGETS = ['contact', 'whatsapp', 'reserve', 'property'] as const;
export const BACKGROUNDS = ['light', 'dark', 'accent'] as const;
export const MAX_BLOCKS = 30;

export type Theme = { primary: string; accent: string; background: string; text: string; font: typeof FONTS[number] };
export type Block = { id: string; type: BlockType; hidden?: boolean; bg?: typeof BACKGROUNDS[number]; [k: string]: unknown };

export const DEFAULT_THEME: Theme = { primary: '#172536', accent: '#C5A46D', background: '#F7F5F0', text: '#333A40', font: 'clasica' };

const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9-]{1,40}$/i;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const pick = <T extends readonly string[]>(v: unknown, list: T, def: T[number]): T[number] => (list.includes(v as string) ? (v as T[number]) : def);
export const imageOk = (u: string) => MEDIA_PATH_RE.test(u) || DEMO_PATH_RE.test(u);

/** Extrae solo el ID de un video de YouTube o Vimeo (nunca se guarda una URL arbitraria). */
export function videoId(url: string): { provider: 'youtube' | 'vimeo'; id: string } | null {
  const u = url.trim();
  let m = u.match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return { provider: 'youtube', id: m[1] };
  m = u.match(/^(?:https?:\/\/)?(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})/i);
  if (m) return { provider: 'vimeo', id: m[1] };
  return null;
}

export function cleanTheme(t: any): Theme {
  t = t && typeof t === 'object' ? t : {};
  const color = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : d);
  return { primary: color(t.primary, DEFAULT_THEME.primary), accent: color(t.accent, DEFAULT_THEME.accent), background: color(t.background, DEFAULT_THEME.background), text: color(t.text, DEFAULT_THEME.text), font: pick(t.font, FONTS, 'clasica') };
}

/** Valida y normaliza la lista de bloques. Lanza error si algo no es válido. */
export function cleanBlocks(list: any): Block[] {
  if (!Array.isArray(list)) throw new BadRequestException('Los bloques deben ser una lista.');
  if (list.length > MAX_BLOCKS) throw new BadRequestException(`Máximo ${MAX_BLOCKS} bloques.`);
  const seen = new Set<string>();
  return list.map((b: any, i: number) => {
    if (!b || typeof b !== 'object') throw new BadRequestException(`Bloque ${i + 1} no válido.`);
    const type = b.type as BlockType;
    if (!BLOCK_TYPES.includes(type)) throw new BadRequestException(`Tipo de bloque no permitido: ${String(b.type).slice(0, 20)}.`);
    let id = typeof b.id === 'string' && ID.test(b.id) ? b.id : `b${i}-${Math.random().toString(36).slice(2, 8)}`;
    if (seen.has(id)) id = `${id}-${i}`; seen.add(id);
    const base: Block = { id, type, ...(b.hidden ? { hidden: true } : {}), bg: pick(b.bg, BACKGROUNDS, type === 'hero' || type === 'cta' ? 'dark' : 'light') };
    const button = () => ({ buttonText: str(b.buttonText, 40), target: pick(b.target, TARGETS, 'contact') });
    switch (type) {
      case 'hero': {
        const img = str(b.imageUrl, 500);
        if (img && !imageOk(img)) throw new BadRequestException('La foto de portada debe ser una foto subida al sitio.');
        return { ...base, title: str(b.title, 140), subtitle: str(b.subtitle, 300), imageUrl: img, ...button() };
      }
      case 'text': return { ...base, title: str(b.title, 140), body: str(b.body, 4000), align: pick(b.align, ['left', 'center'] as const, 'left') };
      case 'gallery': {
        const images = Array.isArray(b.images) ? b.images.map((u: unknown) => str(u, 500)).filter(Boolean).slice(0, 24) : [];
        for (const u of images) if (!imageOk(u)) throw new BadRequestException('Las fotos de la galería deben estar subidas al sitio.');
        return { ...base, title: str(b.title, 140), images, useProperty: images.length === 0 || !!b.useProperty, layout: pick(b.layout, ['grid', 'mosaic'] as const, 'grid') };
      }
      case 'features': {
        const items = Array.isArray(b.items) ? b.items.map((x: unknown) => str(x, 120)).filter(Boolean).slice(0, 30) : [];
        return { ...base, title: str(b.title, 140), items, auto: b.auto !== false };
      }
      case 'price': return { ...base, title: str(b.title, 140), note: str(b.note, 300), showRent: b.showRent !== false };
      case 'video': {
        const v = videoId(str(b.url, 300));
        if (str(b.url, 300) && !v) throw new BadRequestException('El video debe ser un enlace de YouTube o Vimeo.');
        return { ...base, title: str(b.title, 140), provider: v?.provider || null, videoId: v?.id || null };
      }
      case 'cta': return { ...base, title: str(b.title, 140), text: str(b.text, 400), ...button() };
      case 'contact': return { ...base, title: str(b.title, 140), text: str(b.text, 400), showWhatsapp: b.showWhatsapp !== false };
      case 'share': return { ...base, title: str(b.title, 140) };
      case 'map': return { ...base, title: str(b.title, 140) };
    }
  });
}

/** Fanpage inicial cuando el anunciante aún no diseña una (usa los datos de la propiedad). */
export function defaultBlocks(): Block[] {
  return [
    { id: 'hero', type: 'hero', bg: 'dark', title: '{titulo}', subtitle: '{colonia}, {ciudad}', imageUrl: '', buttonText: 'Quiero informes', target: 'contact' },
    { id: 'precio', type: 'price', bg: 'light', title: 'Precio', note: '', showRent: true },
    { id: 'galeria', type: 'gallery', bg: 'light', title: 'Galería', images: [], useProperty: true, layout: 'grid' },
    { id: 'descripcion', type: 'text', bg: 'light', title: 'Descripción', body: '{descripcion}', align: 'left' },
    { id: 'caracteristicas', type: 'features', bg: 'light', title: 'Características', items: [], auto: true },
    { id: 'ubicacion', type: 'map', bg: 'light', title: 'Ubicación' },
    { id: 'contacto', type: 'contact', bg: 'accent', title: '¿Te interesa?', text: 'Déjanos tus datos y el asesor te contactará.', showWhatsapp: true },
    { id: 'compartir', type: 'share', bg: 'light', title: 'Compártela' },
  ];
}

export const SEED_TEMPLATES: { name: string; description: string; theme: Theme; blocks: Block[] }[] = [
  { name: 'Clásica', description: 'Portada, precio, galería, descripción, características, mapa y contacto.', theme: DEFAULT_THEME, blocks: defaultBlocks() },
  {
    name: 'Vacacional', description: 'Para rentas por noche: fotos grandes, amenidades y botón de reservar.',
    theme: { primary: '#0E4F5C', accent: '#F2A65A', background: '#FFFDF8', text: '#22313A', font: 'redonda' },
    blocks: [
      { id: 'hero', type: 'hero', bg: 'dark', title: '{titulo}', subtitle: 'Tu escapada en {ciudad}', imageUrl: '', buttonText: 'Ver fechas y reservar', target: 'reserve' },
      { id: 'galeria', type: 'gallery', bg: 'light', title: 'Conoce el lugar', images: [], useProperty: true, layout: 'mosaic' },
      { id: 'texto', type: 'text', bg: 'light', title: 'Sobre el lugar', body: '{descripcion}', align: 'left' },
      { id: 'amenidades', type: 'features', bg: 'light', title: 'Amenidades', items: ['Wi-Fi', 'Estacionamiento', 'Cocina equipada'], auto: true },
      { id: 'cta', type: 'cta', bg: 'accent', title: 'Aparta tus fechas', text: 'Reserva en línea; el pago se hace en persona.', buttonText: 'Reservar', target: 'reserve' },
      { id: 'mapa', type: 'map', bg: 'light', title: 'Ubicación' },
      { id: 'compartir', type: 'share', bg: 'light', title: 'Compártelo con quien viaja contigo' },
    ],
  },
  {
    name: 'Preventa / Desarrollo', description: 'Para desarrolladoras: video, ventajas, precio de lanzamiento y contacto.',
    theme: { primary: '#1F2A44', accent: '#3FA796', background: '#FFFFFF', text: '#2B2F36', font: 'moderna' },
    blocks: [
      { id: 'hero', type: 'hero', bg: 'dark', title: '{titulo}', subtitle: 'Preventa en {ciudad}', imageUrl: '', buttonText: 'Agenda una cita', target: 'contact' },
      { id: 'video', type: 'video', bg: 'light', title: 'Recorrido', provider: null, videoId: null },
      { id: 'ventajas', type: 'features', bg: 'light', title: 'Por qué invertir aquí', items: ['Plusvalía en la zona', 'Entrega programada', 'Esquemas de pago flexibles'], auto: false },
      { id: 'precio', type: 'price', bg: 'accent', title: 'Precio de lanzamiento', note: 'Precio sujeto a cambio sin previo aviso.', showRent: false },
      { id: 'galeria', type: 'gallery', bg: 'light', title: 'Avance y acabados', images: [], useProperty: true, layout: 'grid' },
      { id: 'contacto', type: 'contact', bg: 'light', title: 'Recibe informes', text: 'Un asesor te enviará precios y planes de pago.', showWhatsapp: true },
      { id: 'compartir', type: 'share', bg: 'light', title: 'Compártelo' },
    ],
  },
];
