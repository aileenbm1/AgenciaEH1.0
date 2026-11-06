import Link from 'next/link';
import { PropertyGrid } from '@/components/property-grid';
import { getPublicProperties,toCard } from '@/lib/properties';
export const dynamic='force-dynamic';
export default async function Listings({searchParams}:{searchParams:Record<string,string|string[]|undefined>}){
 const pick=(key:string)=>{const v=searchParams[key];return Array.isArray(v)?v[0]:v;};
 const params={operation:pick('operation'),municipality:pick('municipality'),propertyType:pick('propertyType'),minPrice:pick('minPrice'),maxPrice:pick('maxPrice'),bedrooms:pick('bedrooms'),search:pick('search'),sort:pick('sort'),page:pick('page')};
 const result=await getPublicProperties(params,12);const cards=result.items.map(toCard);
 return <main className="page-wrap"><div className="page-heading"><span className="eyebrow">CATÁLOGO INMOBILIARIO</span><h1>Propiedades en Guanajuato</h1><p>Explora opciones de renta y venta en el Bajío.</p></div>
 <form className="filterbar" action="/propiedades" method="get">
 <input aria-label="Buscar" name="search" placeholder="Buscar por zona o palabra" defaultValue={pick('search')||''}/>
 <select name="operation" defaultValue={pick('operation')||''}><option value="">Operación: todas</option><option value="RENT">Renta</option><option value="SALE">Venta</option></select>
 <select name="municipality" defaultValue={pick('municipality')||''}><option value="">Municipio: todos</option>{['León','Guanajuato','Irapuato','Celaya','San Miguel de Allende','Silao'].map(x=><option key={x}>{x}</option>)}</select>
 <select name="propertyType" defaultValue={pick('propertyType')||''}><option value="">Tipo de inmueble</option><option>Casa</option><option>Departamento</option><option>Terreno</option><option>Local comercial</option><option>Oficina</option></select>
 <input name="minPrice" type="number" min="0" placeholder="Precio mínimo" defaultValue={pick('minPrice')||''}/><input name="maxPrice" type="number" min="0" placeholder="Precio máximo" defaultValue={pick('maxPrice')||''}/>
 <select name="bedrooms" defaultValue={pick('bedrooms')||''}><option value="">Recámaras</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}+ recámaras</option>)}</select>
 <select name="sort" defaultValue={pick('sort')||'recent'}><option value="recent">Más recientes</option><option value="price_asc">Precio menor</option><option value="price_desc">Precio mayor</option></select>
 <button className="button button-navy" type="submit">Aplicar filtros</button><Link className="button button-outline" href="/propiedades">Limpiar</Link>
 </form>
 <p className="results-count">{result.total} {result.total===1?'propiedad encontrada':'propiedades encontradas'} · Página {result.page} de {Math.max(1,result.pages)}</p>
 {cards.length?<PropertyGrid items={cards}/>:<div className="notice">{result.total===0?'No encontramos propiedades publicadas con esos criterios. Intenta cambiar los filtros.':'No fue posible consultar el catálogo en este momento. Verifica que la API y la base de datos estén disponibles.'}</div>}
 {result.pages>1&&<div className="center" style={{display:'flex',gap:12,justifyContent:'center'}}>{result.page>1&&<Link className="button button-outline" href={`/propiedades?${new URLSearchParams({...Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined) as [string,string][]),page:String(result.page-1)})}`}>← Anterior</Link>}{result.page<result.pages&&<Link className="button button-outline" href={`/propiedades?${new URLSearchParams({...Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined) as [string,string][]),page:String(result.page+1)})}`}>Siguiente →</Link>}</div>}
 </main>
}
