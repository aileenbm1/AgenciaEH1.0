export type Property = { id:string|number; slug:string; title:string; city:string; neighborhood:string; price:number; operation:"Renta"|"Venta"; beds:number; baths:number; area:number; tag?:string; image:string };
export const properties:Property[] = [
{id:1,slug:"casa-en-leon",title:"Residencia contemporánea con jardín",city:"León",neighborhood:"El Molino",price:28500,operation:"Renta",beds:3,baths:3,area:245,tag:"Destacada",image:"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000"},
{id:2,slug:"departamento-san-miguel",title:"Departamento con terraza y luz natural",city:"San Miguel de Allende",neighborhood:"Guadiana",price:4850000,operation:"Venta",beds:2,baths:2,area:128,tag:"Nuevo",image:"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1000"},
{id:3,slug:"casa-guanajuato",title:"Casa de diseño en zona residencial",city:"Guanajuato",neighborhood:"Marfil",price:19500,operation:"Renta",beds:3,baths:2,area:180,image:"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1000"},
{id:4,slug:"loft-irapuato",title:"Loft ejecutivo totalmente equipado",city:"Irapuato",neighborhood:"Las Reynas",price:12500,operation:"Renta",beds:1,baths:1,area:76,image:"https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1000"}
];
export const mxn=(n:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(n);
