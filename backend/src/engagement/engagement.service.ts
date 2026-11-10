import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { CreateLeadDto, SaveSearchDto, UpdateAgencyDto, UpdateLeadDto } from './engagement.dto';

const SEARCH_KEYS = ['operation', 'category', 'municipality', 'propertyType', 'minPrice', 'maxPrice', 'bedrooms', 'search', 'neighborhood'];
const toMysqlDate = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
const fmtWhen = (d: Date) => d.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' });

@Injectable()
export class EngagementService {
  private hits = new Map<string, number[]>();
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  // ───────────── Prospectos y visitas ─────────────
  /** Límite simple anti-abuso: 6 mensajes por IP cada 10 minutos. */
  private rateLimit(ip: string) {
    const now = Date.now(), list = (this.hits.get(ip) || []).filter((t) => now - t < 600000);
    if (list.length >= 6) throw new HttpException('Enviaste varios mensajes seguidos. Intenta de nuevo en unos minutos.', HttpStatus.TOO_MANY_REQUESTS);
    list.push(now); this.hits.set(ip, list);
    if (this.hits.size > 5000) this.hits.clear();
  }

  async createLead(d: CreateLeadDto, ip: string, userId?: string) {
    if (d.website) return { success: true }; // bot
    this.rateLimit(ip || 'local');
    const [p] = await this.db.query<any>(`SELECT p.Id, p.Title, p.OwnerId, u.Email AS OwnerEmail FROM Properties p JOIN Users u ON u.Id = p.OwnerId
      WHERE p.Id=? AND p.Status='PUBLISHED' LIMIT 1`, [d.propertyId]);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    const kind = d.kind || 'MESSAGE';
    let visitAt: Date | null = null;
    if (kind === 'VISIT') {
      if (!d.visitAt) throw new BadRequestException('Elige el día y la hora de la visita.');
      visitAt = new Date(d.visitAt);
      if (isNaN(visitAt.getTime()) || visitAt.getTime() < Date.now() - 3600000) throw new BadRequestException('Elige una fecha futura para la visita.');
      if (visitAt.getTime() > Date.now() + 180 * 86400000) throw new BadRequestException('Elige una fecha dentro de los próximos 6 meses.');
    }
    if (kind === 'MESSAGE' && !d.message?.trim()) throw new BadRequestException('Escribe tu mensaje.');
    const id = randomUUID();
    const source = d.source?.toLowerCase() || 'ficha', campaign = d.campaign?.trim().slice(0, 80) || null;
    await this.db.execute(`INSERT INTO Leads(Id,PropertyId,Name,Email,Phone,Message,Status,AssignedToId,UserId,Kind,VisitAt,Source,Campaign,UpdatedAt)
      VALUES(?,?,?,?,?,?, 'NEW', ?,?,?,?,?,?, UTC_TIMESTAMP())`,
      [id, p.Id, d.name.trim(), d.email.trim().toLowerCase(), d.phone?.trim() || null, d.message?.trim() || null, p.OwnerId, userId || null, kind, visitAt ? toMysqlDate(visitAt.toISOString()) : null, source, campaign]);
    // Estadística de la fanpage: prospecto generado desde ella.
    if (source === 'fanpage') await this.db.execute("INSERT INTO FanpageEvents(PropertyId,Kind,Channel,Campaign) VALUES(?,'LEAD',NULL,?)", [p.Id, campaign]).catch(() => undefined);
    this.mail.sendLeadNotice(p.OwnerEmail, kind, p.Title, d.name.trim(), visitAt ? fmtWhen(visitAt) : undefined);
    return { success: true, message: kind === 'VISIT' ? 'Solicitud de visita enviada. El asesor te contactará para confirmarla.' : 'Mensaje enviado. El asesor te contactará pronto.' };
  }

  private leadRow(r: any) {
    return { id: r.Id, kind: r.Kind, status: r.Status, name: r.Name, email: r.Email, phone: r.Phone, message: r.Message, notes: r.Notes,
      visitAt: r.VisitAt, createdAt: r.CreatedAt, source: r.Source || 'ficha', campaign: r.Campaign || null, property: r.PropertyId ? { id: r.PropertyId, title: r.Title, slug: r.Slug } : null,
      assignedTo: r.AssignedName ? { id: r.AssignedToId, fullName: r.AssignedName } : null };
  }

  /** Prospectos asignados a mí; para una agencia con scope=team, también los de sus agentes. */
  async myLeads(userId: string, role: string, scope?: string) {
    let where = 'l.AssignedToId=?'; const params: any[] = [userId];
    if (scope === 'team' && (role === 'AGENCY' || role === 'DEVELOPER')) {
      where = `(l.AssignedToId=? OR l.AssignedToId IN (SELECT ap.UserId FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id = ap.AgencyId WHERE ag.UserId=?))`;
      params.push(userId);
    } else if (scope === 'all' && role === 'ADMIN') { where = '1=1'; params.length = 0; }
    const rows = await this.db.query<any>(`SELECT l.*, p.Title, p.Slug, a.FullName AS AssignedName FROM Leads l
      LEFT JOIN Properties p ON p.Id = l.PropertyId LEFT JOIN Users a ON a.Id = l.AssignedToId
      WHERE ${where} ORDER BY (l.Status='NEW') DESC, l.CreatedAt DESC LIMIT 300`, params);
    return rows.map((r: any) => this.leadRow(r));
  }

  async updateLead(userId: string, role: string, id: string, d: UpdateLeadDto) {
    const [l] = await this.db.query<any>('SELECT Id, AssignedToId FROM Leads WHERE Id=? LIMIT 1', [id]);
    if (!l) throw new NotFoundException('Prospecto no encontrado.');
    let allowed = role === 'ADMIN' || l.AssignedToId === userId;
    if (!allowed && (role === 'AGENCY' || role === 'DEVELOPER')) {
      const [t] = await this.db.query<any>('SELECT 1 AS ok FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id = ap.AgencyId WHERE ag.UserId=? AND ap.UserId=? LIMIT 1', [userId, l.AssignedToId]);
      allowed = !!t;
    }
    if (!allowed) throw new ForbiddenException('No puedes modificar este prospecto.');
    const sets: string[] = ['UpdatedAt=UTC_TIMESTAMP()'], params: any[] = [];
    if (d.status) { sets.push('Status=?'); params.push(d.status); }
    if (d.notes !== undefined) { sets.push('Notes=?'); params.push(d.notes.trim() || null); }
    if (d.visitAt) { sets.push('VisitAt=?'); params.push(toMysqlDate(d.visitAt)); }
    await this.db.execute(`UPDATE Leads SET ${sets.join(',')} WHERE Id=?`, [...params, id]);
    const [r] = await this.db.query<any>(`SELECT l.*, p.Title, p.Slug, a.FullName AS AssignedName FROM Leads l LEFT JOIN Properties p ON p.Id=l.PropertyId LEFT JOIN Users a ON a.Id=l.AssignedToId WHERE l.Id=?`, [id]);
    return this.leadRow(r);
  }

  /** Mensajes y visitas que envió el usuario (vista del comprador). */
  async sentLeads(userId: string) {
    const rows = await this.db.query<any>(`SELECT l.*, p.Title, p.Slug, a.FullName AS AssignedName FROM Leads l
      LEFT JOIN Properties p ON p.Id = l.PropertyId LEFT JOIN Users a ON a.Id = l.AssignedToId WHERE l.UserId=? ORDER BY l.CreatedAt DESC LIMIT 100`, [userId]);
    return rows.map((r: any) => { const x = this.leadRow(r); return { ...x, notes: undefined }; });
  }

  // ───────────── Favoritos ─────────────
  async favoriteIds(userId: string) {
    return (await this.db.query<any>('SELECT PropertyId FROM Favorites WHERE UserId=?', [userId])).map((r) => r.PropertyId as string);
  }
  async favorites(userId: string) {
    const rows = await this.db.query<any>(`SELECT p.Id, p.Slug, p.Title, p.Operation, p.Price, p.RentPrice, p.Availability, p.Municipality, p.Neighborhood, p.PropertyType, p.Bedrooms, p.Bathrooms, p.BuiltArea, p.LandArea, p.Status,
      (SELECT i.Url FROM PropertyImages i WHERE i.PropertyId=p.Id ORDER BY i.Position LIMIT 1) AS Cover
      FROM Favorites f JOIN Properties p ON p.Id = f.PropertyId WHERE f.UserId=? ORDER BY f.CreatedAt DESC`, [userId]);
    return rows.map((r: any) => ({ id: r.Id, slug: r.Slug, title: r.Title, operation: r.Operation, price: r.Price, rentPrice: r.RentPrice, availability: r.Availability, municipality: r.Municipality, neighborhood: r.Neighborhood,
      propertyType: r.PropertyType, bedrooms: r.Bedrooms, bathrooms: r.Bathrooms, builtArea: r.BuiltArea, landArea: r.LandArea, available: r.Status === 'PUBLISHED', images: r.Cover ? [{ url: r.Cover, position: 0 }] : [] }));
  }
  async addFavorite(userId: string, propertyId: string) {
    const [p] = await this.db.query<any>("SELECT Id FROM Properties WHERE Id=? AND Status='PUBLISHED' LIMIT 1", [propertyId]);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    await this.db.execute('INSERT IGNORE INTO Favorites(Id,UserId,PropertyId) VALUES(?,?,?)', [randomUUID(), userId, propertyId]);
    return { favorite: true };
  }
  async removeFavorite(userId: string, propertyId: string) {
    await this.db.execute('DELETE FROM Favorites WHERE UserId=? AND PropertyId=?', [userId, propertyId]);
    return { favorite: false };
  }

  // ───────────── Búsquedas guardadas ─────────────
  private cleanQuery(q: Record<string, any>) {
    const out = new URLSearchParams();
    for (const k of SEARCH_KEYS) { const v = q?.[k]; if (v !== undefined && v !== null && String(v).trim() !== '') out.set(k, String(v).trim().slice(0, 100)); }
    return out;
  }
  async searches(userId: string) {
    const rows = await this.db.query<any>('SELECT * FROM SavedSearches WHERE UserId=? ORDER BY CreatedAt DESC', [userId]);
    return rows.map((r: any) => ({ id: r.Id, name: r.Name, query: Object.fromEntries(new URLSearchParams(r.Query)), alerts: !!r.Alerts, lastNotifiedAt: r.LastNotifiedAt, createdAt: r.CreatedAt }));
  }
  async saveSearch(userId: string, d: SaveSearchDto) {
    const q = this.cleanQuery(d.query);
    if (![...q.keys()].length) throw new BadRequestException('Aplica al menos un filtro antes de guardar la búsqueda.');
    const [c] = await this.db.query<any>('SELECT COUNT(*) AS n FROM SavedSearches WHERE UserId=?', [userId]);
    if (Number(c.n) >= 20) throw new BadRequestException('Puedes guardar hasta 20 búsquedas. Borra alguna para agregar otra.');
    const id = randomUUID();
    await this.db.execute('INSERT INTO SavedSearches(Id,UserId,Name,Query,Alerts) VALUES(?,?,?,?,?)', [id, userId, d.name.trim(), q.toString(), d.alerts === false ? 0 : 1]);
    return (await this.searches(userId)).find((s) => s.id === id);
  }
  async updateSearch(userId: string, id: string, alerts: boolean) {
    const r = await this.db.execute('UPDATE SavedSearches SET Alerts=? WHERE Id=? AND UserId=?', [alerts ? 1 : 0, id, userId]);
    if (!r.affectedRows) throw new NotFoundException('Búsqueda no encontrada.');
    return { alerts };
  }
  async deleteSearch(userId: string, id: string) {
    const r = await this.db.execute('DELETE FROM SavedSearches WHERE Id=? AND UserId=?', [id, userId]);
    if (!r.affectedRows) throw new NotFoundException('Búsqueda no encontrada.');
    return { deleted: true };
  }

  /** Al publicarse una propiedad, avisa por correo a las búsquedas guardadas que coinciden. */
  async notifySearches(propertyId: string) {
    try {
      const [p] = await this.db.query<any>("SELECT * FROM Properties WHERE Id=? AND Status='PUBLISHED' LIMIT 1", [propertyId]);
      if (!p) return;
      const rows = await this.db.query<any>(`SELECT s.Id, s.Name, s.Query, u.Email FROM SavedSearches s JOIN Users u ON u.Id = s.UserId
        WHERE s.Alerts=1 AND u.IsActive=1 AND u.Id <> ?`, [p.OwnerId]);
      const has = (a: any, b: string) => String(a || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(b.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
      if (!['AVAILABLE', 'RESERVED'].includes(p.Availability || 'AVAILABLE')) return;
      for (const s of rows) {
        const q = new URLSearchParams(s.Query);
        // Venta y renta coincide con ambas búsquedas; en renta se compara la renta mensual.
        const price = Number(q.get('operation') === 'RENT' && p.Operation === 'BOTH' ? p.RentPrice : p.Price);
        const ok = (!q.get('operation') || q.get('operation') === p.Operation || p.Operation === 'BOTH')
          && (!q.get('category') || q.get('category') === (p.Category || ''))
          && (!q.get('municipality') || has(p.Municipality, q.get('municipality')!))
          && (!q.get('neighborhood') || has(p.Neighborhood, q.get('neighborhood')!))
          && (!q.get('propertyType') || has(p.PropertyType, q.get('propertyType')!))
          && (!q.get('minPrice') || price >= Number(q.get('minPrice')))
          && (!q.get('maxPrice') || price <= Number(q.get('maxPrice')))
          && (!q.get('bedrooms') || Number(p.Bedrooms || 0) >= Number(q.get('bedrooms')))
          && (!q.get('search') || [p.Title, p.Description, p.Municipality, p.Neighborhood].some((v) => has(v, q.get('search')!)));
        if (!ok) continue;
        this.mail.sendSearchAlert(s.Email, s.Name, p.Title, p.Slug);
        await this.db.execute('UPDATE SavedSearches SET LastNotifiedAt=UTC_TIMESTAMP() WHERE Id=?', [s.Id]);
      }
    } catch (e: any) { console.error('[Agencia EH] Avisos de búsquedas:', e?.message); }
  }

  // ───────────── Perfil público de agencia ─────────────
  async agencyBySlug(slug: string) {
    const [a] = await this.db.query<any>(`SELECT ag.Id, ag.UserId, ag.Name, ag.Slug, ag.Description, COALESCE(ag.Phone, u.Phone) AS Phone, u.Role FROM AgencyProfiles ag
      JOIN Users u ON u.Id = ag.UserId WHERE ag.Slug=? AND u.IsActive=1 AND u.ApprovalStatus='APPROVED' LIMIT 1`, [slug]);
    if (!a) throw new NotFoundException('Agencia no encontrada.');
    await this.db.execute('UPDATE AgencyProfiles SET Views=Views+1 WHERE Id=?', [a.Id]);
    const agents = await this.db.query<any>(`SELECT u.Id, u.FullName, ap.Slug, ap.PhotoUrl FROM AgentProfiles ap JOIN Users u ON u.Id = ap.UserId WHERE ap.AgencyId=? AND u.IsActive=1 ORDER BY u.FullName`, [a.Id]);
    const owners = [a.UserId, ...agents.map((x: any) => x.Id)];
    const rows = await this.db.query<any>(`SELECT p.*, (SELECT i.Url FROM PropertyImages i WHERE i.PropertyId=p.Id ORDER BY i.Position LIMIT 1) AS Cover
      FROM Properties p WHERE p.Status='PUBLISHED' AND p.Availability IN ('AVAILABLE','RESERVED') AND p.OwnerId IN (${owners.map(() => '?').join(',')}) ORDER BY p.CreatedAt DESC LIMIT 60`, owners);
    return {
      name: a.Name, slug: a.Slug, description: a.Description, phone: a.Phone, kind: a.Role === 'DEVELOPER' ? 'DEVELOPER' : 'AGENCY', agents: agents.map((x: any) => ({ id: x.Id, fullName: x.FullName, slug: x.Slug, photoUrl: x.PhotoUrl })),
      properties: rows.map((r: any) => ({ id: r.Id, slug: r.Slug, title: r.Title, operation: r.Operation, price: r.Price, rentPrice: r.RentPrice, availability: r.Availability, municipality: r.Municipality, neighborhood: r.Neighborhood,
        propertyType: r.PropertyType, bedrooms: r.Bedrooms, bathrooms: r.Bathrooms, builtArea: r.BuiltArea, landArea: r.LandArea, images: r.Cover ? [{ url: r.Cover, position: 0 }] : [] })),
    };
  }
  async myAgency(userId: string) {
    const [a] = await this.db.query<any>('SELECT Name, Slug, Description, Phone FROM AgencyProfiles WHERE UserId=? LIMIT 1', [userId]);
    if (!a) throw new NotFoundException('Tu cuenta no tiene perfil de agencia.');
    return { name: a.Name, slug: a.Slug, description: a.Description, phone: a.Phone };
  }
  async updateMyAgency(userId: string, d: UpdateAgencyDto) {
    const sets: string[] = [], params: any[] = [];
    if (d.name !== undefined) { sets.push('Name=?'); params.push(d.name.trim()); }
    if (d.description !== undefined) { sets.push('Description=?'); params.push(d.description.trim() || null); }
    if (d.phone !== undefined) { sets.push('Phone=?'); params.push(d.phone.trim() || null); }
    if (sets.length) await this.db.execute(`UPDATE AgencyProfiles SET ${sets.join(',')} WHERE UserId=?`, [...params, userId]);
    return this.myAgency(userId);
  }
}
