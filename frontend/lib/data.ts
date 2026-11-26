/** Datos que muestra una tarjeta de propiedad. */
export type Property = {
  id: string | number; slug: string; title: string; city: string; neighborhood: string;
  /** Precio principal: venta (Venta / Venta y renta) o renta mensual (Renta). */
  price: number;
  /** Renta mensual cuando la propiedad es "Venta y renta". */
  rentPrice?: number | null;
  operation: 'Renta' | 'Venta' | 'Venta y renta';
  beds: number; baths: number; area: number; tag?: string; image: string;
  /** Fotos para el carrusel del catálogo (máximo 8). */
  images?: string[];
  /** SHOW = se muestra, FROM = “Desde $…”, HIDE = “Precio a consultar”. */
  priceMode?: PriceMode;
};
export type PriceMode = 'SHOW' | 'FROM' | 'HIDE';
export const mxn = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
/** Texto del precio según cómo lo quiere mostrar el anunciante. */
export const priceText = (price: number | string, mode?: string | null, per = '') => mode === 'HIDE' || !(Number(price) > 0) ? 'Precio a consultar' : `${mode === 'FROM' ? 'Desde ' : ''}${mxn(Number(price))}${per}`;
