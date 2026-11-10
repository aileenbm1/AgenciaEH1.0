import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { Block, cleanBlocks, cleanTheme, DEFAULT_THEME, defaultBlocks, SEED_TEMPLATES, Theme } from './fanpage-blocks';

type FanpageSettings = { roles: string[]; requireApproval: boolean };
const DEFAULT_SETTINGS: FanpageSettings = { roles: ['AGENT', 'AGENCY', 'DEVELOPER'], requireApproval: false };
const EDITOR_ROLES = ['AGENT', 'AGENCY', 'DEVELOPER'];
const EVENT_KINDS = ['VIEW', 'SHARE', 'CTA'];
const parse = <T>(s: string | null | undefined, d: T): T => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const label = (s: string | null | undefined, max: number) => (s ? String(s).replace(/[^\w .@:/+áéíóúñÁÉÍÓÚÑ-]/g, '').trim().slice(0, max) || null : null);

@Injectable()
export class FanpagesService implements OnModuleInit {
  private hits = new Map<string, number[]>();
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  /** Siembra las plantillas iniciales una sola vez (si la tabla está vacía). */
  async onModuleInit() {
    setTimeout(async () => {
      try {
        const [c] = await this.db.query<any>('SELECT COUNT(*) AS n FROM FanpageTemplates');
        if (Number(c?.n) === 0) for (const t of SEED_TEMPLATES) await this.db.execute('INSERT INTO FanpageTemplates(Id,Name,Description,Theme,Blocks) VALUES(?,?,?,?,?)', [randomUUID(), t.name, t.description, JSON.stringify(t.theme), JSON.stringify(t.blocks)]);
      } catch { /* la tabla se crea al iniciar; se reintenta en el próximo arranque */ }
    }, 4000).unref?.();
  }

  // ───────────── Ajustes del admin ─────────────
  async settings(): Promise<FanpageSettings> {
    const [r] = await this.db.query<any>("SELECT V FROM SiteSettings WHERE K='fanpage'");
    const s = parse<Partial<FanpageSettings>>(r?.V, {});
    return { roles: Array.isArray(s.roles) ? s.roles.filter((x) => EDITOR_ROLES.includes(x)) : DEFAULT_SETTINGS.roles, requireApproval: typeof s.requireApproval === 'boolean' ? s.requireApproval : DEFAULT_SETTINGS.requireApproval };
  }
  async saveSettings(d: any) {
    const s: FanpageSettings = { roles: Array.isArray(d.roles) ? d.roles.filter((x: string) => EDITOR_ROLES.includes(x)) : DEFAULT_SETTINGS.roles, requireApproval: !!d.requireApproval };
    await this.db.execute("INSERT INTO SiteSettings(K,V) VALUES('fanpage',?) ON DUPLICATE KEY UPDATE V=VALUES(V)", [JSON.stringify(s)]);
    return s;
  }

  // ───────────── Permisos ─────────────
  private async property(id: string) {
    const [p] = await this.db.query<any>('SELECT Id, Slug, Title, OwnerId, Status FROM Properties WHERE Id=?', [id]);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    return p;
  }
  private async manages(userId: string, role: string, ownerId: string) {
    if (role === 'ADMIN' || userId === ownerId) return true;
    if (role !== 'AGENCY' && role !== 'DEVELOPER') return false;
    const [t] = await this.db.query<any>('SELECT 1 AS ok FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ag.UserId=? AND ap.UserId=? LIMIT 1', [userId, ownerId]);
    return !!t;
  }
  /** Puede editar: admin siempre; los demás si su rol está permitido por el admin y administran la propiedad. */
  private async editable(userId: string, role: string, propertyId: string) {
    const p = await this.property(propertyId);
    if (role !== 'ADMIN') {
      const s = await this.settings();
      if (!s.roles.includes(role)) throw new ForbiddenException('El administrador no habilitó la fanpage para tu tipo de cuenta.');
      if (!(await this.manages(userId, role, p.OwnerId))) throw new ForbiddenException('No puedes editar la fanpage de esta propiedad.');
    }
    return p;
  }

  // ───────────── Público ─────────────
  async publicBySlug(slug: string) {
    const [p] = await this.db.query<any>("SELECT Id FROM Properties WHERE Slug=? AND Status='PUBLISHED'", [slug]);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    const [f] = await this.db.query<any>("SELECT Theme, Blocks FROM Fanpages WHERE PropertyId=? AND Blocks IS NOT NULL", [p.Id]);
    return f ? { custom: true, theme: cleanTheme(parse(f.Theme, DEFAULT_THEME)), blocks: parse<Block[]>(f.Blocks, defaultBlocks()) } : { custom: false, theme: DEFAULT_THEME, blocks: defaultBlocks() };
  }

  /** Estadísticas: visitas, clics en compartir y en botones (con canal y campaña UTM). */
  async track(slug: string, d: any, ip: string) {
    const kind = String(d?.kind || '').toUpperCase();
    if (!EVENT_KINDS.includes(kind)) throw new BadRequestException('Evento no válido.');
    const [p] = await this.db.query<any>("SELECT Id FROM Properties WHERE Slug=? AND Status='PUBLISHED'", [slug]);
    if (!p) throw new NotFoundException();
    // Límite por IP y una visita por persona cada 30 minutos.
    const now = Date.now(), key = `${ip}`, list = (this.hits.get(key) || []).filter((t) => now - t < 600000);
    if (list.length >= 60) return { ok: true };
    list.push(now); this.hits.set(key, list);
    if (this.hits.size > 5000) this.hits.clear();
    if (kind === 'VIEW') { const vk = `v:${ip}:${p.Id}`; const last = this.hits.get(vk)?.[0]; if (last && now - last < 1800000) return { ok: true }; this.hits.set(vk, [now]); }
    await this.db.execute('INSERT INTO FanpageEvents(PropertyId,Kind,Channel,Campaign) VALUES(?,?,?,?)', [p.Id, kind, label(d.channel, 30), label(d.campaign, 80)]);
    return { ok: true };
  }

  // ───────────── Editor ─────────────
  async get(userId: string, role: string, propertyId: string) {
    const p = await this.editable(userId, role, propertyId);
    const [f] = await this.db.query<any>('SELECT * FROM Fanpages WHERE PropertyId=?', [propertyId]);
    const settings = await this.settings();
    const images = (await this.db.query<any>('SELECT Url, Label, Position FROM PropertyImages WHERE PropertyId=? ORDER BY Position', [propertyId])).map((i: any) => ({ url: i.Url, label: i.Label, position: i.Position }));
    const [x] = await this.db.query<any>('SELECT * FROM Properties WHERE Id=?', [propertyId]);
    const [o] = await this.db.query<any>('SELECT u.FullName, u.Role, COALESCE(u.Phone, ap.Phone) AS Phone FROM Users u LEFT JOIN AgentProfiles ap ON ap.UserId=u.Id WHERE u.Id=?', [x.OwnerId]);
    return {
      // Datos para la vista previa del editor (aunque la propiedad aún no esté publicada).
      property: {
        id: p.Id, slug: p.Slug, title: p.Title, status: p.Status, description: x.Description, operation: x.Operation, price: x.Price, rentPrice: x.RentPrice,
        category: x.Category, availability: x.Availability, municipality: x.Municipality, neighborhood: x.Neighborhood, propertyType: x.PropertyType,
        bedrooms: x.Bedrooms, bathrooms: x.Bathrooms, builtArea: x.BuiltArea, landArea: x.LandArea,
        latitude: x.Latitude != null ? Number(x.Latitude) : null, longitude: x.Longitude != null ? Number(x.Longitude) : null, showExactLocation: !!x.ShowExactLocation,
        images, owner: o ? { fullName: o.FullName, role: o.Role, phone: o.Phone } : null,
      },
      images,
      status: f?.Status || 'NEW', reviewNote: f?.ReviewNote || null, publishedAt: f?.PublishedAt || null, updatedAt: f?.UpdatedAt || null,
      hasPublished: !!f?.Blocks,
      // El borrador tiene cambios que aún no se publican.
      unpublishedChanges: !!f?.DraftBlocks && (f.DraftBlocks !== f.Blocks || f.DraftTheme !== f.Theme),
      theme: cleanTheme(parse(f?.DraftTheme ?? f?.Theme, DEFAULT_THEME)),
      blocks: parse<Block[]>(f?.DraftBlocks ?? f?.Blocks, defaultBlocks()),
      requireApproval: role !== 'ADMIN' && settings.requireApproval,
    };
  }

  private async snapshot(propertyId: string, theme: Theme, blocks: Block[], note: string, userId: string) {
    await this.db.execute('INSERT INTO FanpageVersions(Id,PropertyId,Theme,Blocks,Note,CreatedById) VALUES(?,?,?,?,?,?)', [randomUUID(), propertyId, JSON.stringify(theme), JSON.stringify(blocks), note.slice(0, 200), userId]);
    // Se conservan las 30 versiones más recientes.
    const old = await this.db.query<any>('SELECT Id FROM FanpageVersions WHERE PropertyId=? ORDER BY CreatedAt DESC, Id LIMIT 1000 OFFSET 30', [propertyId]);
    for (const o of old) await this.db.execute('DELETE FROM FanpageVersions WHERE Id=?', [o.Id]);
  }

  async save(userId: string, role: string, propertyId: string, d: any) {
    await this.editable(userId, role, propertyId);
    const theme = cleanTheme(d?.theme), blocks = cleanBlocks(d?.blocks);
    await this.db.execute(`INSERT INTO Fanpages(PropertyId,Status,DraftTheme,DraftBlocks,UpdatedById,UpdatedAt) VALUES(?,'DRAFT',?,?,?,UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE DraftTheme=VALUES(DraftTheme), DraftBlocks=VALUES(DraftBlocks), UpdatedById=VALUES(UpdatedById), UpdatedAt=UTC_TIMESTAMP(), Status=IF(Status='PENDING','DRAFT',Status)`,
      [propertyId, JSON.stringify(theme), JSON.stringify(blocks), userId]);
    await this.snapshot(propertyId, theme, blocks, String(d?.note || 'Guardado'), userId);
    return this.get(userId, role, propertyId);
  }

  /** Publica el borrador; si el admin exige aprobación, queda pendiente. */
  async publish(userId: string, role: string, propertyId: string) {
    const p = await this.editable(userId, role, propertyId);
    const [f] = await this.db.query<any>('SELECT * FROM Fanpages WHERE PropertyId=?', [propertyId]);
    if (!f?.DraftBlocks) throw new BadRequestException('Guarda el diseño antes de publicarlo.');
    const s = await this.settings();
    if (role !== 'ADMIN' && s.requireApproval) {
      await this.db.execute("UPDATE Fanpages SET Status='PENDING', ReviewNote=NULL, UpdatedAt=UTC_TIMESTAMP() WHERE PropertyId=?", [propertyId]);
      const admins = await this.db.query<any>("SELECT Email FROM Users WHERE Role='ADMIN' AND IsActive=1 LIMIT 5");
      for (const a of admins) this.mail.notify(a.Email, `Fanpage por aprobar · ${p.Title}`, 'Hay una fanpage por aprobar', `Se envió a aprobación el diseño de la fanpage de "${p.Title}".`, 'Revisar', '/panel/admin#fanpages', 'Recibes este aviso porque eres administrador de Agencia EH.');
    } else await this.applyPublish(propertyId, userId);
    return this.get(userId, role, propertyId);
  }
  private async applyPublish(propertyId: string, userId: string) {
    const [f] = await this.db.query<any>('SELECT DraftTheme, DraftBlocks FROM Fanpages WHERE PropertyId=?', [propertyId]);
    await this.db.execute("UPDATE Fanpages SET Status='PUBLISHED', Theme=DraftTheme, Blocks=DraftBlocks, PublishedAt=UTC_TIMESTAMP(), ReviewNote=NULL, UpdatedAt=UTC_TIMESTAMP() WHERE PropertyId=?", [propertyId]);
    await this.snapshot(propertyId, cleanTheme(parse(f.DraftTheme, DEFAULT_THEME)), parse(f.DraftBlocks, []), 'Publicada', userId);
  }

  /** Vuelve a la fanpage automática (deja de mostrarse el diseño publicado). */
  async unpublish(userId: string, role: string, propertyId: string) {
    await this.editable(userId, role, propertyId);
    await this.db.execute("UPDATE Fanpages SET Status='DRAFT', Theme=NULL, Blocks=NULL, PublishedAt=NULL, UpdatedAt=UTC_TIMESTAMP() WHERE PropertyId=?", [propertyId]);
    return this.get(userId, role, propertyId);
  }

  async versions(userId: string, role: string, propertyId: string) {
    await this.editable(userId, role, propertyId);
    const rows = await this.db.query<any>('SELECT v.Id, v.Note, v.CreatedAt, u.FullName FROM FanpageVersions v LEFT JOIN Users u ON u.Id=v.CreatedById WHERE v.PropertyId=? ORDER BY v.CreatedAt DESC, v.Id LIMIT 30', [propertyId]);
    return rows.map((r: any) => ({ id: r.Id, note: r.Note, createdAt: r.CreatedAt, by: r.FullName }));
  }

  /** Revertir: copia una versión anterior al borrador (luego se publica). */
  async restore(userId: string, role: string, propertyId: string, versionId: string) {
    await this.editable(userId, role, propertyId);
    const [v] = await this.db.query<any>('SELECT * FROM FanpageVersions WHERE Id=? AND PropertyId=?', [versionId, propertyId]);
    if (!v) throw new NotFoundException('Versión no encontrada.');
    return this.save(userId, role, propertyId, { theme: parse(v.Theme, DEFAULT_THEME), blocks: parse(v.Blocks, []), note: `Restaurada (${new Date(v.CreatedAt).toLocaleDateString('es-MX')})` });
  }

  async stats(userId: string, role: string, propertyId: string) {
    await this.editable(userId, role, propertyId);
    const totals = await this.db.query<any>('SELECT Kind, COUNT(*) AS n FROM FanpageEvents WHERE PropertyId=? GROUP BY Kind', [propertyId]);
    const channels = await this.db.query<any>("SELECT Kind, COALESCE(Channel,'directo') AS Channel, COUNT(*) AS n FROM FanpageEvents WHERE PropertyId=? GROUP BY Kind, Channel ORDER BY n DESC LIMIT 50", [propertyId]);
    const campaigns = await this.db.query<any>("SELECT Campaign, SUM(Kind='VIEW') AS views, SUM(Kind='CTA') AS cta, SUM(Kind='LEAD') AS leads FROM FanpageEvents WHERE PropertyId=? AND Campaign IS NOT NULL GROUP BY Campaign ORDER BY views DESC LIMIT 20", [propertyId]);
    const daily = await this.db.query<any>("SELECT DATE(CreatedAt) AS d, COUNT(*) AS n FROM FanpageEvents WHERE PropertyId=? AND Kind='VIEW' AND CreatedAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY GROUP BY DATE(CreatedAt) ORDER BY d", [propertyId]);
    const t = (k: string) => Number(totals.find((x: any) => x.Kind === k)?.n || 0);
    return {
      views: t('VIEW'), shares: t('SHARE'), cta: t('CTA'), leads: t('LEAD'),
      channels: channels.map((c: any) => ({ kind: c.Kind, channel: c.Channel, n: Number(c.n) })),
      campaigns: campaigns.map((c: any) => ({ campaign: c.Campaign, views: Number(c.views), cta: Number(c.cta), leads: Number(c.leads) })),
      daily: daily.map((x: any) => ({ day: x.d instanceof Date ? x.d.toISOString().slice(0, 10) : String(x.d).slice(0, 10), views: Number(x.n) })),
    };
  }

  // ───────────── Plantillas ─────────────
  async templates(all = false) {
    const rows = await this.db.query<any>(`SELECT * FROM FanpageTemplates ${all ? '' : 'WHERE IsActive=1'} ORDER BY CreatedAt, Name`);
    return rows.map((t: any) => ({ id: t.Id, name: t.Name, description: t.Description, isActive: !!t.IsActive, theme: cleanTheme(parse(t.Theme, DEFAULT_THEME)), blocks: parse<Block[]>(t.Blocks, []) }));
  }
  /** Clona una plantilla en el borrador de la fanpage. */
  async applyTemplate(userId: string, role: string, propertyId: string, templateId: string) {
    const [t] = await this.db.query<any>('SELECT * FROM FanpageTemplates WHERE Id=? AND (IsActive=1 OR ?)', [templateId, role === 'ADMIN' ? 1 : 0]);
    if (!t) throw new NotFoundException('Plantilla no encontrada.');
    return this.save(userId, role, propertyId, { theme: parse(t.Theme, DEFAULT_THEME), blocks: parse(t.Blocks, []), note: `Plantilla "${t.Name}"` });
  }
  /** Admin: guarda el diseño actual de una fanpage como plantilla nueva. */
  async saveAsTemplate(d: any) {
    const name = String(d?.name || '').trim().slice(0, 80);
    if (name.length < 2) throw new BadRequestException('Escribe un nombre para la plantilla.');
    const theme = cleanTheme(d?.theme), blocks = cleanBlocks(d?.blocks);
    await this.db.execute('INSERT INTO FanpageTemplates(Id,Name,Description,Theme,Blocks) VALUES(?,?,?,?,?)', [randomUUID(), name, String(d?.description || '').trim().slice(0, 300) || null, JSON.stringify(theme), JSON.stringify(blocks)]);
    return this.templates(true);
  }
  async updateTemplate(id: string, d: any) {
    const sets: string[] = [], params: any[] = [];
    if (d?.name !== undefined) { const n = String(d.name).trim().slice(0, 80); if (n.length < 2) throw new BadRequestException('Nombre no válido.'); sets.push('Name=?'); params.push(n); }
    if (d?.description !== undefined) { sets.push('Description=?'); params.push(String(d.description).trim().slice(0, 300) || null); }
    if (d?.isActive !== undefined) { sets.push('IsActive=?'); params.push(d.isActive ? 1 : 0); }
    if (d?.blocks !== undefined) { sets.push('Blocks=?', 'Theme=?'); params.push(JSON.stringify(cleanBlocks(d.blocks)), JSON.stringify(cleanTheme(d.theme))); }
    if (sets.length) await this.db.execute(`UPDATE FanpageTemplates SET ${sets.join(',')} WHERE Id=?`, [...params, id]);
    return this.templates(true);
  }
  async deleteTemplate(id: string) { await this.db.execute('DELETE FROM FanpageTemplates WHERE Id=?', [id]); return this.templates(true); }

  // ───────────── Aprobación (admin) ─────────────
  async pending() {
    const rows = await this.db.query<any>("SELECT f.PropertyId, f.UpdatedAt, p.Title, p.Slug, u.FullName FROM Fanpages f JOIN Properties p ON p.Id=f.PropertyId LEFT JOIN Users u ON u.Id=f.UpdatedById WHERE f.Status='PENDING' ORDER BY f.UpdatedAt");
    return rows.map((r: any) => ({ propertyId: r.PropertyId, title: r.Title, slug: r.Slug, by: r.FullName, updatedAt: r.UpdatedAt }));
  }
  async review(adminId: string, propertyId: string, d: any) {
    const [f] = await this.db.query<any>("SELECT f.UpdatedById, p.Title, u.Email FROM Fanpages f JOIN Properties p ON p.Id=f.PropertyId LEFT JOIN Users u ON u.Id=f.UpdatedById WHERE f.PropertyId=? AND f.Status='PENDING'", [propertyId]);
    if (!f) throw new NotFoundException('No hay una fanpage pendiente para esta propiedad.');
    if (d?.approve) await this.applyPublish(propertyId, adminId);
    else await this.db.execute("UPDATE Fanpages SET Status='REJECTED', ReviewNote=?, UpdatedAt=UTC_TIMESTAMP() WHERE PropertyId=?", [String(d?.note || '').slice(0, 500) || null, propertyId]);
    if (f.Email) this.mail.notify(f.Email, `Fanpage ${d?.approve ? 'aprobada' : 'no aprobada'} · ${f.Title}`, d?.approve ? 'Tu fanpage ya está publicada' : 'Tu fanpage necesita cambios', d?.approve ? `El diseño de la fanpage de "${f.Title}" fue aprobado y ya es público.` : `El administrador pidió cambios en la fanpage de "${f.Title}".${d?.note ? ` Nota: ${String(d.note).slice(0, 300)}` : ''}`, 'Abrir editor', `/panel/fanpage/${propertyId}`);
    return this.pending();
  }
}
