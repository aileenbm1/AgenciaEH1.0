import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { removeMedia } from '../uploads/media';
import { PUBLISHER_ROLES } from '../auth/roles.decorator';
import { EngagementService } from '../engagement/engagement.service';
import { DatabaseService, Queryable } from '../database/database.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { CustomFieldsService } from './custom-fields.service';

const WITH_IMAGES = `SELECT p.*,i.Id AS ImageId,i.Url AS ImageUrl,i.Alt AS ImageAlt,i.Label AS ImageLabel,i.Position AS ImagePosition`;
/** Disponibilidad: lo que se muestra en el catálogo público. */
export const AVAILABILITY = ['AVAILABLE', 'RESERVED', 'RENTED', 'SOLD'] as const;
const PUBLIC_AVAILABILITY = "p.Availability IN ('AVAILABLE','RESERVED')";
/** Categoría sugerida según el tipo de inmueble (RF-01). */
const categoryFor = (type: string) => /terreno|lote/i.test(type) ? 'Terreno' : /bodega|nave|industrial/i.test(type) ? 'Industrial' : /local|oficina|comercial/i.test(type) ? 'Comercial' : 'Residencial';
const dateOnly = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);

@Injectable()
export class PropertiesService {
  constructor(private db: DatabaseService, private engagement: EngagementService, private fields: CustomFieldsService) {}

  private slug(title: string) {
    return `${title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 65)}-${Date.now().toString(36)}`;
  }
  private async getById(id: string) { const [p] = await this.db.query('SELECT * FROM Properties WHERE Id=? LIMIT 1', [id]); return p; }

  private async insertImages(tx: Queryable, propertyId: string, images: string[], labels: string[] = []) {
    for (let i = 0; i < images.length; i++) {
      await this.db.execute('INSERT INTO PropertyImages(Id,PropertyId,Url,Label,Position) VALUES(?,?,?,?,?)', [randomUUID(), propertyId, images[i], labels[i]?.trim() || null, i], tx);
    }
  }

  /** RF-10: solo cuentas aprobadas por el administrador pueden publicar. */
  private async assertApproved(userId: string) {
    const [u] = await this.db.query<any>('SELECT ApprovalStatus FROM Users WHERE Id=? LIMIT 1', [userId]);
    if (u && u.ApprovalStatus !== 'APPROVED') throw new ForbiddenException('Tu cuenta está en revisión. Podrás publicar en cuanto el administrador la apruebe.');
  }

  private checkPrices(operation: string, rentPrice?: number | null) {
    if (operation === 'BOTH' && !(Number(rentPrice) > 0)) throw new BadRequestException('Indica también el precio de renta mensual.');
  }

  /** Ubicación pública: si el anunciante no quiere mostrar la exacta, se redondea (~1 km) y se marca como aproximada. */
  private publicLocation<T extends { latitude: number | null; longitude: number | null; showExactLocation: boolean }>(p: T): T {
    if (p.latitude == null || p.longitude == null || p.showExactLocation) return p;
    return { ...p, latitude: Math.round(p.latitude * 100) / 100, longitude: Math.round(p.longitude * 100) / 100 };
  }

  private group(rows: any[]) {
    const map = new Map<string, any>();
    for (const row of rows) {
      let p = map.get(row.Id);
      if (!p) {
        p = {
          id: row.Id, slug: row.Slug, title: row.Title, description: row.Description, operation: row.Operation, status: row.Status,
          price: row.Price, rentPrice: row.RentPrice ?? null, currency: row.Currency, category: row.Category || categoryFor(row.PropertyType || ''),
          availability: row.Availability || 'AVAILABLE', availableFrom: dateOnly(row.AvailableFrom),
          municipality: row.Municipality, neighborhood: row.Neighborhood, propertyType: row.PropertyType, bedrooms: row.Bedrooms, bathrooms: row.Bathrooms,
          landArea: row.LandArea, builtArea: row.BuiltArea, ownerId: row.OwnerId, createdAt: row.CreatedAt, updatedAt: row.UpdatedAt, images: [],
          latitude: row.Latitude != null ? Number(row.Latitude) : null, longitude: row.Longitude != null ? Number(row.Longitude) : null, showExactLocation: !!row.ShowExactLocation,
        };
        map.set(row.Id, p);
      }
      if (row.ImageId) p.images.push({ id: row.ImageId, url: row.ImageUrl, alt: row.ImageAlt, label: row.ImageLabel ?? null, position: row.ImagePosition });
    }
    return [...map.values()];
  }

  private async withCustom<T extends { id: string }>(items: T[]) {
    const vals = await this.fields.valuesFor(items.map((p) => p.id));
    return items.map((p) => ({ ...p, custom: vals[p.id] || {} }));
  }

  async create(userId: string, role: string, d: CreatePropertyDto) {
    if (!PUBLISHER_ROLES.includes(role)) throw new ForbiddenException('Solo agentes, agencias y desarrolladores pueden publicar propiedades.');
    // El administrador publica a nombre de una agencia, desarrolladora o agente que él elige.
    const ownerId = role === 'ADMIN' ? await this.publisherId(d.ownerId) : userId;
    if (role !== 'ADMIN') await this.assertApproved(userId);
    this.checkPrices(d.operation, d.rentPrice);
    const custom = await this.fields.clean(d.custom);
    const id = randomUUID();
    await this.db.transaction(async (tx) => {
      await this.db.execute(`INSERT INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,RentPrice,Currency,Category,Availability,AvailableFrom,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,Latitude,Longitude,ShowExactLocation,OwnerId)
        VALUES(?,?,?,?,?,'DRAFT',?,?,'MXN',?,'AVAILABLE',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, this.slug(d.title), d.title, d.description, d.operation, d.price, d.operation === 'BOTH' ? d.rentPrice : null, d.category || categoryFor(d.propertyType),
          d.availableFrom ? d.availableFrom.slice(0, 10) : null, d.municipality, d.neighborhood ?? null, d.propertyType, d.bedrooms ?? null, d.bathrooms ?? null,
          d.landArea ?? null, d.builtArea ?? null, d.latitude ?? null, d.latitude != null ? d.longitude ?? null : null, d.showExactLocation ? 1 : 0, ownerId], tx);
      await this.insertImages(tx, id, d.images || [], d.imageLabels);
      await this.fields.save(tx, id, custom);
    });
    return this.detailInternal(id);
  }

  /** Valida la cuenta anunciante elegida por el administrador. */
  private async publisherId(ownerId?: string) {
    if (!ownerId) throw new BadRequestException('Elige a nombre de qué agencia, desarrolladora o agente queda la propiedad.');
    const [u] = await this.db.query<any>("SELECT Id FROM Users WHERE Id=? AND IsActive=1 AND Role IN ('AGENT','AGENCY','DEVELOPER') LIMIT 1", [ownerId]);
    if (!u) throw new BadRequestException('La cuenta elegida no existe o no puede publicar propiedades.');
    return u.Id as string;
  }

  /** Mis propiedades. El administrador ve todas, con el nombre del anunciante. */
  async mine(userId: string, role?: string) {
    if (role === 'ADMIN') {
      const rows = await this.db.query(`${WITH_IMAGES} FROM (SELECT p.* FROM Properties p ORDER BY p.UpdatedAt DESC LIMIT 500) p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id ORDER BY p.UpdatedAt DESC,p.Id,i.Position`);
      const items = await this.withCustom(this.group(rows));
      const owners = await this.db.query<any>("SELECT u.Id, u.FullName, u.Role, ag.Name AS AgencyName FROM Users u LEFT JOIN AgencyProfiles ag ON ag.UserId=u.Id");
      const byId = new Map(owners.map((o: any) => [o.Id, { fullName: o.AgencyName || o.FullName, role: o.Role }]));
      return items.map((p) => ({ ...p, owner: byId.get(p.ownerId) || null }));
    }
    const rows = await this.db.query(`${WITH_IMAGES} FROM Properties p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id WHERE p.OwnerId=? ORDER BY p.UpdatedAt DESC,p.Id,i.Position`, [userId]);
    return this.withCustom(this.group(rows));
  }

  async publicList(q: any) {
    const map = q.view === 'map';
    const page = map ? 1 : Math.max(1, Number(q.page) || 1), take = map ? 500 : Math.min(30, Math.max(1, Number(q.take) || 12));
    const where: string[] = [`p.Status='PUBLISHED'`, PUBLIC_AVAILABILITY], params: any[] = [];
    if (map) where.push('p.Latitude IS NOT NULL AND p.Longitude IS NOT NULL');
    const like = (col: string, v: any, max: number) => { where.push(`${col} LIKE CONCAT('%',?,'%')`); params.push(String(v).slice(0, max)); };
    if (q.municipality) like('p.Municipality', q.municipality, 80);
    if (q.neighborhood) like('p.Neighborhood', q.neighborhood, 80);
    // "Renta" incluye las de venta y renta; lo mismo para "Venta".
    if (q.operation) {
      if (!['RENT', 'SALE'].includes(String(q.operation))) throw new BadRequestException('Operación no válida.');
      where.push(`p.Operation IN (?, 'BOTH')`); params.push(q.operation);
    }
    if (q.category) { where.push('p.Category=?'); params.push(String(q.category).slice(0, 30)); }
    if (q.propertyType) like('p.PropertyType', q.propertyType, 60);
    // El precio comparado es el de la operación buscada (renta mensual si se busca renta).
    const priceCol = q.operation === 'RENT' ? "(CASE WHEN p.Operation='BOTH' THEN p.RentPrice ELSE p.Price END)" : 'p.Price';
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      const min = Number(q.minPrice), max = Number(q.maxPrice);
      if ((q.minPrice !== undefined && (!Number.isFinite(min) || min < 0)) || (q.maxPrice !== undefined && (!Number.isFinite(max) || max < 0)) || (q.minPrice !== undefined && q.maxPrice !== undefined && min > max)) throw new BadRequestException('Rango de precios no válido.');
      if (q.minPrice !== undefined) { where.push(`${priceCol}>=?`); params.push(min); }
      if (q.maxPrice !== undefined) { where.push(`${priceCol}<=?`); params.push(max); }
    }
    if (q.bedrooms !== undefined && q.bedrooms !== '') { const beds = Number(q.bedrooms); if (!Number.isInteger(beds) || beds < 0 || beds > 30) throw new BadRequestException('Número de recámaras no válido.'); where.push('p.Bedrooms>=?'); params.push(beds); }
    if (q.bathrooms !== undefined && q.bathrooms !== '') { const b = Number(q.bathrooms); if (!Number.isInteger(b) || b < 0 || b > 30) throw new BadRequestException('Número de baños no válido.'); where.push('p.Bathrooms>=?'); params.push(b); }
    if (q.search) { const term = String(q.search).slice(0, 100); where.push(`(p.Title LIKE CONCAT('%',?,'%') OR p.Description LIKE CONCAT('%',?,'%') OR p.Municipality LIKE CONCAT('%',?,'%') OR p.Neighborhood LIKE CONCAT('%',?,'%'))`); params.push(term, term, term, term); }
    await this.fields.filters(q, where, params);
    const clause = where.join(' AND '), sort = q.sort === 'price_asc' ? `${priceCol} ASC` : q.sort === 'price_desc' ? `${priceCol} DESC` : 'p.CreatedAt DESC';
    const [count] = await this.db.query(`SELECT COUNT(*) AS Total FROM Properties p WHERE ${clause}`, params);
    // Se pagina sobre propiedades (subconsulta) y después se unen las imágenes.
    const rows = await this.db.query(`${WITH_IMAGES} FROM (SELECT p.* FROM Properties p WHERE ${clause} ORDER BY ${sort},p.Id LIMIT ? OFFSET ?) p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id ORDER BY ${sort},p.Id,i.Position`, [...params, take, (page - 1) * take]);
    const items = this.group(rows).map((p) => this.publicLocation(p)); const total = Number(count.Total);
    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  /** Cola de revisión del administrador: propiedades en REVIEW con datos del anunciante. */
  async reviewQueue() {
    const rows = await this.db.query(`${WITH_IMAGES},u.FullName AS OwnerName,u.Email AS OwnerEmail,u.Role AS OwnerRole FROM Properties p JOIN Users u ON u.Id=p.OwnerId LEFT JOIN PropertyImages i ON i.PropertyId=p.Id WHERE p.Status='REVIEW' ORDER BY p.UpdatedAt ASC,p.Id,i.Position`);
    const items = await this.withCustom(this.group(rows));
    const owners = new Map(rows.map((r: any) => [r.Id, { fullName: r.OwnerName, email: r.OwnerEmail, role: r.OwnerRole }]));
    return items.map((p) => ({ ...p, owner: owners.get(p.id) }));
  }

  /** Ficha pública. Las rentadas o vendidas siguen accesibles por enlace (con aviso), pero no salen en el catálogo. */
  async bySlug(slug: string) {
    const rows = await this.db.query(`${WITH_IMAGES} FROM Properties p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id WHERE p.Slug=? AND p.Status='PUBLISHED' ORDER BY i.Position`, [slug]);
    const items = await this.withCustom(this.group(rows));
    if (!items.length) throw new NotFoundException('Propiedad no encontrada.');
    // Contacto público del anunciante (nombre, teléfono para WhatsApp y agencia). El correo no se publica: los mensajes llegan por el formulario.
    const [o] = await this.db.query<any>(`SELECT u.FullName,u.Role,ap.Slug AS AgentSlug,ap.PhotoUrl AS AgentPhoto,COALESCE(u.Phone,ap.Phone,own.Phone,ag.Phone) AS Phone,COALESCE(own.Name,ag.Name) AS AgencyName,COALESCE(own.Slug,ag.Slug) AS AgencySlug
      FROM Users u LEFT JOIN AgentProfiles ap ON ap.UserId=u.Id LEFT JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId LEFT JOIN AgencyProfiles own ON own.UserId=u.Id WHERE u.Id=? LIMIT 1`, [items[0].ownerId]);
    const { ownerId, ...pub } = this.publicLocation(items[0]);
    const fields = (await this.fields.list()).map((f) => ({ key: f.key, label: f.label, type: f.type }));
    return {
      ...pub, customFields: fields,
      owner: o ? { fullName: o.AgencyName && (o.Role === 'AGENCY' || o.Role === 'DEVELOPER') ? o.AgencyName : o.FullName, role: o.Role, phone: o.Phone || process.env.CONTACT_PHONE?.trim() || null, agency: o.AgencySlug ? { name: o.AgencyName, slug: o.AgencySlug } : null, agent: o.Role === 'AGENT' && o.AgentSlug ? { slug: o.AgentSlug, photoUrl: o.AgentPhoto || null } : null } : null,
    };
  }

  private async detailInternal(id: string) {
    const rows = await this.db.query(`${WITH_IMAGES} FROM Properties p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id WHERE p.Id=? ORDER BY i.Position`, [id]);
    return (await this.withCustom(this.group(rows)))[0];
  }

  /** Editar. Si la edita el anunciante vuelve a borrador (debe pasar otra vez por revisión). */
  async update(id: string, userId: string, role: string, d: UpdatePropertyDto) {
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) throw new ForbiddenException('No puedes modificar esta propiedad.');
    if (role !== 'ADMIN') await this.assertApproved(userId);
    const operation = d.operation ?? p.Operation;
    this.checkPrices(operation, d.rentPrice !== undefined ? d.rentPrice : p.RentPrice);
    const custom = await this.fields.clean(d.custom);
    const cols: Record<string, string> = { title: 'Title', description: 'Description', operation: 'Operation', price: 'Price', category: 'Category', municipality: 'Municipality', neighborhood: 'Neighborhood', propertyType: 'PropertyType', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', landArea: 'LandArea', builtArea: 'BuiltArea' };
    const sets: string[] = [], params: any[] = [];
    for (const [key, col] of Object.entries(cols)) if ((d as any)[key] !== undefined) { sets.push(`${col}=?`); params.push((d as any)[key] ?? null); }
    if (d.rentPrice !== undefined || d.operation !== undefined) { sets.push('RentPrice=?'); params.push(operation === 'BOTH' ? (d.rentPrice ?? p.RentPrice) : null); }
    if (d.availableFrom !== undefined) { sets.push('AvailableFrom=?'); params.push(d.availableFrom ? d.availableFrom.slice(0, 10) : null); }
    if (d.latitude !== undefined || d.longitude !== undefined) { const has = d.latitude != null && d.longitude != null; sets.push('Latitude=?', 'Longitude=?'); params.push(has ? d.latitude : null, has ? d.longitude : null); }
    if (d.showExactLocation !== undefined) { sets.push('ShowExactLocation=?'); params.push(d.showExactLocation ? 1 : 0); }
    if (d.images && d.images.length > 20) throw new BadRequestException('Puedes agregar hasta 20 fotografías.');
    if (role === 'ADMIN' && d.ownerId && d.ownerId !== p.OwnerId) { sets.push('OwnerId=?'); params.push(await this.publisherId(d.ownerId)); }
    if (role !== 'ADMIN') sets.push("Status='DRAFT'");
    sets.push('UpdatedAt=UTC_TIMESTAMP()'); params.push(id);
    const oldImages = d.images ? (await this.db.query<any>('SELECT Url FROM PropertyImages WHERE PropertyId=?', [id])).map((r) => r.Url as string) : [];
    await this.db.transaction(async (tx) => {
      if (d.images) { await this.db.execute('DELETE FROM PropertyImages WHERE PropertyId=?', [id], tx); await this.insertImages(tx, id, d.images, d.imageLabels); }
      await this.db.execute(`UPDATE Properties SET ${sets.join(',')} WHERE Id=?`, params, tx);
      await this.fields.save(tx, id, custom);
    });
    if (d.images) removeMedia(oldImages.filter((u) => !d.images!.includes(u)));
    return this.detailInternal(id);
  }

  /** Disponibilidad (Disponible / Apartada / Rentada / Vendida). No requiere nueva revisión. */
  async setAvailability(id: string, userId: string, role: string, availability: string, availableFrom?: string | null) {
    if (!AVAILABILITY.includes(availability as any)) throw new BadRequestException('Disponibilidad no válida.');
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) throw new ForbiddenException('No puedes modificar esta propiedad.');
    if (availability === 'RENTED' && p.Operation === 'SALE') throw new BadRequestException('Esta propiedad es solo de venta.');
    if (availability === 'SOLD' && p.Operation === 'RENT') throw new BadRequestException('Esta propiedad es solo de renta.');
    const sets = ['Availability=?', 'UpdatedAt=UTC_TIMESTAMP()'], params: any[] = [availability];
    if (availableFrom !== undefined) { sets.push('AvailableFrom=?'); params.push(availableFrom ? String(availableFrom).slice(0, 10) : null); }
    await this.db.execute(`UPDATE Properties SET ${sets.join(',')} WHERE Id=?`, [...params, id]);
    return this.detailInternal(id);
  }

  async submit(id: string, userId: string, role?: string) {
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) throw new ForbiddenException();
    if (role !== 'ADMIN') await this.assertApproved(userId);
    // RF-02: datos mínimos y al menos una foto antes de enviar a revisión.
    const missing: string[] = [];
    if (!p.Title) missing.push('título');
    if (!p.Description) missing.push('descripción');
    if (!p.Municipality) missing.push('ubicación');
    if (!(Number(p.Price) > 0)) missing.push('precio');
    if (p.Operation === 'BOTH' && !(Number(p.RentPrice) > 0)) missing.push('precio de renta');
    if (!(Number(p.BuiltArea) > 0 || Number(p.LandArea) > 0)) missing.push('superficie (construcción o terreno)');
    const [img] = await this.db.query<any>('SELECT COUNT(*) AS n FROM PropertyImages WHERE PropertyId=?', [id]);
    if (!Number(img.n)) missing.push('al menos una foto');
    missing.push(...await this.fields.missingRequired(id));
    if (missing.length) throw new BadRequestException(`Antes de enviar a revisión completa: ${missing.join(', ')}.`);
    // El administrador es quien revisa: lo que él envía queda publicado de una vez.
    if (role === 'ADMIN') return this.moderate(id, 'PUBLISHED');
    await this.db.execute("UPDATE Properties SET Status='REVIEW',UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [id]);
    return this.detailInternal(id);
  }

  async moderate(id: string, status: string) {
    if (!['PUBLISHED', 'REJECTED', 'DRAFT'].includes(status)) throw new BadRequestException('Estado de moderación no válido.');
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    await this.db.execute('UPDATE Properties SET Status=?,UpdatedAt=UTC_TIMESTAMP() WHERE Id=?', [status, id]);
    if (status === 'PUBLISHED' && p.Status !== 'PUBLISHED') this.engagement.notifySearches(id);
    return this.detailInternal(id);
  }

  async remove(id: string, userId: string, role: string) {
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) throw new ForbiddenException();
    const urls = (await this.db.query<any>('SELECT Url FROM PropertyImages WHERE PropertyId=?', [id])).map((r) => r.Url as string);
    await this.db.execute('DELETE FROM Properties WHERE Id=?', [id]);
    removeMedia(urls);
    return { deleted: true };
  }
}
