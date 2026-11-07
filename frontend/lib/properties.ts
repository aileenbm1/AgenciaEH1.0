import { Property } from './data';
// Se lee en cada llamada: en el paquete de un solo sitio la API define API_URL al arrancar.
const apiUrl = () => (process.env.API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/+$/, '');
// En el paquete de un solo sitio no se consulta nada hasta que la API esté lista.
const apiReady = () => { const s = (globalThis as any).__EH_API_STATUS; return !s || s.state === 'lista'; };
export type ApiProperty = { id:string; slug:string; title:string; description?:string|null; operation:'RENT'|'SALE'; price:string|number; municipality:string; neighborhood?:string|null; propertyType:string; bedrooms?:number|null; bathrooms?:number|null; landArea?:string|number|null; builtArea?:string|number|null; images?:{url:string;alt?:string|null;position:number}[] };
export type PropertyPage = {items:ApiProperty[];total:number;page:number;take:number;pages:number};
export function toCard(p:ApiProperty):Property { return {id:p.id,slug:p.slug,title:p.title,city:p.municipality,neighborhood:p.neighborhood||p.municipality,price:Number(p.price),operation:p.operation==='RENT'?'Renta':'Venta',beds:p.bedrooms||0,baths:p.bathrooms||0,area:Number(p.builtArea||p.landArea||0),image:p.images?.[0]?.url||'/placeholder-property.svg'}; }
export async function getPublicProperties(params:Record<string,string|number|undefined>={},take=12):Promise<PropertyPage>{
 if(!apiReady())return {items:[],total:0,page:1,take,pages:0};
 const url=new URL(`${apiUrl()}/properties`);url.searchParams.set('take',String(take));
 for(const [key,value] of Object.entries(params))if(value!==undefined&&String(value).trim()!=='')url.searchParams.set(key,String(value));
 try { const response=await fetch(url.toString(),{cache:'no-store',headers:{Accept:'application/json'}});if(!response.ok)return {items:[],total:0,page:1,take,pages:0};return await response.json() as PropertyPage; }
 catch { return {items:[],total:0,page:1,take,pages:0}; }
}
export async function getPublicProperty(slug:string):Promise<ApiProperty|null>{
 if(!apiReady())return null;
 try {const response=await fetch(`${apiUrl()}/properties/${encodeURIComponent(slug)}`,{cache:'no-store',headers:{Accept:'application/json'}});if(response.status===404)return null;if(!response.ok)return null;return await response.json() as ApiProperty;}catch{return null;}
}
