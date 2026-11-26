// Utilidades del panel del anunciante.

/** Lo que le falta a una propiedad para poder enviarla a revisión. */
export function missingFor(p: { images: unknown[]; description?: string | null; price: number | string }) {
  const photos = p.images.length;
  return [photos < 3 ? `${3 - photos} foto${3 - photos === 1 ? '' : 's'} más` : '', String(p.description || '').trim().length < 40 ? 'Descripción' : '', (p as { priceMode?: string }).priceMode !== 'HIDE' && !(Number(p.price) > 0) ? 'Precio' : ''].filter(Boolean);
}
