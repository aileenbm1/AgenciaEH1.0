import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { DEMO_PATH_RE, MEDIA_PATH_RE } from '../uploads/media';

const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'asesor';
const CARD = `SELECT p.*, (SELECT i.Url FROM PropertyImages i WHERE i.PropertyId=p.Id ORDER BY i.Position LIMIT 1) AS Cover FROM Properties p`;
const card = (r: any) => ({ id: r.Id, slug: r.Slug, title: r.Title, operation: r.Operation, price: r.Price, rentPrice: r.RentPrice, availability: r.Availability, municipality: r.Municipality, neighborhood: r.Neighborhood,
  propertyType: r.PropertyType, bedrooms: r.Bedrooms, bathrooms: r.Bathrooms, builtArea: r.BuiltArea, landArea: r.LandArea, images: r.Cover ? [{ url: r.Cover, position: 0 }] : [] });

/** Perfil público del agente (RF-11) y estadísticas de perfil para agentes, agencias y desarrolladoras. */
@Injectable()
export class AgentsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly db: DatabaseService) {}

  // Da perfil y enlace público a los agentes que aún no lo tienen (al iniciar y cada hora).
  onModuleInit() { setTimeout(() => this.backfill().catch(() => undefined), 5000).unref?.(); this.timer = setInterval(() => this.backfill().catch(() => undefined), 3600000); this.timer.unref?.(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async backfill() {
    const rows = await this.db.query<any>(`SELECT u.Id FROM Users u LEFT JOIN AgentProfiles ap ON ap.UserId=u.Id WHERE u.Role='AGENT' AND (ap.Id IS NULL OR ap.Slug IS NULL) LIMIT 500`);
    for (const r of rows) await this.ensure(r.Id).catch(() => undefined);
  }

  /** Garantiza fila de perfil y slug público para un agente. */
  private async ensure(userId: string) {
    let [a] = await this.db.query<any>('SELECT ap.*, u.FullName FROM AgentProfiles ap JOIN Users u ON u.Id=ap.UserId WHERE ap.UserId=?', [userId]);
    if (!a) { await this.db.execute('INSERT IGNORE INTO AgentProfiles(Id,UserId) VALUES(?,?)', [randomUUID(), userId]); [a] = await this.db.query<any>('SELECT ap.*, u.FullName FROM AgentProfiles ap JOIN Users u ON u.Id=ap.UserId WHERE ap.UserId=?', [userId]); }
    if (!a.Slug) {
      const slug = `${slugify(a.FullName)}-${userId.replace(/-/g, '').slice(0, 5)}`;
      await this.db.execute('UPDATE AgentProfiles SET Slug=? WHERE UserId=? AND Slug IS NULL', [slug, userId]);
      a.Slug = slug;
    }
    return a;
  }

  /** Slug público del agente (o null si no es agente aprobado). Lo usa la ficha de propiedad. */
  async slugFor(userId: string) {
    const [u] = await this.db.query<any>("SELECT Role FROM Users WHERE Id=? AND IsActive=1 AND ApprovalStatus='APPROVED'", [userId]);
    if (u?.Role !== 'AGENT') return null;
    return (await this.ensure(userId)).Slug as string;
  }

  async bySlug(slug: string) {
    const [a] = await this.db.query<any>(`SELECT ap.UserId, ap.Bio, ap.PhotoUrl, ap.Slug, COALESCE(ap.Phone, u.Phone) AS Phone, u.FullName, u.CreatedAt, ag.Name AS AgencyName, ag.Slug AS AgencySlug
      FROM AgentProfiles ap JOIN Users u ON u.Id=ap.UserId LEFT JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId
      WHERE ap.Slug=? AND u.Role='AGENT' AND u.IsActive=1 AND u.ApprovalStatus='APPROVED' LIMIT 1`, [slug]);
    if (!a) throw new NotFoundException('Asesor no encontrado.');
    await this.db.execute('UPDATE AgentProfiles SET Views=Views+1 WHERE UserId=?', [a.UserId]);
    const rows = await this.db.query<any>(`${CARD} WHERE p.Status='PUBLISHED' AND p.Availability IN ('AVAILABLE','RESERVED') AND p.OwnerId=? ORDER BY p.CreatedAt DESC LIMIT 60`, [a.UserId]);
    const [c] = await this.db.query<any>(`SELECT SUM(Status='PUBLISHED' AND Availability IN ('AVAILABLE','RESERVED')) AS active, SUM(Availability IN ('RENTED','SOLD')) AS closed FROM Properties WHERE OwnerId=?`, [a.UserId]);
    return {
      fullName: a.FullName, slug: a.Slug, bio: a.Bio, photoUrl: a.PhotoUrl, phone: a.Phone, since: a.CreatedAt,
      agency: a.AgencySlug ? { name: a.AgencyName, slug: a.AgencySlug } : null,
      stats: { active: Number(c?.active || 0), closed: Number(c?.closed || 0) },
      properties: rows.map(card),
    };
  }

  async me(userId: string) {
    const a = await this.ensure(userId);
    const [ag] = a.AgencyId ? await this.db.query<any>('SELECT Name, Slug FROM AgencyProfiles WHERE Id=?', [a.AgencyId]) : [null];
    return { slug: a.Slug, bio: a.Bio, phone: a.Phone, photoUrl: a.PhotoUrl, agency: ag ? { name: ag.Name, slug: ag.Slug } : null, stats: await this.stats(userId, 'AGENT') };
  }

  async update(userId: string, d: { bio?: string; phone?: string; photoUrl?: string }) {
    await this.ensure(userId);
    const sets: string[] = [], params: any[] = [];
    if (d.bio !== undefined) { sets.push('Bio=?'); params.push(String(d.bio).trim().slice(0, 1000) || null); }
    if (d.phone !== undefined) { const ph = String(d.phone).trim(); if (ph && !/^[+\d][\d\s()-]{6,24}$/.test(ph)) throw new BadRequestException('Teléfono no válido.'); sets.push('Phone=?'); params.push(ph || null); }
    if (d.photoUrl !== undefined) {
      const u = String(d.photoUrl).trim();
      if (u && !(MEDIA_PATH_RE.test(u) || DEMO_PATH_RE.test(u) || /^https:\/\/\S{3,480}$/.test(u))) throw new BadRequestException('Foto no válida.');
      sets.push('PhotoUrl=?'); params.push(u || null);
    }
    if (sets.length) await this.db.execute(`UPDATE AgentProfiles SET ${sets.join(',')} WHERE UserId=?`, [...params, userId]);
    return this.me(userId);
  }

  /** Estadísticas del perfil: visitas al perfil, publicaciones, prospectos, reservas y fanpages. */
  async stats(userId: string, role: string) {
    let owners: string[] = [userId], views = 0;
    if (role === 'AGENCY' || role === 'DEVELOPER') {
      const [ag] = await this.db.query<any>('SELECT Id, Views FROM AgencyProfiles WHERE UserId=?', [userId]);
      if (ag) { views = Number(ag.Views || 0); owners = [userId, ...(await this.db.query<any>('SELECT UserId FROM AgentProfiles WHERE AgencyId=?', [ag.Id])).map((x: any) => x.UserId)]; }
    } else {
      const [ap] = await this.db.query<any>('SELECT Views FROM AgentProfiles WHERE UserId=?', [userId]);
      views = Number(ap?.Views || 0);
    }
    const ph = owners.map(() => '?').join(',');
    const [p] = await this.db.query<any>(`SELECT COUNT(*) AS total, SUM(Status='PUBLISHED' AND Availability IN ('AVAILABLE','RESERVED')) AS active, SUM(Availability='RENTED') AS rented, SUM(Availability='SOLD') AS sold, SUM(Status='REVIEW') AS review FROM Properties WHERE OwnerId IN (${ph})`, owners);
    const [l] = await this.db.query<any>(`SELECT COUNT(*) AS total, SUM(CreatedAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY) AS last30, SUM(Kind='VISIT') AS visits, SUM(Status='CLOSED') AS won FROM Leads WHERE AssignedToId IN (${ph})`, owners);
    const [r] = await this.db.query<any>(`SELECT SUM(Status='PENDING') AS pending, SUM(Status IN ('APPROVED','DEPOSIT_PAID')) AS open, SUM(Status='COMPLETED') AS completed FROM Reservations WHERE OwnerId IN (${ph})`, owners);
    const [f] = await this.db.query<any>(`SELECT SUM(e.Kind='VIEW') AS views, SUM(e.Kind='SHARE') AS shares, SUM(e.Kind='CTA') AS cta, SUM(e.Kind='LEAD') AS leads FROM FanpageEvents e JOIN Properties p ON p.Id=e.PropertyId WHERE p.OwnerId IN (${ph})`, owners).catch(() => [{}]);
    const n = (v: any) => Number(v || 0);
    return {
      profileViews: views, team: owners.length - 1,
      properties: { total: n(p?.total), active: n(p?.active), rented: n(p?.rented), sold: n(p?.sold), review: n(p?.review) },
      leads: { total: n(l?.total), last30: n(l?.last30), visits: n(l?.visits), won: n(l?.won) },
      reservations: { pending: n(r?.pending), open: n(r?.open), completed: n(r?.completed) },
      fanpages: { views: n(f?.views), shares: n(f?.shares), cta: n(f?.cta), leads: n(f?.leads) },
    };
  }
}
