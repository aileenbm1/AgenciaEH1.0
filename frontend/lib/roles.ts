import type { UserRole } from './auth';

/**
 * Fuente única de verdad sobre qué es cada rol, qué puede hacer y a dónde va.
 * Se usa en el registro, el encabezado, los paneles y la página "Cómo funciona".
 */
export type RoleInfo = {
  id: UserRole;
  label: string;          // Nombre corto visible
  who: string;            // "Para quién es"
  summary: string;        // Una línea que explica el rol
  can: string[];          // Qué puede hacer hoy
  soon?: string[];        // Qué llegará después (se muestra como "Próximamente")
  home: string;           // Ruta de su panel
  publicSignup: boolean;  // ¿Se puede registrar desde el sitio? (solo si la API tiene PUBLIC_SIGNUP)
  accountBy: string;      // Quién crea la cuenta cuando el registro público está cerrado
};

export const ROLES: Record<UserRole, RoleInfo> = {
  BUYER: {
    id: 'BUYER',
    accountBy: 'Te registras tú (al instante) o te la crea el administrador.',
    label: 'Comprador / Inquilino',
    who: 'Busco una propiedad para comprar o rentar',
    summary: 'Explora el catálogo, compara opciones y contacta al asesor de cada propiedad.',
    can: ['Buscar y filtrar propiedades publicadas', 'Comparar propiedades', 'Contactar al asesor por WhatsApp o mensaje', 'Rentar o apartar en línea (el pago es por transferencia o en persona)', 'Guardar favoritos', 'Búsquedas guardadas con avisos por correo', 'Agendar visitas', 'Editar tu perfil'],
    home: '/panel/comprador',
    publicSignup: true,
  },
  AGENT: {
    id: 'AGENT',
    accountBy: 'La crea el administrador de Agencia EH.',
    label: 'Agente / Asesor',
    who: 'Soy asesor inmobiliario o dueño y quiero anunciar',
    summary: 'Registra tus inmuebles, envíalos a revisión y, una vez aprobados, aparecen en el catálogo.',
    can: ['Crear propiedades como borrador', 'Enviar propiedades a revisión', 'Ver el estado de cada publicación', 'Eliminar tus propiedades', 'Aceptar reservas y apartados en línea', 'Recibir y dar seguimiento a prospectos y visitas (CRM)'],
    home: '/panel/agente',
    publicSignup: false,
  },
  AGENCY: {
    id: 'AGENCY',
    accountBy: 'La crea el administrador de Agencia EH.',
    label: 'Agencia',
    who: 'Represento a una inmobiliaria con varios asesores',
    summary: 'Publica como agencia con tu equipo de asesores y acepta sus reservas en línea.',
    can: ['Crear y enviar propiedades a revisión a nombre de la agencia', 'Ver el estado de las publicaciones', 'Aceptar reservas y apartados del equipo', 'Ver y dar seguimiento a los prospectos del equipo', 'Perfil público de la agencia'],
    home: '/panel/agencia',
    publicSignup: false,
  },
  DEVELOPER: {
    id: 'DEVELOPER',
    accountBy: 'La crea el administrador de Agencia EH.',
    label: 'Desarrollador',
    who: 'Desarrollo proyectos inmobiliarios (fraccionamientos, torres, preventas)',
    summary: 'Publica los inmuebles de tus proyectos, administra a tu equipo de vendedores y da seguimiento a prospectos.',
    can: ['Crear y enviar propiedades a revisión a nombre de la desarrolladora', 'Aceptar reservas y apartados del equipo', 'Ver y dar seguimiento a los prospectos del equipo', 'Perfil público de la desarrolladora'],
    home: '/panel/desarrollador',
    publicSignup: false,
  },
  ADMIN: {
    id: 'ADMIN',
    accountBy: 'El equipo de Agencia EH.',
    label: 'Administrador',
    who: 'Equipo interno de Agencia EH',
    summary: 'Revisa cada propiedad antes de que sea pública y administra usuarios, membresías y pagos.',
    can: ['Ver la cola de propiedades en revisión', 'Aprobar (publicar) o rechazar propiedades', 'Crear todas las cuentas de agentes, agencias, desarrolladoras y administradores', 'Aceptar o intervenir en cualquier reserva', 'Gestionar usuarios y roles', 'Registrar membresías y pagos (efectivo / transferencia)', 'Ver métricas generales', 'Ver todos los prospectos y visitas'],
    home: '/panel/admin',
    publicSignup: false,
  },
};

export const SIGNUP_ROLES = (Object.values(ROLES).filter(r => r.publicSignup)) as RoleInfo[];

/** Estados de una propiedad, en el orden del flujo. */
export const PROPERTY_STATUS: Record<string, { label: string; help: string; tone: 'neutral' | 'warn' | 'ok' | 'bad' }> = {
  DRAFT:     { label: 'Borrador',    help: 'Solo tú la ves. Complétala y envíala a revisión.', tone: 'neutral' },
  REVIEW:    { label: 'En revisión', help: 'Un administrador la está revisando. No es pública todavía.', tone: 'warn' },
  PUBLISHED: { label: 'Publicada',   help: 'Visible para todos en el catálogo.', tone: 'ok' },
  REJECTED:  { label: 'Rechazada',   help: 'Corrige la información y vuelve a enviarla a revisión.', tone: 'bad' },
  SOLD:      { label: 'Vendida',     help: 'Operación cerrada.', tone: 'neutral' },
  RENTED:    { label: 'Rentada',     help: 'Operación cerrada.', tone: 'neutral' },
};

export const MUNICIPALITIES = ['León', 'Guanajuato', 'Irapuato', 'Celaya', 'San Miguel de Allende', 'Silao'];
export const PROPERTY_TYPES = ['Casa', 'Departamento', 'Terreno', 'Local comercial', 'Oficina', 'Bodega'];
/** RF-01: categorías de propiedad. */
export const CATEGORIES = ['Residencial', 'Comercial', 'Industrial', 'Terreno', 'Vacacional'];
/** Categoría sugerida según el tipo de inmueble. */
export const categoryFor = (type: string) => /terreno|lote/i.test(type) ? 'Terreno' : /bodega|nave|industrial/i.test(type) ? 'Industrial' : /local|oficina|comercial/i.test(type) ? 'Comercial' : 'Residencial';
/** Disponibilidad comercial (independiente de la revisión del administrador). */
export const AVAILABILITY: Record<'AVAILABLE' | 'RESERVED' | 'RENTED' | 'SOLD', { label: string; help: string; tone: 'ok' | 'warn' | 'neutral' | 'bad' }> = {
  AVAILABLE: { label: 'Disponible', help: 'Aparece en el catálogo y acepta interesados.', tone: 'ok' },
  RESERVED:  { label: 'Apartada',   help: 'Sigue en el catálogo con la etiqueta "Apartada".', tone: 'warn' },
  RENTED:    { label: 'Rentada',    help: 'Sale del catálogo; el enlace muestra "No disponible".', tone: 'neutral' },
  SOLD:      { label: 'Vendida',    help: 'Sale del catálogo; el enlace muestra "No disponible".', tone: 'neutral' },
};
/** Etiquetas para las fotos (indican qué muestra cada una y su lugar). */
export const IMAGE_LABELS = ['Fachada', 'Sala', 'Comedor', 'Cocina', 'Recámara principal', 'Recámara', 'Baño', 'Patio/Jardín', 'Terraza', 'Cochera', 'Vista', 'Áreas comunes', 'Plano', 'Otro'];
