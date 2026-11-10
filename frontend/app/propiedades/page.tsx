import Link from 'next/link';
import { PropertyGrid } from '@/components/property-grid';
import { getPublicProperties,toCard } from '@/lib/properties';
import { SaveSearchButton } from '@/components/property-tools';
export const dynamic='force-dynamic';
export default async function Listings({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const sp=await searchParams;const pick=(key:string)=>{const v=sp[key];return Array.isArray(v)?v[0]:v;};
 const params={operation:pick('operation'),municipality:pick('municipality'),propertyType:pick('propertyType'),minPrice:pick('minPrice'),maxPrice:pick('maxPrice'),bedrooms:pick('bedrooms'),bathrooms:pick('bathrooms'),search:pick('search'),sort:pick('sort'),page:pick('page')};
 const view=pick('vista')==='lista'?'list':'grid';
 const result=await getPublicProperties(params,12);const cards=result.items.map(toCard);
 return <main className="page-wrap"><div className="page-heading"><span className="eyebrow">CATÁLOGO INMOBILIARIO</span><h1>Propiedades en Guanajuato</h1><p>Explora opciones de renta y venta en el Bajío.</p></div>
 <form className="filterbar" action="/propiedades" method="get">
 <input aria-label="Buscar" name="search" placeholder="Buscar por zona o palabra" defaultValue={pick('search')||''}/>
 <select name="operation" defaultValue={pick('operation')||''}><option value="">Operación: todas</option><option value="RENT">Renta</option><option value="SALE">Venta</option></select>
 <select name="municipality" defaultValue={pick('municipality')||''}><option value="">Municipio: todos</option>{['León','Guanajuato','Irapuato','Celaya','San Miguel de Allende','Silao'].map(x=><option key={x}>{x}</option>)}</select>
 <select name="propertyType" defaultValue={pick('propertyType')||''}><option value="">Tipo de inmueble</option><option>Casa</option><option>Departamento</option><option>Terreno</option><option>Local comercial</option><option>Oficina</option></select>
 <input name="minPrice" type="number" min="0" placeholder="Precio mínimo" defaultValue={pick('minPrice')||''}/><input name="maxPrice" type="number" min="0" placeholder="Precio máximo" defaultValue={pick('maxPrice')||''}/>
 <select name="bedrooms" defaultValue={pick('bedrooms')||''}><option value="">Recámaras</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}+ recámaras</option>)}</select>
 <select name="bathrooms" defaultValue={pick('bathrooms')||''}><option value="">Baños</option>{[1,2,3,4].map(n=><option key={n} value={n}>{n}+ baños</option>)}</select>
 {view==='list'&&<input type="hidden" name="vista" value="lista"/>}
 <select name="sort" defaultValue={pick('sort')||'recent'}><option value="recent">Más recientes</option><option value="price_asc">Precio menor</option><option value="price_desc">Precio mayor</option></select>
 <button className="button button-navy" type="submit">Aplicar filtros</button><Link className="button button-outline" href="/propiedades">Limpiar</Link>
 </form>
 {(()=>{const q=Object.fromEntries(['operation','municipality','propertyType','minPrice','maxPrice','bedrooms','bathrooms','search'].map(k=>[k,pick(k)]).filter(([,v])=>v&&String(v).trim()!=='')) as Record<string,string>;return Object.keys(q).length?<div className="save-search-row"><SaveSearchButton query={q}/></div>:null;})()}
 {(()=>{const base=Object.fromEntries(Object.entries(params).filter(([k,v])=>v!==undefined&&k!=='page') as [string,string][]);const href=(v:string)=>`/propiedades?${new URLSearchParams(v==='lista'?{...base,vista:'lista'}:base)}`;
  return <div className="view-toggle" role="group" aria-label="Vista de resultados"><Link className={view==='grid'?'is-on':''} href={href('cuadricula')}>▦ Cuadrícula</Link><Link className={view==='list'?'is-on':''} href={href('lista')}>☰ Lista</Link></div>;})()}
 <p className="results-count">{result.total} {result.total===1?'propiedad encontrada':'propiedades encontradas'} · Página {result.page} de {Math.max(1,result.pages)}</p>
 {cards.length?<PropertyGrid items={cards} view={view}/>:<div className="notice">{result.total===0?'No encontramos propiedades publicadas con esos criterios. Intenta cambiar los filtros.':'No fue posible consultar el catálogo en este momento. Intenta de nuevo en unos minutos.'}</div>}
 {result.pages>1&&<div className="center" style={{display:'flex',gap:12,justifyContent:'center'}}>{result.page>1&&<Link className="button button-outline" href={`/propiedades?${new URLSearchParams({...Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined) as [string,string][]),...(view==='list'?{vista:'lista'}:{}),page:String(result.page-1)})}`}>← Anterior</Link>}{result.page<result.pages&&<Link className="button button-outline" href={`/propiedades?${new URLSearchParams({...Object.fromEntries(Object.entries(params).filter(([,v])=>v!==undefined) as [string,string][]),...(view==='list'?{vista:'lista'}:{}),page:String(result.page+1)})}`}>Siguiente →</Link>}</div>}
 </main>
}
