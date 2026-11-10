import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProperty,toCard } from '@/lib/properties';
import { mxn } from '@/lib/data';
import PropertyContact from '@/components/property-contact';
import PropertyTools from '@/components/property-tools';
export const dynamic='force-dynamic';
export default async function Detail({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const raw=await getPublicProperty(slug);if(!raw)notFound();const p=toCard(raw);const photos=raw.images?.length?raw.images.map(x=>x.url):[p.image];
 return <main className="page-wrap"><Link href="/propiedades" className="back-link">← Volver a propiedades</Link><div className="detail-grid"><div><div className="detail-image" style={{backgroundImage:`url(${photos[0]})`}}/><div className="detail-gallery">{photos.slice(1,4).map((url,i)=><div key={`${url}-${i}`} style={{backgroundImage:`url(${url})`}}/>)}{photos.length===1&&<><div style={{backgroundImage:`url(${p.image})`}}/><div style={{backgroundImage:`url(${p.image})`}}/></>}</div></div><aside className="detail-aside"><span className="eyebrow">{p.operation.toUpperCase()} · {p.city.toUpperCase()}</span><h1>{p.title}</h1><p className="muted">{p.neighborhood}, {p.city}</p><div className="detail-price">{mxn(p.price)} <small>{p.operation==='Renta'?'/ mes':''}</small></div><div className="property-stats large"><span>{p.beds} recámaras</span><span>{p.baths} baños</span><span>{p.area} m²</span></div><h3>Descripción</h3><p>{raw.description||'Solicita más información sobre esta propiedad.'}</p><PropertyTools propertyId={raw.id} slug={raw.slug} /><PropertyContact propertyId={raw.id} title={p.title} owner={raw.owner} /></aside></div></main>
}
