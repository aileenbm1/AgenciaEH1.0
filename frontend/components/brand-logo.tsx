/** Logotipo de Mi Casa: casita con techo dorado, puerta en arco y un corazón. Toma los colores del sitio. */
export function BrandLogo({ size = 44, title }: { size?: number; title?: string }) {
  return <svg className="brand-svg" width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
    <rect className="bl-bg" width="48" height="48" rx="12" />
    <path className="bl-roof" d="M9.5 24.5 24 12.5 38.5 24.5" />
    <rect className="bl-gold" x="31" y="13" width="3.6" height="6.5" rx=".8" />
    <path className="bl-walls" d="M14.5 23.5V34.5a2.5 2.5 0 0 0 2.5 2.5h14a2.5 2.5 0 0 0 2.5-2.5V23.5" />
    <path className="bl-gold" d="M20.5 37v-5.5a3.5 3.5 0 0 1 7 0V37z" />
    <path className="bl-heart" d="M24 27.6c-1.6-1.3-3-2.3-3-3.5 0-.9.7-1.5 1.5-1.5.6 0 1.1.3 1.5.8.4-.5.9-.8 1.5-.8.8 0 1.5.6 1.5 1.5 0 1.2-1.4 2.2-3 3.5z" />
  </svg>;
}
