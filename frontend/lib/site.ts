// Diseño de todo el sitio (lo edita solo el administrador, por bloques).
// Nadie escribe HTML ni CSS: solo textos, fotos del sitio, colores (#RRGGBB),
// fuentes de una lista fija, videos de YouTube/Vimeo y enlaces seguros.
import { FONTS as FP_FONTS } from './fanpage';

export type SiteFont = 'original' | 'clasica' | 'moderna' | 'elegante' | 'redonda';
export type SiteBg = 'light' | 'soft' | 'dark' | 'accent';
export type SiteLink = { label: string; href: string };
export type SiteBlockType = 'hero' | 'paths' | 'values' | 'cities' | 'featured' | 'banner' | 'text' | 'steps' | 'faq' | 'image' | 'gallery' | 'video' | 'contact';
export type SiteBlock = { id: string; type: SiteBlockType; hidden?: boolean; bg: SiteBg; [k: string]: any };
export type SitePageKey = 'home' | 'anunciar';
export type ExtraPage = { slug: string; title: string; description: string; inHeader: boolean; inFooter: boolean; blocks: SiteBlock[] };
export type FooterColumn = { title: string; links: SiteLink[]; auto: '' | 'municipios' };
export type SiteConfig = {
  brand: { name: string; tagline: string; mark: string; logoUrl: string; logoOnly: boolean };
  theme: { primary: string; accent: string; secondary: string; background: string; text: string; font: SiteFont; pattern: boolean };
  header: { links: SiteLink[]; buttonText: string; buttonHref: string };
  contact: { email: string; phone: string; whatsapp: string; address: string };
  footer: { about: string; bottom: string; columns: FooterColumn[]; social: Partial<Record<Social, string>> };
  pages: Partial<Record<SitePageKey, SiteBlock[]>>;
  extra: ExtraPage[];
};
export type Social = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x';
export const SOCIAL_LABEL: Record<Social, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X (Twitter)' };

export const SITE_FONTS: Record<SiteFont, { label: string; title: string; body: string }> = {
  original: { label: 'Original (Playfair + Montserrat)', title: "'Playfair Display',Georgia,serif", body: 'Montserrat,system-ui,Arial,sans-serif' },
  ...FP_FONTS,
};

export const SITE_PALETTES: { name: string; theme: Omit<SiteConfig['theme'], 'font' | 'pattern'> }[] = [
  { name: 'Mi Casa', theme: { primary: '#0F172A', accent: '#C9A36A', secondary: '#E7E1D8', background: '#F6F5F2', text: '#2B3140' } },
  { name: 'Mi Casa clásico', theme: { primary: '#172536', accent: '#C5A46D', secondary: '#EFECE6', background: '#F7F5F0', text: '#333A40' } },
  { name: 'Mar', theme: { primary: '#0E4F5C', accent: '#F2A65A', secondary: '#E6EEEC', background: '#FFFDF8', text: '#22313A' } },
  { name: 'Bosque', theme: { primary: '#2F4A3A', accent: '#C9A227', secondary: '#E7E9DF', background: '#F6F4EE', text: '#2E3430' } },
  { name: 'Moderno', theme: { primary: '#1F2A44', accent: '#3FA796', secondary: '#E8EDF2', background: '#FFFFFF', text: '#2B2F36' } },
  { name: 'Terracota', theme: { primary: '#5B2E1F', accent: '#D98E5F', secondary: '#F0E3D8', background: '#FBF6F1', text: '#3A2C26' } },
];

/** Íconos de línea del bloque "Íconos con texto". */
export const SITE_ICON_LABEL: Record<string, string> = { casa: 'Casa', escudo: 'Escudo (confianza)', personas: 'Personas (cercanía)', estrella: 'Estrella', saludo: 'Apretón de manos (asesoría)', documento: 'Documento (trámites)', ubicacion: 'Ubicación', llave: 'Llave', corazon: 'Corazón', edificio: 'Edificio', reloj: 'Reloj', brillo: 'Brillo' };

export const PAGE_LABEL: Record<SitePageKey, { label: string; path: string }> = {
  home: { label: 'Inicio', path: '/' },
  anunciar: { label: 'Anunciar', path: '/anunciar' },
};

export const SITE_BLOCKS: Record<SiteBlockType, { icon: string; label: string; help: string; make: () => Omit<SiteBlock, 'id'> }> = {
  hero: { icon: '🖼', label: 'Portada', help: 'Foto grande con título, botones y buscador.', make: () => ({ type: 'hero', bg: 'dark', eyebrow: 'TU FRASE CORTA', title: 'Título principal', highlight: 'segunda línea', text: 'Texto de presentación.', imageUrl: '', button1: { label: 'Explorar propiedades ↗', href: '/propiedades' }, button2: { label: '', href: '' }, showSearch: false, searchTitle: 'Encuentra tu próximo espacio', searchNote: 'No necesitas cuenta para buscar' }) },
  paths: { icon: '🧭', label: 'Tarjetas con enlace', help: 'De 1 a 6 tarjetas que llevan a otra página.', make: () => ({ type: 'paths', bg: 'light', eyebrow: 'SECCIÓN', title: 'Título', copy: '', cards: [{ badge: 'Etiqueta', title: 'Tarjeta', text: 'Descripción breve.', linkText: 'Ver más →', href: '/propiedades' }] }) },
  values: { icon: '✨', label: 'Íconos con texto', help: 'Valores, servicios o ventajas con íconos.', make: () => ({ type: 'values', bg: 'soft', layout: 'cards', eyebrow: '', title: 'Nuestros valores', copy: '', items: [{ icon: 'escudo', title: 'Confianza', text: '' }, { icon: 'personas', title: 'Cercanía', text: '' }, { icon: 'estrella', title: 'Profesionalismo', text: '' }] }) },
  cities: { icon: '📍', label: 'Municipios', help: 'Botones a cada municipio del catálogo.', make: () => ({ type: 'cities', bg: 'soft', eyebrow: 'EXPLORA GUANAJUATO', title: 'Encuentra el lugar ideal', copy: '' }) },
  featured: { icon: '🏠', label: 'Propiedades', help: 'Las propiedades publicadas más recientes.', make: () => ({ type: 'featured', bg: 'light', eyebrow: 'SELECCIÓN MI CASA', title: 'Propiedades recientes', copy: '', count: 4, operation: '', buttonText: 'Ver todas las propiedades', emptyText: '' }) },
  banner: { icon: '📣', label: 'Franja destacada', help: 'Título grande con botón sobre el color principal.', make: () => ({ type: 'banner', bg: 'dark', eyebrow: 'FRASE CORTA', title: 'Título del anuncio', highlight: '', text: '', button: { label: 'Contáctanos', href: '/anunciar' } }) },
  text: { icon: '📝', label: 'Texto', help: 'Título y párrafos, con botón opcional.', make: () => ({ type: 'text', bg: 'light', eyebrow: '', title: 'Título', copy: '', body: 'Escribe aquí.', align: 'left', button: { label: '', href: '' } }) },
  steps: { icon: '🔢', label: 'Pasos', help: 'Lista numerada (cómo funciona).', make: () => ({ type: 'steps', bg: 'light', eyebrow: '', title: '¿Cómo funciona?', copy: '', items: [{ title: 'Paso 1', text: '' }, { title: 'Paso 2', text: '' }, { title: 'Paso 3', text: '' }] }) },
  faq: { icon: '❓', label: 'Preguntas frecuentes', help: 'Preguntas que se abren al tocarlas.', make: () => ({ type: 'faq', bg: 'light', eyebrow: '', title: 'Preguntas frecuentes', copy: '', items: [{ q: '¿Pregunta?', a: 'Respuesta.' }] }) },
  image: { icon: '🌄', label: 'Imagen', help: 'Una foto con texto al pie.', make: () => ({ type: 'image', bg: 'light', eyebrow: '', title: '', copy: '', imageUrl: '', caption: '', wide: false }) },
  gallery: { icon: '📷', label: 'Galería', help: 'Varias fotos: cuadrícula, mosaico, tira, presentación y más.', make: () => ({ type: 'gallery', bg: 'light', eyebrow: '', title: 'Galería', copy: '', images: [], names: [], style: 'grid', cols: 3, gap: 's', ratio: '43', corners: 'round', lightbox: true, captions: false, autoplay: true, limit: 0, frame: false, zoom: false, mobileStrip: false }) },
  video: { icon: '▶️', label: 'Video', help: 'Enlace de YouTube o Vimeo.', make: () => ({ type: 'video', bg: 'light', eyebrow: '', title: 'Video', copy: '', url: '' }) },
  contact: { icon: '✉️', label: 'Botones de contacto', help: 'Correo y WhatsApp con mensaje listo.', make: () => ({ type: 'contact', bg: 'light', eyebrow: '', title: 'Escríbenos', copy: '', showEmail: true, showWhatsapp: true, emailText: 'Escribir por correo', whatsappText: 'Escribir por WhatsApp', subject: 'Información', message: 'Hola, quiero información.' }) },
};

export const BG_LABEL: Record<SiteBg, string> = { light: 'Claro', soft: 'Arena (suave)', dark: 'Oscuro (color principal)', accent: 'Acento' };

/** Diseño original del sitio: lo que se ve mientras el administrador no publique cambios. */
export const DEFAULT_SITE: SiteConfig = {
  brand: { name: 'Mi Casa', tagline: 'AGENCIA INMOBILIARIA', mark: '', logoUrl: '', logoOnly: false },
  theme: { primary: '#0F172A', accent: '#C9A36A', secondary: '#E7E1D8', background: '#F6F5F2', text: '#2B3140', font: 'original', pattern: true },
  header: { links: [{ label: 'Explorar propiedades', href: '/propiedades' }, { label: 'Comparar', href: '/comparar' }], buttonText: 'Anunciar propiedad', buttonHref: '/anunciar' },
  contact: { email: '', phone: '', whatsapp: '', address: 'Guanajuato, México' },
  footer: {
    about: 'Propiedades en renta y venta en Guanajuato, revisadas por nuestro equipo antes de publicarse.',
    bottom: '© {año} Mi Casa · Guanajuato, México',
    columns: [
      { title: 'Explorar', auto: '', links: [{ label: 'Propiedades en renta', href: '/propiedades?operation=RENT' }, { label: 'Propiedades en venta', href: '/propiedades?operation=SALE' }, { label: 'Comparar', href: '/comparar' }] },
      { title: 'Municipios', auto: 'municipios', links: [] },
      { title: 'Anunciantes', auto: '', links: [{ label: 'Soy agente', href: '/anunciar' }, { label: 'Soy agencia', href: '/anunciar' }, { label: 'Soy desarrollador', href: '/anunciar' }, { label: 'Ingresar', href: '/acceso' }] },
    ],
    social: { facebook: 'https://facebook.com', instagram: 'https://instagram.com', linkedin: 'https://linkedin.com' },
  },
  pages: {
    home: [
      { id: 'portada', type: 'hero', bg: 'dark', eyebrow: 'ESPACIOS QUE ENCUENTRAN SU LUGAR', title: 'Tu próximo espacio', highlight: 'comienza aquí.', text: 'Encuentra propiedades para vivir, invertir o hacer crecer tu negocio en Guanajuato.', imageUrl: '',
        button1: { label: 'Explorar propiedades ↗', href: '/propiedades' }, button2: { label: 'Crear cuenta gratis →', href: '/acceso?registro=1' }, showSearch: true, searchTitle: 'Encuentra tu próximo espacio', searchNote: 'No necesitas cuenta para buscar' },
      { id: 'caminos', type: 'paths', bg: 'light', eyebrow: '¿QUÉ TE TRAE POR AQUÍ?', title: 'Elige tu camino', copy: 'La plataforma funciona distinto según lo que necesites.', cards: [
        { badge: 'Busco propiedad', title: 'Comprar o rentar', text: 'Explora el catálogo y contacta al asesor sin cuenta. Crea tu cuenta gratis para rentar o apartar en línea.', linkText: 'Explorar catálogo →', href: '/propiedades' },
        { badge: 'Agente / Asesor', title: 'Anunciar mis propiedades', text: 'Registra tus inmuebles; Mi Casa los revisa y, al aprobarlos, aparecen en el catálogo.', linkText: 'Solicitar cuenta de agente →', href: '/anunciar' },
        { badge: 'Agencia', title: 'Publicar como inmobiliaria', text: 'Publica a nombre de tu agencia con tu equipo de asesores; el administrador crea las cuentas.', linkText: 'Solicitar cuenta de agencia →', href: '/anunciar' },
      ] },
      { id: 'valores', type: 'values', bg: 'soft', layout: 'cards', eyebrow: '¿POR QUÉ MI CASA?', title: 'Te acompañamos hasta tu hogar ideal', copy: 'MI CASA es una agencia inmobiliaria que conecta personas con el hogar ideal, brindando confianza, cercanía y acompañamiento profesional.', items: [
        { icon: 'escudo', title: 'Confianza', text: 'Cada propiedad se revisa antes de publicarse.' },
        { icon: 'personas', title: 'Cercanía', text: 'Un asesor te acompaña en cada paso.' },
        { icon: 'estrella', title: 'Profesionalismo', text: 'Procesos claros, contratos y pagos en orden.' },
        { icon: 'casa', title: 'Hogares reales', text: 'Fotos y datos reales de cada inmueble.' },
      ] },
      { id: 'municipios', type: 'cities', bg: 'light', eyebrow: 'EXPLORA GUANAJUATO', title: 'Encuentra el lugar ideal', copy: 'Propiedades en las principales ciudades del Bajío.' },
      { id: 'recientes', type: 'featured', bg: 'light', eyebrow: 'SELECCIÓN MI CASA', title: 'Propiedades recientes', copy: 'Todas fueron revisadas por nuestro equipo antes de publicarse.', count: 4, operation: '', buttonText: 'Ver todas las propiedades', emptyText: 'Próximamente encontrarás aquí las propiedades publicadas y aprobadas por Mi Casa.' },
      { id: 'anunciantes', type: 'banner', bg: 'dark', eyebrow: '¿TIENES UNA PROPIEDAD?', title: 'Tu inmueble merece', highlight: 'la mejor vitrina.', text: 'Solicita tu cuenta de agente, agencia o desarrollador: el equipo de Mi Casa la crea y te envía tu enlace de activación. Después registra tus propiedades y envíalas a revisión.', button: { label: 'Anunciar mi propiedad ↗', href: '/anunciar' } },
    ],
    anunciar: [
      { id: 'intro', type: 'text', bg: 'light', eyebrow: 'ANUNCIA CON NOSOTROS', title: 'Solicita tu cuenta de anunciante', copy: '', body: 'Las cuentas de agentes, agencias y desarrolladoras las crea el administrador de Mi Casa. Escríbenos con tus datos y te enviaremos un enlace para activar tu cuenta y elegir tu contraseña.', align: 'left', button: { label: '', href: '' } },
      { id: 'servicios', type: 'values', bg: 'light', layout: 'row', eyebrow: 'LO QUE HACEMOS POR TI', title: '', copy: '', items: [
        { icon: 'casa', title: 'Propiedades', text: 'Publicamos y promovemos tus inmuebles.' },
        { icon: 'saludo', title: 'Asesoría', text: 'Te orientamos en precio, renta o venta.' },
        { icon: 'documento', title: 'Trámites', text: 'Contratos, reservas y pagos en orden.' },
        { icon: 'ubicacion', title: 'Ubicación', text: 'Mapa y zona de cada propiedad.' },
      ] },
      { id: 'pasos', type: 'steps', bg: 'light', eyebrow: '', title: '', copy: '', items: [
        { title: 'Solicítala', text: 'Por correo o WhatsApp con tu nombre, tipo de cuenta y empresa.' },
        { title: 'La creamos', text: 'Recibes un enlace de activación por correo.' },
        { title: 'Publica y vende', text: 'Registra propiedades, recibe prospectos y acepta reservas en línea.' },
      ] },
      { id: 'solicitar', type: 'contact', bg: 'light', eyebrow: '', title: '', copy: '', showEmail: true, showWhatsapp: true, emailText: 'Solicitar por correo', whatsappText: 'Solicitar por WhatsApp', subject: 'Solicitud de cuenta de anunciante',
        message: 'Hola, quiero una cuenta para anunciar en Mi Casa.\n\nTipo de cuenta (agente / agencia / desarrolladora):\nNombre:\nNombre de la empresa (si aplica):\nTeléfono:\nCiudad:' },
      { id: 'compradores', type: 'text', bg: 'light', eyebrow: '', title: '', copy: '', body: '¿Buscas comprar o rentar? Crea tu cuenta de comprador al instante.', align: 'left', button: { label: 'Crear cuenta de comprador', href: '/acceso?registro=1' } },
    ],
  },
  extra: [],
};

/** Completa con el diseño original lo que falte (p. ej. páginas que nunca se editaron). */
export function withDefaults(c: Partial<SiteConfig> | null | undefined): SiteConfig {
  if (!c) return DEFAULT_SITE;
  const d = DEFAULT_SITE;
  return {
    brand: { ...d.brand, ...(c.brand || {}) },
    theme: { ...d.theme, ...(c.theme || {}) },
    header: { ...d.header, ...(c.header || {}) },
    contact: { ...d.contact, ...(c.contact || {}) },
    footer: { ...d.footer, ...(c.footer || {}) },
    pages: { home: c.pages?.home ?? d.pages.home, anunciar: c.pages?.anunciar ?? d.pages.anunciar },
    extra: c.extra ?? [],
  };
}

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
/** Mezcla un color con blanco (t>0) o negro (t<0). */
export function shade(h: string, t: number) {
  if (!/^#[0-9a-f]{6}$/i.test(h)) return h;
  const [r, g, b] = hex(h), to = t < 0 ? 0 : 255, k = Math.abs(t);
  return '#' + [r, g, b].map(v => Math.round(v + (to - v) * k).toString(16).padStart(2, '0')).join('');
}
export const rgba = (h: string, a: number) => /^#[0-9a-f]{6}$/i.test(h) ? `rgba(${hex(h).join(',')},${a})` : h;

/** Variables de color y fuente del sitio. Los valores ya vienen validados (#RRGGBB y lista fija de fuentes). */
export function themeCss(t: SiteConfig['theme']) {
  const ok = (v: string | undefined, d: string) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const primary = ok(t.primary, '#0F172A'), accent = ok(t.accent, '#C9A36A'), bg = ok(t.background, '#F6F5F2'), text = ok(t.text, '#2B3140'), sec = ok(t.secondary, '#E7E1D8');
  const f = SITE_FONTS[t.font] || SITE_FONTS.original;
  // Secundario: fondos suaves, tarjetas y bordes. El dorado claro y oscuro se calculan del acento.
  return `:root{--navy:${primary};--navy-hover:${shade(primary, 0.12)};--gold:${accent};--gold-light:${shade(accent, 0.35)};--gold-ink:${shade(accent, -0.3)};--ivory:${bg};--ink:${text};--soft:${sec};--surface:${shade(sec, 0.45)};--line:${shade(sec, -0.07)};--sand:${shade(sec, -0.16)};--font-title:${f.title};--font-body:${f.body};--focus:0 0 0 4px ${rgba(primary, 0.14)}}`;
}

/** Sustituye {año} en los textos. */
export const tokens = (s: string) => s.replace(/\{a(?:ñ|n)o\}/gi, String(new Date().getFullYear()));
export const isExternal = (href: string) => /^(https?:|mailto:|tel:)/i.test(href);
export const waLink = (phone: string, text = '') => { const d = phone.replace(/\D/g, ''); if (!d) return ''; return `https://wa.me/${d.length === 10 ? '52' + d : d}${text ? `?text=${encodeURIComponent(text)}` : ''}`; };
export const newSiteId = () => Math.random().toString(36).slice(2, 10);
export function videoSrc(b: SiteBlock): string | null {
  let provider = b.provider as string | null, id = b.videoId as string | null;
  if (b.url) {
    const u = String(b.url).trim();
    let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) { provider = 'youtube'; id = m[1]; } else if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/i))) { provider = 'vimeo'; id = m[1]; } else return null;
  }
  if (!id) return null;
  return provider === 'vimeo' ? `https://player.vimeo.com/video/${id}` : `https://www.youtube-nocookie.com/embed/${id}`;
}
export const videoUrlOf = (b: SiteBlock) => b.url ?? (b.videoId ? (b.provider === 'vimeo' ? `https://vimeo.com/${b.videoId}` : `https://youtu.be/${b.videoId}`) : '');

// ---------- Acomodo exacto de cada sección (lo mismo se valida en el servidor) ----------
export type LayPos = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';
export const LAY_POS: LayPos[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];
export const LAY_POS_LABEL: Record<LayPos, string> = { tl: 'Arriba · Izquierda', tc: 'Arriba · Centro', tr: 'Arriba · Derecha', ml: 'Centro · Izquierda', mc: 'Centro', mr: 'Centro · Derecha', bl: 'Abajo · Izquierda', bc: 'Abajo · Centro', br: 'Abajo · Derecha' };
export const LAY_WIDTH = { narrow: 'Angosto', medium: 'Medio', wide: 'Ancho', full: 'Completo' } as const;
export const LAY_SPACE = { none: 'Ninguno', s: 'Chico', m: 'Normal', l: 'Grande' } as const;
export const LAY_ALIGN = { left: 'Izquierda', center: 'Centro', right: 'Derecha' } as const;
/** Tipos de sección donde tiene sentido mover el contenido arriba/abajo (tienen alto propio). */
export const LAY_VERTICAL: SiteBlockType[] = ['hero', 'banner', 'text', 'image', 'video', 'contact'];
/** Secciones con foto de fondo o foto principal (se puede elegir qué parte no se recorta). */
export const LAY_FOCUS: SiteBlockType[] = ['hero', 'image'];
const FOCUS_XY: Record<LayPos, string> = { tl: '0% 0%', tc: '50% 0%', tr: '100% 0%', ml: '0% 50%', mc: '50% 50%', mr: '100% 50%', bl: '0% 100%', bc: '50% 100%', br: '100% 100%' };
export const focusXY = (p?: string) => FOCUS_XY[p as LayPos] || '50% 50%';

/** Clases y variables CSS del acomodo de una sección. Sin valores = se ve como siempre. */
export function layoutOf(b: SiteBlock): { className: string; style: Record<string, string> } {
  const c: string[] = [], style: Record<string, string> = {};
  const pos = LAY_POS.includes(b.pos) ? b.pos as LayPos : null, posM = LAY_POS.includes(b.posM) ? b.posM as LayPos : null;
  if (pos || posM || b.align || b.width || b.height || b.space) c.push('lay');
  if (pos) c.push(`lay-v-${pos[0]}`, `lay-h-${pos[1]}`);
  if (posM) c.push(`laym-v-${posM[0]}`, `laym-h-${posM[1]}`);
  if (b.align && b.align in LAY_ALIGN) c.push(`lay-ta-${b.align}`);
  if (b.width && b.width in LAY_WIDTH) c.push(`lay-w-${b.width}`);
  if (b.space && b.space in LAY_SPACE) c.push(`lay-sp-${b.space}`);
  const h = Number(b.height);
  if (h > 0 && h <= 100) { c.push('lay-h'); style['--lay-minh'] = `${h}vh`; }
  return { className: c.join(' '), style };
}

// ---------- Galería ----------
export type GalleryStyle = 'grid' | 'mosaic' | 'strip' | 'masonry' | 'featured' | 'slideshow' | 'collage' | 'beforeafter';
export const GALLERY_STYLES: Record<GalleryStyle, { label: string; help: string }> = {
  grid: { label: 'Cuadrícula', help: 'Todas del mismo tamaño, ordenadas.' },
  mosaic: { label: 'Mosaico', help: 'Una foto grande y las demás alrededor.' },
  strip: { label: 'Tira (carrusel)', help: 'Fila que se desliza con el dedo o con flechas.' },
  masonry: { label: 'Muro (estilo Pinterest)', help: 'Respeta si la foto es vertical u horizontal.' },
  featured: { label: 'Destacada + miniaturas', help: 'Una grande y abajo las pequeñas para cambiarla.' },
  slideshow: { label: 'Presentación', help: 'Una foto a la vez, a todo lo ancho.' },
  collage: { label: 'Collage de 3', help: 'Una vertical y dos horizontales.' },
  beforeafter: { label: 'Antes / después', help: 'Barra deslizable entre dos fotos (usa las 2 primeras).' },
};
export const GALLERY_RATIO = { original: 'Original', square: 'Cuadrada', '43': '4:3', '169': '16:9' } as const;
export const GALLERY_GAP = { none: 'Sin', s: 'Chico', l: 'Grande' } as const;
export const GALLERY_LIMITS = [0, 3, 6, 9, 12] as const;
export const MAX_GALLERY = 40;
