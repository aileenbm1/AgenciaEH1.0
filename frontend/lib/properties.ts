import { Property } from './data';
import { getJson } from './api-transport';
export type ApiProperty = { id:string; slug:string; title:string; description?:string|null; operation:'RENT'|'SALE'; price:string|number; municipality:string; neighborhood?:string|null; propertyType:string; bedrooms?:number|null; bathrooms?:number|null; landArea?:string|number|null; builtArea?:string|number|null; images?:{url:string;alt?:string|null;position:number}[]; owner?:{fullName:string;role:string;phone?:string|null;agency?:{name:string;slug:string}|null}|null };
export type PropertyPage = {items:ApiProperty[];total:number;page:number;take:number;pages:number};
export function toCard(p:ApiProperty):Property { return {id:p.id,slug:p.slug,title:p.title,city:p.municipality,neighborhood:p.neighborhood||p.municipality,price:Number(p.price),operation:p.operation==='RENT'?'Renta':'Venta',beds:p.bedrooms||0,baths:p.bathrooms||0,area:Number(p.builtArea||p.landArea||0),image:p.images?.[0]?.url||'/placeholder-property.svg'}; }
export async function getPublicProperties(params:Record<string,string|number|undefined>={},take=12):Promise<PropertyPage>{
 const qs=new URLSearchParams({take:String(take)});
 for(const [key,value] of Object.entries(params))if(value!==undefined&&String(value).trim()!=='')qs.set(key,String(value));
 const {data}=await getJson<PropertyPage>(`properties?${qs}`);
 return data??{items:[],total:0,page:1,take,pages:0};
}
export async function getPublicProperty(slug:string):Promise<ApiProperty|null>{
 const {data}=await getJson<ApiProperty>(`properties/${encodeURIComponent(slug)}`);
 return data;
}
