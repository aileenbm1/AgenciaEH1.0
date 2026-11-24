/**
 * Logotipo de Mi Casa (dibujado en SVG a partir del diseño original): techo dorado con
 * chimenea y ventana, el nombre en letras romanas, una línea curva y "AGENCIA INMOBILIARIA".
 * - full: con la frase de abajo (pie de página).
 * - compact: techo + nombre + curva (encabezado).
 */
const GOLD = 'mc-gold';

export function GoldDefs() {
  return <defs><linearGradient id={GOLD} x1="0" y1="0" x2="1" y2="1">
    {/* Los tonos salen del color de acento del sitio: el administrador los cambia en el editor. */}
    <stop offset="0" style={{ stopColor: 'var(--gold-light, #E3CB9F)' }} /><stop offset=".55" style={{ stopColor: 'var(--gold, #C9A36A)' }} /><stop offset="1" style={{ stopColor: 'var(--gold-ink, #8D724A)' }} />
  </linearGradient></defs>;
}

/** Techo, chimenea y ventana (coordenadas del diseño original). */
export function RoofMark() {
  const g = `url(#${GOLD})`;
  return <>
    <path className="bl-chimney" d="M884 353V318H936V390" fill="none" stroke={g} strokeWidth="11" />
    <polygon className="bl-roof" points="455,488 770,274 1080,492 1065,491 770,291 467,488" fill={g} />
    <g fill={g}><rect x="745" y="388" width="23" height="23" /><rect x="773" y="388" width="23" height="23" /><rect x="745" y="416" width="23" height="23" /><rect x="773" y="416" width="23" height="23" /></g>
  </>;
}

export function BrandLogo({ name = 'MI CASA', tagline = 'AGENCIA INMOBILIARIA', variant = 'compact' }: { name?: string; tagline?: string; variant?: 'full' | 'compact' }) {
  const n = name.toUpperCase(), t = tagline.toUpperCase();
  const g = `url(#${GOLD})`;
  const full = variant === 'full' && !!t;
  return <svg className={`brand-lockup ${full ? 'is-full' : 'is-compact'}`} viewBox={full ? '250 255 1036 500' : '300 262 940 440'} role="img" aria-label={name}>
    <GoldDefs />
    <RoofMark />
    <text className="bl-name" x="770" y="628" textAnchor="middle" fontFamily="Cinzel, 'Playfair Display', Georgia, serif" fontWeight="400" fontSize="158"
      {...(n === 'MI CASA' ? { textLength: 900, lengthAdjust: 'spacingAndGlyphs' } : {})}>{n}</text>
    <path d="M430 688Q770 632 1072 686Q770 652 430 688Z" fill={g} />
    {full && <>
      <rect x="282" y="714" width="103" height="3" fill={g} /><rect x="1148" y="714" width="103" height="3" fill={g} />
      <text className="bl-tag" x="766" y="728" textAnchor="middle" fontFamily="Montserrat, Arial, sans-serif" fontWeight="500" fontSize="34"
        {...(t === 'AGENCIA INMOBILIARIA' ? { textLength: 680, lengthAdjust: 'spacing' } : { letterSpacing: 8 })}>{t}</text>
    </>}
  </svg>;
}
