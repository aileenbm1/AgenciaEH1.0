/** Datos que muestra una tarjeta de propiedad. */
export type Property = {
  id: string | number; slug: string; title: string; city: string; neighborhood: string;
  /** Precio principal: venta (Venta / Venta y renta) o renta mensual (Renta). */
  price: number;
  /** Renta mensual cuando la propiedad es "Venta y renta". */
  rentPrice?: number | null;
  operation: 'Renta' | 'Venta' | 'Venta y renta';
  beds: number; baths: number; area: number; tag?: string; image: string;
};
export const mxn = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
