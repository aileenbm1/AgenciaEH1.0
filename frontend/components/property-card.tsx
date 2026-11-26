import Link from "next/link";
import { BedDouble, Bath, Ruler, MapPin } from "lucide-react";
import { Property, mxn, priceText } from "@/lib/data";
import ShareButtons from "@/components/share-buttons";
import CardCarousel from "@/components/card-carousel";
import CompareToggle from "@/components/compare-toggle";

export function PropertyCard({ p }: { p: Property }) {
  const isRent = p.operation === "Renta";
  const both = p.operation === "Venta y renta";
  return <article className="property-card">
    <CardCarousel images={p.images?.length ? p.images : [p.image]} href={`/propiedades/${p.slug}`} title={p.title}>
      <span className={`pill${isRent ? " rent" : both ? " both" : ""}`}>{p.operation}</span>
      {p.tag && <span className="photo-tag">{p.tag}</span>}
    </CardCarousel>
    <ShareButtons compact path={`/propiedades/${p.slug}`} title={p.title} />
    <div className="property-body">
      <div className="price">{p.priceMode === "HIDE" || !(p.price > 0) ? <span className="price-ask">Precio a consultar</span> : <>{p.priceMode === "FROM" && <small className="price-from">Desde </small>}{mxn(p.price)} <small>{isRent ? "/ mes" : "MXN"}</small></>}</div>
      {p.priceMode !== "HIDE" && both && p.rentPrice ? <div className="price-rent">o renta {mxn(p.rentPrice)} <small>/ mes</small></div> : null}
      <Link href={`/propiedades/${p.slug}`} className="property-title">{p.title}</Link>
      <p className="property-location"><MapPin size={15} strokeWidth={1.5} aria-hidden />{p.neighborhood}, {p.city}, Gto.</p>
      <div className="property-stats">
        <span title="Recámaras"><BedDouble size={17} strokeWidth={1.5} aria-hidden />{p.beds} rec.</span>
        <span title="Baños"><Bath size={17} strokeWidth={1.5} aria-hidden />{p.baths} baños</span>
        <span title="Superficie"><Ruler size={17} strokeWidth={1.5} aria-hidden />{p.area} m²</span>
      </div>
      <CompareToggle slug={p.slug} />
    </div>
  </article>;
}
