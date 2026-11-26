import { WatchesService } from '../watches/watches.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
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
export class PropertiesService implements OnModuleInit {
  constructor(private db: DatabaseService, private engagement: EngagementService, private fields: CustomFieldsService, private mail: MailService, private watches: WatchesService) {}

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

  /** Lo que ve el público: ubicación aproximada si así se pidió y precio oculto si es "a consultar". */
  private publicView<T extends { latitude: number | null; longitude: number | null; showExactLocation: boolean }>(p: T): T {
    const q: any = this.publicLocation(p);
    const out = q.priceMode === 'HIDE' ? { ...q, price: 0, rentPrice: null } : q;
    delete out.pauseReason; delete out.publishAt; delete out.hideAt; delete out.confirmedAt;
    return out;
  }

  /** Precio: obligatorio salvo "a consultar". */
  private checkPriceMode(mode: string, price: unknown) {
    // El precio es opcional: vacío o 0 se publica como “Precio a consultar”.
    void mode; void price;
  }

  /** Etiqueta del precio: texto plano corto. null = automática, "" = sin etiqueta. */
  private cleanSuffix(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    return String(v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40);
  }

  private async logEvent(propertyId: string, userId: string | null, kind: string, note?: string | null) {
    await this.db.execute('INSERT INTO PropertyEvents (Id, PropertyId, UserId, Kind, Note) VALUES (?,?,?,?,?)', [randomUUID(), propertyId, userId, kind, note ? String(note).slice(0, 300) : null]).catch(() => {});
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
          priceMode: row.PriceMode || 'SHOW', priceSuffix: row.PriceSuffix ?? null, pauseReason: row.PauseReason || null, publishAt: row.PublishAt || null, hideAt: row.HideAt || null, confirmedAt: row.ConfirmedAt || null,
          latitude: row.Latitude != null ? Number(row.Latitude) : null, longitude: row.Longitude != null ? Number(row.Longitude) : null, showExactLocation: !!row.ShowExactLocation, reviewNote: row.Status === 'REJECTED' ? row.ReviewNote ?? null : null,
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
    const mode = d.priceMode || 'SHOW';
    this.checkPriceMode(mode, d.price);
    const custom = await this.fields.clean(d.custom);
    const id = randomUUID();
    await this.db.transaction(async (tx) => {
      await this.db.execute(`INSERT INTO Properties(Id,Slug,Title,Description,Operation,Status,Price,PriceMode,PriceSuffix,RentPrice,Currency,Category,Availability,AvailableFrom,Municipality,Neighborhood,PropertyType,Bedrooms,Bathrooms,LandArea,BuiltArea,Latitude,Longitude,ShowExactLocation,OwnerId)
        VALUES(?,?,?,?,?,'DRAFT',?,?,?,?,'MXN',?,'AVAILABLE',?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, this.slug(d.title), d.title, d.description, d.operation, Number(d.price) > 0 ? d.price : 0, mode, this.cleanSuffix(d.priceSuffix), d.operation === 'BOTH' && Number(d.rentPrice) > 0 ? d.rentPrice : null, d.category || categoryFor(d.propertyType),
          d.availableFrom ? d.availableFrom.slice(0, 10) : null, d.municipality, d.neighborhood ?? null, d.propertyType, d.bedrooms ?? null, d.bathrooms ?? null,
          d.landArea ?? null, d.builtArea ?? null, d.latitude ?? null, d.latitude != null ? d.longitude ?? null : null, d.showExactLocation ? 1 : 0, ownerId], tx);
      await this.insertImages(tx, id, d.images || [], d.imageLabels);
      await this.fields.save(tx, id, custom);
    });
    await this.logEvent(id, userId, 'created');
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
      const exp = await this.expiryInfo(items.map((p) => p.id));
      return items.map((p) => ({ ...p, owner: byId.get(p.ownerId) || null, expiry: exp[p.id] || null }));
    }
    const rows = await this.db.query(`${WITH_IMAGES} FROM Properties p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id WHERE p.OwnerId=? ORDER BY p.UpdatedAt DESC,p.Id,i.Position`, [userId]);
    const items = await this.withCustom(this.group(rows));
    const exp = await this.expiryInfo(items.map((p) => p.id));
    return items.map((p) => ({ ...p, expiry: exp[p.id] || null }));
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
      where.push("p.PriceMode<>'HIDE' AND p.Price>0");
      if (q.minPrice !== undefined) { where.push(`${priceCol}>=?`); params.push(min); }
      if (q.maxPrice !== undefined) { where.push(`${priceCol}<=?`); params.push(max); }
    }
    if (q.bedrooms !== undefined && q.bedrooms !== '') { const beds = Number(q.bedrooms); if (!Number.isInteger(beds) || beds < 0 || beds > 30) throw new BadRequestException('Número de recámaras no válido.'); where.push('p.Bedrooms>=?'); params.push(beds); }
    if (q.bathrooms !== undefined && q.bathrooms !== '') { const b = Number(q.bathrooms); if (!Number.isInteger(b) || b < 0 || b > 30) throw new BadRequestException('Número de baños no válido.'); where.push('p.Bathrooms>=?'); params.push(b); }
    if (q.search) { const term = String(q.search).slice(0, 100); where.push(`(p.Title LIKE CONCAT('%',?,'%') OR p.Description LIKE CONCAT('%',?,'%') OR p.Municipality LIKE CONCAT('%',?,'%') OR p.Neighborhood LIKE CONCAT('%',?,'%'))`); params.push(term, term, term, term); }
    await this.fields.filters(q, where, params);
    const clause = where.join(' AND '), sort = q.sort === 'price_asc' ? `(p.PriceMode='HIDE' OR p.Price<=0),${priceCol} ASC` : q.sort === 'price_desc' ? `(p.PriceMode='HIDE' OR p.Price<=0),${priceCol} DESC` : 'p.CreatedAt DESC';
    const [count] = await this.db.query(`SELECT COUNT(*) AS Total FROM Properties p WHERE ${clause}`, params);
    // Se pagina sobre propiedades (subconsulta) y después se unen las imágenes.
    const rows = await this.db.query(`${WITH_IMAGES} FROM (SELECT p.* FROM Properties p WHERE ${clause} ORDER BY ${sort},p.Id LIMIT ? OFFSET ?) p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id ORDER BY ${sort},p.Id,i.Position`, [...params, take, (page - 1) * take]);
    const items = this.group(rows).map((p) => this.publicView(p)); const total = Number(count.Total);
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
    return this.publicDetail(rows);
  }

  /** Vista previa de la ficha (aunque no esté publicada): solo el anunciante, su agencia o el administrador. */
  async preview(id: string, userId: string, role: string) {
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) {
      const [team] = await this.db.query<any>('SELECT 1 AS x FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ap.UserId=? AND ag.UserId=?', [p.OwnerId, userId]);
      if (!team) throw new ForbiddenException('No puedes ver esta propiedad.');
    }
    const rows = await this.db.query(`${WITH_IMAGES} FROM Properties p LEFT JOIN PropertyImages i ON i.PropertyId=p.Id WHERE p.Id=? ORDER BY i.Position`, [id]);
    return { ...(await this.publicDetail(rows, true)), status: p.Status, reviewNote: p.ReviewNote ?? null };
  }

  private async publicDetail(rows: any[], exactLocation = false) {
    const items = await this.withCustom(this.group(rows));
    if (!items.length) throw new NotFoundException('Propiedad no encontrada.');
    // Contacto público del anunciante (nombre, teléfono para WhatsApp y agencia). El correo no se publica: los mensajes llegan por el formulario.
    const [o] = await this.db.query<any>(`SELECT u.FullName,u.Role,ap.Slug AS AgentSlug,ap.PhotoUrl AS AgentPhoto,COALESCE(u.Phone,ap.Phone,own.Phone,ag.Phone) AS Phone,COALESCE(own.Name,ag.Name) AS AgencyName,COALESCE(own.Slug,ag.Slug) AS AgencySlug
      FROM Users u LEFT JOIN AgentProfiles ap ON ap.UserId=u.Id LEFT JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId LEFT JOIN AgencyProfiles own ON own.UserId=u.Id WHERE u.Id=? LIMIT 1`, [items[0].ownerId]);
    const { ownerId, ...pub } = exactLocation ? items[0] : this.publicView(items[0]);
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
    const mode = d.priceMode ?? p.PriceMode ?? 'SHOW';
    this.checkPriceMode(mode, d.price !== undefined ? d.price : p.Price);
    const custom = await this.fields.clean(d.custom);
    const cols: Record<string, string> = { title: 'Title', description: 'Description', operation: 'Operation', price: 'Price', category: 'Category', municipality: 'Municipality', neighborhood: 'Neighborhood', propertyType: 'PropertyType', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', landArea: 'LandArea', builtArea: 'BuiltArea' };
    const sets: string[] = [], params: any[] = [];
    for (const [key, col] of Object.entries(cols)) if ((d as any)[key] !== undefined) { sets.push(`${col}=?`); params.push(key === 'price' ? (Number(d.price) > 0 ? d.price : 0) : (d as any)[key] ?? null); }
    if (d.priceMode !== undefined) { sets.push('PriceMode=?'); params.push(mode); }
    if (d.priceSuffix !== undefined) { sets.push('PriceSuffix=?'); params.push(this.cleanSuffix(d.priceSuffix)); }
    if (d.rentPrice !== undefined || d.operation !== undefined) { const rp = d.rentPrice !== undefined ? d.rentPrice : p.RentPrice; sets.push('RentPrice=?'); params.push(operation === 'BOTH' && Number(rp) > 0 ? rp : null); }
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
    if (availableFrom && !/^\d{4}-\d{2}-\d{2}/.test(String(availableFrom))) throw new BadRequestException('La fecha no es válida.');
    if (availableFrom !== undefined) { sets.push('AvailableFrom=?'); params.push(availableFrom ? String(availableFrom).slice(0, 10) : null); }
    await this.db.execute(`UPDATE Properties SET ${sets.join(',')} WHERE Id=?`, [...params, id]);
    // Avisa al instante a quienes esperan esta propiedad (si quedó disponible o se libera pronto).
    this.watches.check(id).catch((e) => console.error('[Mi Casa] Avisos de disponibilidad:', e?.message));
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

  async moderate(id: string, status: string, note?: string) {
    if (!['PUBLISHED', 'REJECTED', 'DRAFT'].includes(status)) throw new BadRequestException('Estado de moderación no válido.');
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    // Al rechazar se guarda el motivo para que el anunciante sepa qué corregir; al publicar se borra.
    const reason = status === 'REJECTED' ? String(note || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500) || null : null;
    // Si tiene fecha de publicación futura, queda Programada y se publica sola ese día.
    const scheduled = status === 'PUBLISHED' && p.PublishAt && new Date(p.PublishAt).getTime() > Date.now();
    const finalStatus = scheduled ? 'SCHEDULED' : status;
    await this.db.execute(`UPDATE Properties SET Status=?,ReviewNote=?,UpdatedAt=UTC_TIMESTAMP()${status === 'PUBLISHED' ? ',ConfirmedAt=UTC_TIMESTAMP(),RemindedAt=NULL,PauseReason=NULL' : ''} WHERE Id=?`, [finalStatus, reason, id]);
    await this.logEvent(id, null, finalStatus === 'SCHEDULED' ? 'scheduled' : status === 'PUBLISHED' ? 'published' : status === 'REJECTED' ? 'rejected' : 'draft', reason);
    if (status === 'REJECTED' && p.Status !== 'REJECTED') {
      const [o] = await this.db.query<any>('SELECT Email, FullName FROM Users WHERE Id=?', [p.OwnerId]);
      if (o?.Email) this.mail.notify(o.Email, `Tu propiedad necesita cambios · ${p.Title}`, 'Revisa tu propiedad',
        `Revisamos "${p.Title}" y necesita algunos cambios antes de publicarse.${reason ? ` Motivo: ${reason}` : ''} Corrígela y vuelve a enviarla a revisión.`,
        'Ver mis propiedades', '/panel/agente/propiedades', 'Recibes este aviso porque enviaste esta propiedad a revisión en Mi Casa.');
    }
    if (finalStatus === 'PUBLISHED' && p.Status !== 'PUBLISHED') this.engagement.notifySearches(id);
    return this.detailInternal(id);
  }


  // ---------- Visibilidad: pausar, reanudar, programar, vigencia ----------
  /** Dueño, su agencia o el administrador. */
  private async manageable(id: string, userId: string, role: string) {
    const p = await this.getById(id);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) {
      const [team] = await this.db.query<any>('SELECT 1 AS x FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ap.UserId=? AND ag.UserId=?', [p.OwnerId, userId]);
      if (!team) throw new ForbiddenException('No puedes modificar esta propiedad.');
    }
    return p;
  }

  async pause(id: string, userId: string, role: string) {
    const p = await this.manageable(id, userId, role);
    if (!['PUBLISHED', 'SCHEDULED'].includes(p.Status)) throw new BadRequestException('Solo se pausan propiedades publicadas o programadas.');
    await this.db.execute("UPDATE Properties SET Status='PAUSED', PauseReason='owner', UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [id]);
    await this.logEvent(id, userId, 'paused');
    return this.detailInternal(id);
  }

  /** Reanudar no vuelve a revisión (no hubo cambios). Si tiene fecha futura de publicación, queda Programada. */
  async resume(id: string, userId: string, role: string) {
    const p = await this.manageable(id, userId, role);
    if (p.Status !== 'PAUSED') throw new BadRequestException('La propiedad no está pausada.');
    const future = p.PublishAt && new Date(p.PublishAt).getTime() > Date.now();
    await this.db.execute(`UPDATE Properties SET Status=?, PauseReason=NULL, HideAt=IF(HideAt IS NOT NULL AND HideAt<=UTC_TIMESTAMP(), NULL, HideAt), ConfirmedAt=UTC_TIMESTAMP(), RemindedAt=NULL, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?`, [future ? 'SCHEDULED' : 'PUBLISHED', id]);
    await this.logEvent(id, userId, 'resumed');
    if (!future) this.engagement.notifySearches(id);
    return this.detailInternal(id);
  }

  /** "Sí, sigue disponible": renueva la vigencia (y la reactiva si se pausó por inactividad). */
  async confirm(id: string, userId: string, role: string) {
    const p = await this.manageable(id, userId, role);
    const reactivate = p.Status === 'PAUSED' && p.PauseReason === 'inactive';
    await this.db.execute(`UPDATE Properties SET ConfirmedAt=UTC_TIMESTAMP(), RemindedAt=NULL${reactivate ? ", Status='PUBLISHED', PauseReason=NULL" : ''} WHERE Id=?`, [id]);
    await this.logEvent(id, userId, 'confirmed');
    return this.detailInternal(id);
  }

  /** Programar publicación y/o ocultamiento (fechas con hora, en UTC desde el navegador). */
  async schedule(id: string, userId: string, role: string, publishAt?: string | null, hideAt?: string | null) {
    const p = await this.manageable(id, userId, role);
    const parse = (v: string | null | undefined, label: string) => {
      if (v === undefined) return undefined; if (!v) return null;
      const d = new Date(v); if (isNaN(d.getTime())) throw new BadRequestException(`La fecha de ${label} no es válida.`);
      return d;
    };
    const pub = parse(publishAt, 'publicación'), hide = parse(hideAt, 'ocultar');
    const pubT = pub === undefined ? (p.PublishAt ? new Date(p.PublishAt).getTime() : 0) : pub ? pub.getTime() : 0;
    const hideT = hide === undefined ? (p.HideAt ? new Date(p.HideAt).getTime() : 0) : hide ? hide.getTime() : 0;
    if (hide && hide.getTime() <= Date.now()) throw new BadRequestException('La fecha para ocultar debe ser futura.');
    if (pubT && hideT && hideT <= pubT) throw new BadRequestException('La fecha para ocultar debe ser después de la de publicación.');
    const sql = (d: Date | null) => d ? d.toISOString().slice(0, 19).replace('T', ' ') : null;
    const sets: string[] = [], params: any[] = [];
    if (pub !== undefined) { sets.push('PublishAt=?'); params.push(sql(pub)); }
    if (hide !== undefined) { sets.push('HideAt=?'); params.push(sql(hide)); }
    // Publicada con fecha futura → Programada; Programada sin fecha futura → Publicada.
    if (p.Status === 'PUBLISHED' && pubT > Date.now()) sets.push("Status='SCHEDULED'");
    if (p.Status === 'SCHEDULED' && !(pubT > Date.now())) sets.push("Status='PUBLISHED'", 'ConfirmedAt=UTC_TIMESTAMP()');
    if (!sets.length) return this.detailInternal(id);
    await this.db.execute(`UPDATE Properties SET ${sets.join(',')} WHERE Id=?`, [...params, id]);
    const fmt = (t: number) => new Date(t).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
    await this.logEvent(id, userId, 'schedule', [pubT ? `publicar ${fmt(pubT)}` : '', hideT ? `ocultar ${fmt(hideT)}` : ''].filter(Boolean).join(' · ') || 'sin fechas');
    return this.detailInternal(id);
  }

  async events(id: string, userId: string, role: string) {
    await this.manageable(id, userId, role);
    return this.db.query<any>('SELECT e.Kind AS kind, e.Note AS note, e.CreatedAt AS createdAt, u.FullName AS who FROM PropertyEvents e LEFT JOIN Users u ON u.Id=e.UserId WHERE e.PropertyId=? ORDER BY e.CreatedAt DESC LIMIT 60', [id]);
  }

  /** Vigencia de anuncios (la elige el administrador): recordar a los N días y pausar a los M. */
  async expirySettings(): Promise<{ enabled: boolean; remind: number; pause: number }> {
    const [r] = await this.db.query<any>("SELECT V FROM SiteSettings WHERE K='listing.expiry'");
    try { const v = r?.V ? JSON.parse(r.V) : {}; return { enabled: v.enabled !== false, remind: Number(v.remind) || 60, pause: Number(v.pause) || 90 }; } catch { return { enabled: true, remind: 60, pause: 90 }; }
  }
  async saveExpirySettings(d: any) {
    const remind = Math.round(Number(d?.remind)), pause = Math.round(Number(d?.pause));
    if (!(remind >= 7 && remind <= 365) || !(pause > remind && pause <= 730)) throw new BadRequestException('Los días para recordar deben estar entre 7 y 365, y los de pausar ser más que los de recordar.');
    const v = JSON.stringify({ enabled: d?.enabled !== false, remind, pause });
    await this.db.execute("INSERT INTO SiteSettings (K, V) VALUES ('listing.expiry', ?) ON DUPLICATE KEY UPDATE V=VALUES(V)", [v]);
    return this.expirySettings();
  }

  /** Última actividad: confirmación, edición, publicación o una reserva nueva. */
  private readonly LAST_ACTIVITY = "GREATEST(COALESCE(p.ConfirmedAt, p.UpdatedAt, p.CreatedAt), p.UpdatedAt, COALESCE((SELECT MAX(r.CreatedAt) FROM Reservations r WHERE r.PropertyId=p.Id), '2000-01-01'))";

  /** Días que faltan para que una propiedad publicada se pause por inactividad. */
  async expiryInfo(ids: string[]) {
    if (!ids.length) return {} as Record<string, { pauseIn: number; reminded: boolean }>;
    const cfg = await this.expirySettings(); if (!cfg.enabled) return {};
    const rows = await this.db.query<any>(`SELECT p.Id, p.RemindedAt, DATEDIFF(DATE_ADD(${this.LAST_ACTIVITY}, INTERVAL ? DAY), UTC_TIMESTAMP()) AS left_ FROM Properties p WHERE p.Status='PUBLISHED' AND p.Id IN (${ids.map(() => '?').join(',')})`, [cfg.pause, ...ids]);
    const out: Record<string, { pauseIn: number; reminded: boolean }> = {};
    for (const r of rows) out[r.Id] = { pauseIn: Math.max(0, Number(r.left_)), reminded: !!r.RemindedAt };
    return out;
  }

  onModuleInit() {
    const run = () => this.visibilityJob().catch((e) => console.error('[Mi Casa] Programación y vigencia:', e?.message));
    setTimeout(run, 60_000).unref?.();
    setInterval(run, 15 * 60_000).unref?.();
  }

  /** Cada 15 minutos: publica las programadas, oculta las que vencieron y revisa la vigencia. */
  async visibilityJob() {
    const owner = async (id: string) => (await this.db.query<any>('SELECT u.Email, p.Title FROM Properties p JOIN Users u ON u.Id=p.OwnerId WHERE p.Id=?', [id]))[0];
    for (const r of await this.db.query<any>("SELECT Id FROM Properties WHERE Status='SCHEDULED' AND PublishAt IS NOT NULL AND PublishAt <= UTC_TIMESTAMP()")) {
      await this.db.execute("UPDATE Properties SET Status='PUBLISHED', ConfirmedAt=UTC_TIMESTAMP(), RemindedAt=NULL WHERE Id=?", [r.Id]);
      await this.logEvent(r.Id, null, 'auto-published'); this.engagement.notifySearches(r.Id);
      const o = await owner(r.Id); if (o?.Email) this.mail.notify(o.Email, `${o.Title} ya está publicada`, 'Tu propiedad ya está publicada', `"${o.Title}" se publicó en la fecha que programaste.`, 'Ver mis propiedades', '/panel/agente/propiedades', 'Recibes este aviso porque programaste esta publicación en Mi Casa.');
    }
    for (const r of await this.db.query<any>("SELECT Id FROM Properties WHERE Status='PUBLISHED' AND HideAt IS NOT NULL AND HideAt <= UTC_TIMESTAMP()")) {
      await this.db.execute("UPDATE Properties SET Status='PAUSED', PauseReason='schedule' WHERE Id=?", [r.Id]);
      await this.logEvent(r.Id, null, 'auto-hidden');
      const o = await owner(r.Id); if (o?.Email) this.mail.notify(o.Email, `${o.Title} se ocultó`, 'Tu propiedad se ocultó', `"${o.Title}" dejó de mostrarse en la fecha que programaste. Puedes reanudarla cuando quieras.`, 'Ver mis propiedades', '/panel/agente/propiedades', 'Recibes este aviso porque programaste ocultar esta propiedad en Mi Casa.');
    }
    const cfg = await this.expirySettings(); if (!cfg.enabled) return;
    for (const r of await this.db.query<any>(`SELECT p.Id FROM Properties p WHERE p.Status='PUBLISHED' AND p.RemindedAt IS NULL AND ${this.LAST_ACTIVITY} <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`, [cfg.remind])) {
      await this.db.execute('UPDATE Properties SET RemindedAt=UTC_TIMESTAMP() WHERE Id=?', [r.Id]);
      await this.logEvent(r.Id, null, 'reminded');
      const o = await owner(r.Id); if (o?.Email) this.mail.notify(o.Email, `¿Sigue disponible ${o.Title}?`, `¿Sigue disponible ${o.Title}?`, `Hace ${cfg.remind} días que no hay movimiento en este anuncio. Confírmalo en Mis propiedades; si no, se pausará solo a los ${cfg.pause} días para que el catálogo esté al día.`, 'Confirmar en Mis propiedades', '/panel/agente/propiedades', 'Recibes este aviso porque anuncias esta propiedad en Mi Casa.');
    }
    for (const r of await this.db.query<any>(`SELECT p.Id FROM Properties p WHERE p.Status='PUBLISHED' AND p.RemindedAt IS NOT NULL AND ${this.LAST_ACTIVITY} <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`, [cfg.pause])) {
      await this.db.execute("UPDATE Properties SET Status='PAUSED', PauseReason='inactive' WHERE Id=?", [r.Id]);
      await this.logEvent(r.Id, null, 'auto-paused');
      const o = await owner(r.Id); if (o?.Email) this.mail.notify(o.Email, `${o.Title} se pausó por inactividad`, 'Tu propiedad se pausó', `"${o.Title}" llevaba ${cfg.pause} días sin movimiento y dejó de mostrarse. Si sigue disponible, confírmalo y vuelve a salir al instante.`, 'Reactivar', '/panel/agente/propiedades', 'Recibes este aviso porque anuncias esta propiedad en Mi Casa.');
    }
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
