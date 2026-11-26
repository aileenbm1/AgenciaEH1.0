import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';

const UNAVAILABLE = "('RENTED','SOLD','RESERVED')";
const mxn = (v: number) => `$${Math.round(v).toLocaleString('es-MX')}`;
const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });

/**
 * "Avísame cuando esté disponible".
 * - El interesado se anota (o se anota solo si una de sus favoritas deja de estar disponible).
 * - Recibe UN aviso por cambio: "pronto" (7 días antes de la fecha de liberación), "disponible" o "bajó de precio".
 * - El dueño recibe un aviso 14 días antes de que se libere si hay gente esperando.
 * - El dueño solo ve nombre y contacto de quien aceptó compartirlos; de los demás, solo cuántos son.
 */
@Injectable()
export class WatchesService implements OnModuleInit {
  constructor(private db: DatabaseService, private mail: MailService) {}

  onModuleInit() {
    const run = () => this.check().catch((e) => console.error('[Mi Casa] Avisos de disponibilidad:', e?.message));
    setTimeout(run, 90_000).unref?.();
    setInterval(run, 3600000).unref?.();
  }

  private async publishedProperty(id: string) {
    const [p] = await this.db.query<any>("SELECT Id, OwnerId, Price, Availability, AvailableFrom, Status FROM Properties WHERE Id=?", [id]);
    if (!p || p.Status !== 'PUBLISHED') throw new NotFoundException('Propiedad no encontrada.');
    return p;
  }

  async count(propertyId: string) {
    const [r] = await this.db.query<any>('SELECT COUNT(*) AS n FROM PropertyWatches WHERE PropertyId=?', [propertyId]);
    return { count: Number(r?.n || 0) };
  }

  async status(userId: string, propertyId: string) {
    const [w] = await this.db.query<any>('SELECT ShareContact FROM PropertyWatches WHERE UserId=? AND PropertyId=?', [userId, propertyId]);
    return { ...(await this.count(propertyId)), watching: !!w, shareContact: !!w?.ShareContact };
  }

  async watch(userId: string, propertyId: string, shareContact: boolean) {
    const p = await this.publishedProperty(propertyId);
    if (p.OwnerId === userId) throw new ForbiddenException('Es tu propia propiedad.');
    // Si ya está disponible, solo cuenta para avisar si baja de precio.
    const today = new Date().toISOString().slice(0, 10);
    const free = p.Availability === 'AVAILABLE' && (!p.AvailableFrom || String(p.AvailableFrom).slice(0, 10) <= today);
    await this.db.execute(`INSERT INTO PropertyWatches (UserId, PropertyId, ShareContact, Source, LastKind, LastPrice) VALUES (?,?,?,'manual',?,?)
      ON DUPLICATE KEY UPDATE ShareContact=VALUES(ShareContact), Source='manual'`, [userId, propertyId, shareContact ? 1 : 0, free ? 'available' : null, p.Price]);
    return this.status(userId, propertyId);
  }

  async unwatch(userId: string, propertyId: string) {
    await this.db.execute('DELETE FROM PropertyWatches WHERE UserId=? AND PropertyId=?', [userId, propertyId]);
    return { ...(await this.count(propertyId)), watching: false, shareContact: false };
  }

  async mine(userId: string) {
    const rows = await this.db.query<any>(`SELECT w.PropertyId, w.ShareContact, w.Source, w.NoticeKind, w.NoticeAt, w.SeenAt, w.PrevPrice, w.CreatedAt,
        p.Title, p.Slug, IF(p.PriceMode='HIDE', 0, p.Price) AS Price, p.RentPrice, p.Operation, p.PriceMode, p.Availability, p.AvailableFrom, p.Municipality,
        (SELECT Url FROM PropertyImages i WHERE i.PropertyId=p.Id ORDER BY i.Position LIMIT 1) AS Cover
      FROM PropertyWatches w JOIN Properties p ON p.Id=w.PropertyId WHERE w.UserId=? AND p.Status='PUBLISHED' ORDER BY COALESCE(w.NoticeAt, w.CreatedAt) DESC`, [userId]);
    return rows.map((r) => ({
      propertyId: r.PropertyId, title: r.Title, slug: r.Slug, cover: r.Cover, municipality: r.Municipality, operation: r.Operation,
      price: Number(r.Price), prevPrice: r.PrevPrice != null ? Number(r.PrevPrice) : null, availability: r.Availability,
      availableFrom: r.AvailableFrom ? String(r.AvailableFrom instanceof Date ? r.AvailableFrom.toISOString() : r.AvailableFrom).slice(0, 10) : null,
      notice: r.NoticeKind || null, noticeAt: r.NoticeAt, unseen: !!r.NoticeAt && (!r.SeenAt || r.SeenAt < r.NoticeAt), shareContact: !!r.ShareContact, source: r.Source,
    }));
  }

  async seen(userId: string) {
    await this.db.execute('UPDATE PropertyWatches SET SeenAt=UTC_TIMESTAMP() WHERE UserId=? AND NoticeAt IS NOT NULL', [userId]);
    return { ok: true };
  }

  /** Lista de espera para el dueño, su agencia o el administrador. */
  async waitlist(propertyId: string, userId: string, role: string) {
    const [p] = await this.db.query<any>('SELECT OwnerId, Title FROM Properties WHERE Id=?', [propertyId]);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    if (role !== 'ADMIN' && p.OwnerId !== userId) {
      const [team] = await this.db.query<any>('SELECT 1 AS x FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ap.UserId=? AND ag.UserId=?', [p.OwnerId, userId]);
      if (!team) throw new ForbiddenException('No puedes ver esta lista.');
    }
    const rows = await this.db.query<any>(`SELECT w.ShareContact, w.CreatedAt, u.FullName, u.Email, u.Phone FROM PropertyWatches w JOIN Users u ON u.Id=w.UserId
      WHERE w.PropertyId=? ORDER BY w.CreatedAt`, [propertyId]);
    const shared = rows.filter((r) => r.ShareContact).map((r) => ({ name: r.FullName, email: r.Email, phone: r.Phone || null, since: r.CreatedAt }));
    return { title: p.Title, count: rows.length, shared, anonymous: rows.length - shared.length };
  }

  private async notify(w: any, kind: 'soon' | 'available' | 'price') {
    const prev = w.LastPrice != null ? Number(w.LastPrice) : null, price = Number(w.Price);
    await this.db.execute(`UPDATE PropertyWatches SET LastKind=?, NoticeKind=?, NoticeAt=UTC_TIMESTAMP(), LastPrice=?, PrevPrice=? WHERE UserId=? AND PropertyId=?`,
      [kind === 'price' ? w.LastKind : kind, kind, price, kind === 'price' ? prev : w.PrevPrice ?? null, w.UserId, w.PropertyId]);
    const per = w.Operation === 'RENT' ? ' / mes' : '';
    const [others] = await this.db.query<any>('SELECT COUNT(*) - 1 AS n FROM PropertyWatches WHERE PropertyId=?', [w.PropertyId]);
    const more = Number(others?.n || 0) > 0 ? ` Otras ${others.n} personas también la esperan.` : '';
    const path = `/propiedades/${w.Slug}`;
    if (kind === 'available') this.mail.notify(w.Email, `¡${w.Title} ya está disponible!`, `${w.Title} ya está disponible`, `La propiedad que esperabas ya se puede rentar o comprar: ${mxn(price)}${per} · ${w.Municipality}.${more}`, 'Ver y reservar', path, 'Recibes este aviso porque pediste que te avisáramos. Puedes quitarlo en tu panel, en “Mis avisos”.');
    else if (kind === 'soon') this.mail.notify(w.Email, `${w.Title} se libera pronto`, `${w.Title} se libera el ${day(w.AvailableFrom)}`, `Faltan pocos días para que esté disponible: ${mxn(price)}${per} · ${w.Municipality}. Escribe al asesor para apartarla antes.${more}`, 'Ver la propiedad', path, 'Recibes este aviso porque pediste que te avisáramos. Puedes quitarlo en tu panel, en “Mis avisos”.');
    else this.mail.notify(w.Email, `${w.Title} bajó de precio`, `${w.Title} bajó de precio`, `Antes ${prev ? mxn(prev) : ''}${per}, ahora ${mxn(price)}${per}.`, 'Ver la propiedad', path, 'Recibes este aviso porque pediste que te avisáramos. Puedes quitarlo en tu panel, en “Mis avisos”.');
  }

  /** Revisa cambios y manda los avisos pendientes (cada hora y al cambiar la disponibilidad). */
  async check(propertyId?: string) {
    const only = propertyId ? ' AND p.Id=?' : '', args = propertyId ? [propertyId] : [];
    // 1) Favoritas que dejaron de estar disponibles: se convierten en aviso automáticamente.
    await this.db.execute(`INSERT IGNORE INTO PropertyWatches (UserId, PropertyId, Source, LastPrice)
      SELECT f.UserId, f.PropertyId, 'favorite', p.Price FROM Favorites f JOIN Properties p ON p.Id=f.PropertyId
      WHERE p.Status='PUBLISHED' AND p.OwnerId<>f.UserId AND (p.Availability IN ${UNAVAILABLE} OR p.AvailableFrom > CURDATE())${only}`, args);
    // 2) Si volvió a rentarse o venderse, empieza otra vuelta de avisos.
    await this.db.execute(`UPDATE PropertyWatches w JOIN Properties p ON p.Id=w.PropertyId SET w.LastKind=NULL
      WHERE w.LastKind IN ('available','soon') AND p.Availability IN ${UNAVAILABLE} AND (p.AvailableFrom IS NULL OR p.AvailableFrom > DATE_ADD(CURDATE(), INTERVAL 7 DAY))${only}`, args);
    const base = `SELECT w.*, p.Title, p.Slug, p.Price, p.Operation, p.Municipality, p.AvailableFrom, u.Email FROM PropertyWatches w
      JOIN Properties p ON p.Id=w.PropertyId JOIN Users u ON u.Id=w.UserId WHERE p.Status='PUBLISHED'${only}`;
    // 3) Ya disponible.
    for (const w of await this.db.query<any>(`${base} AND p.Availability='AVAILABLE' AND (p.AvailableFrom IS NULL OR p.AvailableFrom <= CURDATE()) AND (w.LastKind IS NULL OR w.LastKind<>'available')`, args)) await this.notify(w, 'available');
    // 4) Se libera en los próximos 7 días.
    for (const w of await this.db.query<any>(`${base} AND p.AvailableFrom > CURDATE() AND p.AvailableFrom <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND w.LastKind IS NULL`, args)) {
      w.AvailableFrom = String(w.AvailableFrom instanceof Date ? w.AvailableFrom.toISOString() : w.AvailableFrom).slice(0, 10);
      await this.notify(w, 'soon');
    }
    // 5) Bajó de precio (si subió, solo se actualiza la referencia).
    for (const w of await this.db.query<any>(`${base} AND p.PriceMode<>'HIDE' AND w.LastPrice IS NOT NULL AND p.Price < w.LastPrice AND p.Price > 0`, args)) await this.notify(w, 'price');
    await this.db.execute(`UPDATE PropertyWatches w JOIN Properties p ON p.Id=w.PropertyId SET w.LastPrice=p.Price WHERE (w.LastPrice IS NULL OR p.Price > w.LastPrice)${only}`, args);
    // 6) Aviso al dueño: se libera en 14 días o menos y hay gente esperando.
    const owners = await this.db.query<any>(`SELECT p.Id, p.Title, p.AvailableFrom, u.Email, COUNT(w.UserId) AS n, SUM(w.ShareContact) AS shared
      FROM Properties p JOIN Users u ON u.Id=p.OwnerId JOIN PropertyWatches w ON w.PropertyId=p.Id
      LEFT JOIN WaitlistOwnerNotices o ON o.PropertyId=p.Id AND o.ForDate=p.AvailableFrom
      WHERE p.Status='PUBLISHED' AND p.Availability IN ('RENTED','RESERVED') AND p.AvailableFrom >= CURDATE() AND p.AvailableFrom <= DATE_ADD(CURDATE(), INTERVAL 14 DAY) AND o.PropertyId IS NULL${only}
      GROUP BY p.Id, p.Title, p.AvailableFrom, u.Email`, args);
    for (const o of owners) {
      const d = String(o.AvailableFrom instanceof Date ? o.AvailableFrom.toISOString() : o.AvailableFrom).slice(0, 10);
      await this.db.execute('INSERT IGNORE INTO WaitlistOwnerNotices (PropertyId, ForDate) VALUES (?,?)', [o.Id, d]);
      this.mail.notify(o.Email, `${o.Title}: ${o.n} persona(s) esperan que se libere`, `${o.Title} se libera el ${day(d)}`,
        `${o.n} persona(s) pidieron que les avisáramos${Number(o.shared) ? ` y ${o.shared} te ${Number(o.shared) === 1 ? 'compartió' : 'compartieron'} sus datos` : ''}. Si ya sabes que se desocupa, márcala como disponible desde esa fecha y les avisamos al instante.`,
        'Ver mis propiedades', '/panel/agente/propiedades', 'Recibes este aviso porque eres quien anuncia esta propiedad en Mi Casa.');
    }
    return { ok: true };
  }
}
