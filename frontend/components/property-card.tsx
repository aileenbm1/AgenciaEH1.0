import Link from "next/link";
import { BedDouble, Bath, Ruler, MapPin } from "lucide-react";
import { Property, mxn } from "@/lib/data";
import ShareButtons from "@/components/share-buttons";

export function PropertyCard({ p }: { p: Property }) {
  const isRent = p.operation === "Renta";
  return <article className="property-card">
    <Link href={`/propiedades/${p.slug}`} className="property-photo" style={{ backgroundImage: `url(${p.image})` }} aria-label={p.title}>
      <span className={`pill${isRent ? " rent" : ""}`}>{p.operation}</span>
      {p.tag && <span className="photo-tag">{p.tag}</span>}
    </Link>
    <ShareButtons compact path={`/propiedades/${p.slug}`} title={p.title} />
    <div className="property-body">
      <div className="price">{mxn(p.price)} <small>{isRent ? "/ mes" : "MXN"}</small></div>
      <Link href={`/propiedades/${p.slug}`} className="property-title">{p.title}</Link>
      <p className="property-location"><MapPin size={15} strokeWidth={1.5} aria-hidden />{p.neighborhood}, {p.city}, Gto.</p>
      <div className="property-stats">
        <span title="Recámaras"><BedDouble size={17} strokeWidth={1.5} aria-hidden />{p.beds} rec.</span>
        <span title="Baños"><Bath size={17} strokeWidth={1.5} aria-hidden />{p.baths} baños</span>
        <span title="Superficie"><Ruler size={17} strokeWidth={1.5} aria-hidden />{p.area} m²</span>
      </div>
    </div>
  </article>;
}
