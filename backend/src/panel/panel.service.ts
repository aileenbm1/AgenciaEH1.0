import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';

const todayMx = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
const dateOnly = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 864e5);
const fmtDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const n = (v: any) => Number(v || 0);
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
export type PayInfo = { bank: string | null; clabe: string | null; holder: string | null; notes: string | null };

/** Panel del anunciante (agente, agencia, desarrolladora): pendientes, datos de pago, membresía y equipo. */
@Injectable()
export class PanelService implements OnModuleInit {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  /** Avisos de membresía por vencer (30 y 7 días antes), revisados cada hora. */
  onModuleInit() {
    const run = () => this.membershipReminders().catch((e) => console.error('[Mi Casa] Avisos de membresía:', e?.message));
    setTimeout(run, 20000).unref?.();
    setInterval(run, 3600000).unref?.();
  }

  /** Usuarios cuyo trabajo ve este usuario: él mismo y, si es agencia o desarrolladora, sus asesores. */
  private scope(userId: string, role: string) {
    return role === 'AGENCY' || role === 'DEVELOPER'
      ? { sql: '(SELECT ? UNION SELECT ap.UserId FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ag.UserId=?)', params: [userId, userId] }
      : { sql: '(?)', params: [userId] };
  }

  // ───────────── Datos de pago ─────────────
  private validPay(d: any): PayInfo {
    const clabe = clean(d?.clabe, 25).replace(/\D/g, '');
    if (clabe && clabe.length !== 18) throw new BadRequestException('La CLABE debe tener 18 dígitos.');
    return { bank: clean(d?.bank, 80) || null, clabe: clabe || null, holder: clean(d?.holder, 120) || null, notes: clean(d?.notes, 300) || null };
  }
  async getPayout(userId: string): Promise<PayInfo> {
    const [r] = await this.db.query<any>('SELECT Bank, Clabe, Holder, Notes FROM PayoutAccounts WHERE UserId=?', [userId]);
    return { bank: r?.Bank ?? null, clabe: r?.Clabe ?? null, holder: r?.Holder ?? null, notes: r?.Notes ?? null };
  }
  async savePayout(userId: string, d: any) {
    const p = this.validPay(d);
    await this.db.execute(`INSERT INTO PayoutAccounts(UserId,Bank,Clabe,Holder,Notes,UpdatedAt) VALUES(?,?,?,?,?,UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE Bank=VALUES(Bank),Clabe=VALUES(Clabe),Holder=VALUES(Holder),Notes=VALUES(Notes),UpdatedAt=UTC_TIMESTAMP()`, [userId, p.bank, p.clabe, p.holder, p.notes]);
    return this.getPayout(userId);
  }
  /** Datos para pagar las membresías (los captura el administrador). */
  async membershipPayInfo(): Promise<PayInfo & { amount: string | null; whatsapp: string | null }> {
    const [r] = await this.db.query<any>("SELECT V FROM SiteSettings WHERE K='membership.payinfo'");
    let v: any = {}; try { v = r?.V ? JSON.parse(r.V) : {}; } catch { v = {}; }
    return { bank: v.bank ?? null, clabe: v.clabe ?? null, holder: v.holder ?? null, notes: v.notes ?? null, amount: v.amount ?? null, whatsapp: v.whatsapp ?? null };
  }
  async saveMembershipPayInfo(d: any) {
    const p = { ...this.validPay(d), amount: clean(d?.amount, 80) || null, whatsapp: clean(d?.whatsapp, 25).replace(/[^\d+]/g, '') || null };
    await this.db.execute("INSERT INTO SiteSettings(K,V) VALUES('membership.payinfo',?) ON DUPLICATE KEY UPDATE V=VALUES(V)", [JSON.stringify(p)]);
    return this.membershipPayInfo();
  }

  // ───────────── Membresía ─────────────
  async membership(userId: string) {
    const rows = await this.db.query<any>('SELECT Plan, Amount, Method, PaidAt, PeriodStart, PeriodEnd FROM Payments WHERE UserId=? ORDER BY PeriodEnd DESC LIMIT 12', [userId]);
    const last = rows[0];
    const today = todayMx();
    const end = last ? dateOnly(last.PeriodEnd)! : null;
    const daysLeft = end ? daysBetween(today, end) : null;
    const status = !end ? 'none' : daysLeft! < 0 ? 'expired' : daysLeft! <= 30 ? 'expiring' : 'active';
    return {
      status, plan: last?.Plan ?? null, periodEnd: end, daysLeft,
      history: rows.map((r: any) => ({ plan: r.Plan, amount: n(r.Amount), method: r.Method, paidAt: dateOnly(r.PaidAt), periodStart: dateOnly(r.PeriodStart), periodEnd: dateOnly(r.PeriodEnd) })),
      payInfo: await this.membershipPayInfo(),
    };
  }
  async membershipReminders() {
    const today = todayMx();
    for (const days of [30, 7]) {
      const target = addDays(today, days);
      const rows = await this.db.query<any>(`SELECT u.Id, u.Email, u.FullName, t.MaxEnd FROM (SELECT UserId, MAX(PeriodEnd) AS MaxEnd FROM Payments GROUP BY UserId) t
        JOIN Users u ON u.Id=t.UserId WHERE t.MaxEnd=? AND u.IsActive=1 AND u.Role IN ('AGENT','AGENCY','DEVELOPER')
        AND NOT EXISTS (SELECT 1 FROM MembershipNotices m WHERE m.UserId=u.Id AND m.PeriodEnd=t.MaxEnd AND m.Days=?)`, [target, days]);
      if (!rows.length) continue;
      const pay = await this.membershipPayInfo();
      const how = pay.clabe ? ` Puedes pagar por transferencia a ${pay.bank ? `${pay.bank}, ` : ''}CLABE ${pay.clabe}${pay.holder ? ` a nombre de ${pay.holder}` : ''}, o en efectivo.` : ' Puedes pagar por transferencia o en efectivo.';
      for (const r of rows) {
        await this.db.execute('INSERT IGNORE INTO MembershipNotices(UserId,PeriodEnd,Days) VALUES(?,?,?)', [r.Id, target, days]);
        this.mail.notify(r.Email, `Tu membresía vence en ${days} días · Mi Casa`, days === 7 ? 'Tu membresía vence en una semana' : 'Tu membresía vence pronto',
          `Hola ${String(r.FullName).split(' ')[0]}, tu membresía de Mi Casa vence el ${fmtDay(target)}. Renuévala para que tus propiedades sigan publicadas y no se bloquee tu acceso.${how}`,
          'Ver mi membresía', '/panel/membresia', 'Recibes este aviso porque tienes una membresía activa en Mi Casa.');
      }
    }
  }

  // ───────────── Equipo (agencia / desarrolladora) ─────────────
  async team(userId: string) {
    const rows = await this.db.query<any>(`SELECT u.Id, u.FullName, u.Email, u.Phone, u.IsActive, ap.Slug, ap.PhotoUrl,
        (SELECT COUNT(*) FROM Properties p WHERE p.OwnerId=u.Id AND p.Status='PUBLISHED') AS Published,
        (SELECT COUNT(*) FROM Properties p WHERE p.OwnerId=u.Id) AS Props,
        (SELECT COUNT(*) FROM Leads l WHERE l.AssignedToId=u.Id AND l.CreatedAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY) AS Leads30,
        (SELECT COUNT(*) FROM Leads l WHERE l.AssignedToId=u.Id AND l.Status='NEW') AS LeadsNew,
        (SELECT COUNT(*) FROM Reservations r WHERE r.OwnerId=u.Id AND r.Status IN ('PENDING','APPROVED','DEPOSIT_PAID')) AS Res,
        (SELECT MAX(PeriodEnd) FROM Payments pay WHERE pay.UserId=u.Id) AS MemberEnd
      FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId JOIN Users u ON u.Id=ap.UserId WHERE ag.UserId=? ORDER BY u.FullName`, [userId]);
    const [ag] = await this.db.query<any>('SELECT Name FROM AgencyProfiles WHERE UserId=?', [userId]);
    const today = todayMx();
    return {
      agency: ag?.Name ?? null,
      members: rows.map((r: any) => ({ id: r.Id, fullName: r.FullName, email: r.Email, phone: r.Phone, active: !!r.IsActive, slug: r.Slug, photoUrl: r.PhotoUrl,
        published: n(r.Published), properties: n(r.Props), leads30: n(r.Leads30), leadsNew: n(r.LeadsNew), reservations: n(r.Res),
        membershipEnd: dateOnly(r.MemberEnd), membershipActive: !!r.MemberEnd && dateOnly(r.MemberEnd)! >= today })),
    };
  }

  // ───────────── Pendientes de hoy ─────────────
  async pending(userId: string, role: string) {
    const sc = this.scope(userId, role);
    const today = todayMx();
    const payDue = await this.db.query<any>(`SELECT r.Id, r.CheckIn, p.Title, g.FullName AS Guest,
        r.Total - COALESCE((SELECT SUM(x.Amount) FROM ReservationPayments x WHERE x.ReservationId=r.Id AND x.VoidedAt IS NULL),0) AS Remaining
      FROM Reservations r JOIN Properties p ON p.Id=r.PropertyId JOIN Users g ON g.Id=r.GuestId
      WHERE r.OwnerId IN ${sc.sql} AND r.Kind IN ('NIGHTLY','WEEKLY') AND r.Status IN ('APPROVED','DEPOSIT_PAID')
        AND r.CheckIn >= DATE_SUB(?, INTERVAL 1 DAY) AND r.CheckIn <= DATE_ADD(?, INTERVAL 3 DAY)
      HAVING Remaining > 0 ORDER BY r.CheckIn LIMIT 5`, [...sc.params, today, today]);
    const receipts = await this.db.query<any>(`SELECT d.Id, d.Amount, d.CreatedAt, r.Id AS ResId, p.Title, g.FullName AS Guest FROM ReservationDocuments d
      JOIN Reservations r ON r.Id=d.ReservationId JOIN Properties p ON p.Id=r.PropertyId JOIN Users g ON g.Id=r.GuestId
      WHERE d.Kind='COMPROBANTE' AND d.ReviewedAt IS NULL AND r.Status IN ('APPROVED','DEPOSIT_PAID') AND r.OwnerId IN ${sc.sql} ORDER BY d.CreatedAt LIMIT 5`, sc.params);
    const resv = await this.db.query<any>(`SELECT r.Id, r.Kind, r.CheckIn, r.CheckOut, r.Guests, r.Total, p.Title, g.FullName AS Guest FROM Reservations r
      JOIN Properties p ON p.Id=r.PropertyId JOIN Users g ON g.Id=r.GuestId WHERE r.Status='PENDING' AND r.OwnerId IN ${sc.sql} ORDER BY r.CreatedAt LIMIT 5`, sc.params);
    const leads = await this.db.query<any>(`SELECT l.Id, l.Kind, l.Name, l.VisitAt, p.Title FROM Leads l LEFT JOIN Properties p ON p.Id=l.PropertyId
      WHERE l.Status='NEW' AND l.AssignedToId IN ${sc.sql} ORDER BY l.CreatedAt DESC LIMIT 20`, sc.params);
    const props = await this.db.query<any>(`SELECT p.Id, p.Title, p.Status, p.Description, p.Price, p.ReviewNote, p.OwnerId,
        (SELECT COUNT(*) FROM PropertyImages i WHERE i.PropertyId=p.Id) AS Photos FROM Properties p WHERE p.OwnerId IN ${sc.sql} AND p.Status IN ('DRAFT','REJECTED') ORDER BY p.UpdatedAt DESC LIMIT 10`, sc.params);
    const missing = (p: any) => [n(p.Photos) < 3 ? `${3 - n(p.Photos)} foto${3 - n(p.Photos) === 1 ? '' : 's'} más` : '', String(p.Description || '').trim().length < 40 ? 'descripción' : '', !(n(p.Price) > 0) ? 'precio' : ''].filter(Boolean);
    const membership = await this.membership(userId);
    // Primeros pasos (cuenta nueva): perfil, primera publicación, reservas en línea, datos de pago y compartir.
    const isOrg = role === 'AGENCY' || role === 'DEVELOPER';
    const [prof] = isOrg
      ? await this.db.query<any>('SELECT Description AS Bio, Phone, NULL AS PhotoUrl, Views, Slug FROM AgencyProfiles WHERE UserId=?', [userId])
      : await this.db.query<any>('SELECT Bio, Phone, PhotoUrl, Views, Slug FROM AgentProfiles WHERE UserId=?', [userId]);
    const [counts] = await this.db.query<any>(`SELECT SUM(Status='PUBLISHED') AS pub, SUM(Status='DRAFT') AS draft, SUM(Status='REVIEW') AS rev, COUNT(*) AS total,
        (SELECT COUNT(*) FROM RentalSettings rs JOIN Properties q ON q.Id=rs.PropertyId WHERE rs.Enabled=1 AND q.OwnerId=?) AS rentals
      FROM Properties WHERE OwnerId IN ${sc.sql}`, [userId, ...sc.params]);
    const [pay] = await this.db.query<any>('SELECT Clabe FROM PayoutAccounts WHERE UserId=?', [userId]);
    const [money] = await this.db.query<any>(`SELECT COALESCE(SUM(x.Amount),0) AS m FROM ReservationPayments x JOIN Reservations r ON r.Id=x.ReservationId
      WHERE x.VoidedAt IS NULL AND r.OwnerId IN ${sc.sql} AND x.CreatedAt >= DATE_FORMAT(UTC_DATE(),'%Y-%m-01')`, sc.params);
    const [act] = await this.db.query<any>(`SELECT COUNT(*) AS n FROM Reservations WHERE OwnerId IN ${sc.sql} AND Status IN ('APPROVED','DEPOSIT_PAID')`, sc.params);
    const [l30] = await this.db.query<any>(`SELECT COUNT(*) AS n, SUM(Kind='VISIT') AS v FROM Leads WHERE AssignedToId IN ${sc.sql} AND CreatedAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY`, sc.params);
    const views = isOrg ? n((await this.db.query<any>(`SELECT COALESCE((SELECT Views FROM AgencyProfiles WHERE UserId=?),0) + COALESCE((SELECT SUM(ap.Views) FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ag.UserId=?),0) AS v`, [userId, userId]))[0]?.v) : n(prof?.Views);
    const steps = [
      { key: 'perfil', done: !!(prof?.Phone && (isOrg ? String(prof?.Bio || '').length > 10 : prof?.PhotoUrl)), label: isOrg ? 'Completa el perfil: descripción y WhatsApp' : 'Sube tu foto y tu WhatsApp', href: '/panel/perfil-publico' },
      { key: 'publica', done: n(counts?.pub) > 0, label: 'Publica tu primera propiedad', href: '/panel/agente/propiedades#nueva' },
      { key: 'reservas', done: n(counts?.rentals) > 0, label: 'Activa las reservas en línea en una propiedad en renta', href: '/panel/agente/propiedades' },
      { key: 'pagos', done: !!pay?.Clabe, label: 'Captura tus datos para recibir pagos', href: '/panel/datos-de-pago' },
      { key: 'comparte', done: views > 0, label: 'Comparte tu perfil en redes', href: prof?.Slug ? `/${isOrg ? 'agencias' : 'asesores'}/${prof.Slug}` : '/panel/perfil-publico' },
    ];
    return {
      today,
      payDue: payDue.map((r: any) => ({ id: r.Id, checkIn: dateOnly(r.CheckIn), payBy: addDays(dateOnly(r.CheckIn)!, -1), title: r.Title, guest: r.Guest, remaining: n(r.Remaining) })),
      receipts: receipts.map((r: any) => ({ id: r.Id, reservationId: r.ResId, amount: n(r.Amount), title: r.Title, guest: r.Guest, createdAt: r.CreatedAt })),
      reservations: resv.map((r: any) => ({ id: r.Id, kind: r.Kind, checkIn: dateOnly(r.CheckIn), checkOut: dateOnly(r.CheckOut), guests: r.Guests, total: n(r.Total), title: r.Title, guest: r.Guest })),
      messages: leads.filter((l: any) => l.Kind !== 'VISIT').map((l: any) => ({ id: l.Id, name: l.Name, title: l.Title })),
      visits: leads.filter((l: any) => l.Kind === 'VISIT').map((l: any) => ({ id: l.Id, name: l.Name, title: l.Title, visitAt: l.VisitAt })),
      drafts: props.filter((p: any) => p.Status === 'DRAFT').map((p: any) => ({ id: p.Id, title: p.Title, missing: missing(p) })),
      rejected: props.filter((p: any) => p.Status === 'REJECTED').map((p: any) => ({ id: p.Id, title: p.Title, note: p.ReviewNote || null })),
      membership: { status: membership.status, periodEnd: membership.periodEnd, daysLeft: membership.daysLeft, plan: membership.plan },
      steps: steps.every((s) => s.done) ? null : steps,
      kpis: { profileViews: views, published: n(counts?.pub), drafts: n(counts?.draft), review: n(counts?.rev), leads30: n(l30?.n), visits30: n(l30?.v), activeReservations: n(act?.n), collectedMonth: n(money?.m) },
    };
  }
}
