import { BadRequestException } from '@nestjs/common';
import { DEMO_PATH_RE, MEDIA_PATH_RE } from '../uploads/media';
import { videoId } from '../fanpages/fanpage-blocks';

/**
 * Diseño de todo el sitio (solo el administrador lo edita).
 * SEGURIDAD: igual que las fanpages, nadie escribe HTML, CSS ni scripts. Solo se
 * guardan textos planos, colores #RRGGBB, fuentes de una lista fija, fotos subidas
 * al propio sitio, IDs de videos de YouTube/Vimeo y enlaces seguros (rutas del
 * sitio, https://, mailto: y tel:). Todo lo demás se descarta o se rechaza.
 */
export const SITE_BLOCK_TYPES = ['hero', 'paths', 'cities', 'featured', 'banner', 'text', 'steps', 'faq', 'image', 'gallery', 'video', 'contact'] as const;
export type SiteBlockType = typeof SITE_BLOCK_TYPES[number];
export const SITE_FONTS = ['original', 'clasica', 'moderna', 'elegante', 'redonda'] as const;
export const SITE_BGS = ['light', 'soft', 'dark', 'accent'] as const;
export const SOCIALS = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x'] as const;
export const PAGE_KEYS = ['home', 'anunciar'] as const;
export const MAX_SITE_BLOCKS = 30;
export const MAX_EXTRA_PAGES = 12;
const RESERVED_SLUGS = ['inicio', 'admin', 'api', 'panel', 'propiedades', 'acceso', 'anunciar'];

const HEX = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9-]{1,40}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const pick = <T extends readonly string[]>(v: unknown, list: T, def: T[number]): T[number] => (list.includes(v as string) ? (v as T[number]) : def);
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
const color = (v: unknown, d: string) => (typeof v === 'string' && HEX.test(v) ? v.toUpperCase() : d);
const imageOk = (u: string) => MEDIA_PATH_RE.test(u) || DEMO_PATH_RE.test(u);

/** Enlace seguro: ruta del sitio (/algo), ancla (#algo), https://, mailto: o tel:. Nunca javascript:, data:, etc. */
export function safeHref(v: unknown, where: string): string {
  const s = str(v, 400);
  if (!s) return '';
  if (/^\/(?!\/)[^\s"'<>\\]*$/.test(s) || /^#[\w-]{1,60}$/.test(s)) return s;
  if (/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?::\d{2,5})?(?:[/?#][^\s"'<>\\]*)?$/i.test(s)) return s;
  if (/^mailto:[^\s"'<>\\@]+@[^\s"'<>\\@]+$/i.test(s)) return s;
  if (/^tel:\+?[\d\s()-]{7,20}$/i.test(s)) return s.replace(/\s/g, '');
  throw new BadRequestException(`Enlace no permitido en ${where}: usa una dirección del sitio (empieza con /), https://, mailto: o tel:.`);
}
const image = (v: unknown, where: string) => {
  const u = str(v, 500);
  if (u && !imageOk(u)) throw new BadRequestException(`La imagen de ${where} debe ser una foto subida al sitio.`);
  return u;
};
const link = (l: any, where: string) => ({ label: str(l?.label, 40), href: safeHref(l?.href, where) });
const links = (list: unknown, max: number, where: string) => (Array.isArray(list) ? list.slice(0, max).map((l) => link(l, where)).filter((l) => l.label && l.href) : []);

export type SiteBlock = { id: string; type: SiteBlockType; hidden?: boolean; bg: typeof SITE_BGS[number]; [k: string]: unknown };

/** Valida y normaliza los bloques de una página del sitio. */
export function cleanSiteBlocks(list: unknown, page: string): SiteBlock[] {
  if (!Array.isArray(list)) throw new BadRequestException(`Los bloques de "${page}" deben ser una lista.`);
  if (list.length > MAX_SITE_BLOCKS) throw new BadRequestException(`Máximo ${MAX_SITE_BLOCKS} bloques por página.`);
  const seen = new Set<string>();
  return list.map((b: any, i: number) => {
    if (!b || typeof b !== 'object') throw new BadRequestException(`Bloque ${i + 1} de "${page}" no válido.`);
    const type = b.type as SiteBlockType;
    if (!SITE_BLOCK_TYPES.includes(type)) throw new BadRequestException(`Tipo de bloque no permitido: ${String(b.type).slice(0, 20)}.`);
    let id = typeof b.id === 'string' && ID.test(b.id) ? b.id : `b${i}-${Math.random().toString(36).slice(2, 8)}`;
    if (seen.has(id)) id = `${id}-${i}`;
    seen.add(id);
    const where = `"${page}", bloque ${i + 1}`;
    const head = { eyebrow: str(b.eyebrow, 80), title: str(b.title, 160), copy: str(b.copy, 400) };
    const base: SiteBlock = { id, type, ...(b.hidden ? { hidden: true } : {}), bg: pick(b.bg, SITE_BGS, type === 'hero' || type === 'banner' ? 'dark' : 'light') };
    switch (type) {
      case 'hero':
        return { ...base, eyebrow: head.eyebrow, title: head.title, highlight: str(b.highlight, 120), text: str(b.text, 400), imageUrl: image(b.imageUrl, where),
          button1: link(b.button1, where), button2: link(b.button2, where), showSearch: bool(b.showSearch, true), searchTitle: str(b.searchTitle, 80), searchNote: str(b.searchNote, 80) };
      case 'paths': {
        const cards = Array.isArray(b.cards) ? b.cards.slice(0, 6).map((c: any) => ({ badge: str(c?.badge, 40), title: str(c?.title, 80), text: str(c?.text, 300), linkText: str(c?.linkText, 50), href: safeHref(c?.href, where) })) : [];
        return { ...base, ...head, cards };
      }
      case 'cities': return { ...base, ...head };
      case 'featured':
        return { ...base, ...head, count: [4, 8, 12].includes(Number(b.count)) ? Number(b.count) : 4, operation: pick(b.operation, ['', 'RENT', 'SALE'] as const, ''), buttonText: str(b.buttonText, 50), emptyText: str(b.emptyText, 200) };
      case 'banner':
        return { ...base, eyebrow: head.eyebrow, title: head.title, highlight: str(b.highlight, 120), text: str(b.text, 500), button: link(b.button, where) };
      case 'text': return { ...base, ...head, body: str(b.body, 6000), align: pick(b.align, ['left', 'center'] as const, 'left'), button: link(b.button, where) };
      case 'steps': {
        const items = Array.isArray(b.items) ? b.items.slice(0, 10).map((x: any) => ({ title: str(x?.title, 80), text: str(x?.text, 300) })).filter((x: any) => x.title || x.text) : [];
        return { ...base, ...head, items };
      }
      case 'faq': {
        const items = Array.isArray(b.items) ? b.items.slice(0, 25).map((x: any) => ({ q: str(x?.q, 200), a: str(x?.a, 1500) })).filter((x: any) => x.q) : [];
        return { ...base, ...head, items };
      }
      case 'image': return { ...base, ...head, imageUrl: image(b.imageUrl, where), caption: str(b.caption, 200), wide: bool(b.wide, false) };
      case 'gallery': {
        const images = Array.isArray(b.images) ? b.images.slice(0, 16).map((u: unknown) => image(u, where)).filter(Boolean) : [];
        return { ...base, ...head, images };
      }
      case 'video': {
        const url = str(b.url, 300);
        const v = videoId(url);
        if (url && !v) throw new BadRequestException(`El video de ${where} debe ser un enlace de YouTube o Vimeo.`);
        return { ...base, ...head, provider: v?.provider || null, videoId: v?.id || null };
      }
      case 'contact':
        return { ...base, ...head, showEmail: bool(b.showEmail, true), showWhatsapp: bool(b.showWhatsapp, true), emailText: str(b.emailText, 50), whatsappText: str(b.whatsappText, 50),
          subject: str(b.subject, 120), message: str(b.message, 600) };
    }
  });
}

/** Valida todo el diseño del sitio. Lanza error con un mensaje claro si algo no es válido. */
export function cleanSiteConfig(c: any) {
  c = c && typeof c === 'object' ? c : {};
  const brand = c.brand || {}, theme = c.theme || {}, header = c.header || {}, footer = c.footer || {}, contact = c.contact || {};
  const social: Record<string, string> = {};
  for (const k of SOCIALS) {
    const u = str(footer.social?.[k], 300);
    if (!u) continue;
    if (!/^https:\/\/[^\s"'<>\\]+$/i.test(u)) throw new BadRequestException(`El enlace de ${k} debe empezar con https://`);
    social[k] = u;
  }
  const email = str(contact.email, 120);
  if (email && !/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(email)) throw new BadRequestException('El correo de contacto no es válido.');
  const pages: Record<string, SiteBlock[]> = {};
  for (const k of PAGE_KEYS) if (c.pages?.[k] !== undefined) pages[k] = cleanSiteBlocks(c.pages[k], k === 'home' ? 'Inicio' : 'Anunciar');
  const extra = Array.isArray(c.extra) ? c.extra.slice(0, MAX_EXTRA_PAGES) : [];
  const slugs = new Set<string>();
  const cleanExtra = extra.map((p: any, i: number) => {
    const slug = str(p?.slug, 60).toLowerCase();
    const title = str(p?.title, 100);
    if (!title) throw new BadRequestException(`La página extra ${i + 1} necesita un título.`);
    if (!SLUG.test(slug) || RESERVED_SLUGS.includes(slug)) throw new BadRequestException(`La dirección "/p/${slug}" no es válida: usa minúsculas, números y guiones.`);
    if (slugs.has(slug)) throw new BadRequestException(`Hay dos páginas con la dirección "/p/${slug}".`);
    slugs.add(slug);
    return { slug, title, description: str(p?.description, 200), inHeader: bool(p?.inHeader, false), inFooter: bool(p?.inFooter, true), blocks: cleanSiteBlocks(p?.blocks || [], title) };
  });
  return {
    brand: { name: str(brand.name, 40), tagline: str(brand.tagline, 70), mark: str(brand.mark, 4), logoUrl: image(brand.logoUrl, 'el logotipo'), logoOnly: bool(brand.logoOnly, false) },
    theme: { primary: color(theme.primary, '#172536'), accent: color(theme.accent, '#C5A46D'), background: color(theme.background, '#F7F5F0'), text: color(theme.text, '#333A40'), font: pick(theme.font, SITE_FONTS, 'original') },
    header: { links: links(header.links, 6, 'el encabezado'), buttonText: str(header.buttonText, 40), buttonHref: safeHref(header.buttonHref, 'el encabezado') },
    contact: { email, phone: str(contact.phone, 25).replace(/[^\d+\s()-]/g, ''), whatsapp: str(contact.whatsapp, 25).replace(/[^\d+]/g, ''), address: str(contact.address, 200) },
    footer: {
      about: str(footer.about, 400), bottom: str(footer.bottom, 160),
      columns: Array.isArray(footer.columns) ? footer.columns.slice(0, 4).map((col: any) => ({ title: str(col?.title, 40), links: links(col?.links, 8, 'el pie de página'), auto: pick(col?.auto, ['', 'municipios'] as const, '') })) : [],
      social,
    },
    pages,
    extra: cleanExtra,
  };
}
export type SiteConfig = ReturnType<typeof cleanSiteConfig>;
