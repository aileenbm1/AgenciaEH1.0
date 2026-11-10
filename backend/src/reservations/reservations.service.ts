import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { privateRoot } from '../uploads/media';

type Kind = 'NIGHTLY' | 'MONTHLY' | 'SALE';
export type Season = { name?: string; from: string; to: string; price: number };
const ACTIVE = ['PENDING', 'APPROVED', 'DEPOSIT_PAID'];
/** Estados que ocupan fechas en el calendario (evitan dobles reservas). */
const BLOCKING = ['APPROVED', 'DEPOSIT_PAID', 'COMPLETED'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const addMonths = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); const day = x.getUTCDate(); x.setUTCMonth(x.getUTCMonth() + n); if (x.getUTCDate() !== day) x.setUTCDate(0); return x.toISOString().slice(0, 10); };
const nightsBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const dateOnly = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const money = (n: number) => Math.round(n * 100) / 100;
const fmtMoney = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);
const fmtDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtWhen = (d: Date) => d.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' });
const KIND_LABEL: Record<Kind, string> = { NIGHTLY: 'reserva por noche', MONTHLY: 'renta mensual', SALE: 'apartado de compra' };

@Injectable()
export class ReservationsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  // ───────────── Recordatorios (RF-26) ─────────────
  onModuleInit() { this.timer = setInterval(() => this.reminders().catch(() => undefined), 30 * 60000); this.timer.unref?.(); setTimeout(() => this.reminders().catch(() => undefined), 60000).unref?.(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async reminders() {
    const appts = await this.db.query<any>(`SELECT r.Id, r.AppointmentAt, r.AppointmentPlace, p.Title, g.Email AS GuestEmail, o.Email AS OwnerEmail FROM Reservations r
      JOIN Properties p ON p.Id=r.PropertyId JOIN Users g ON g.Id=r.GuestId JOIN Users o ON o.Id=r.OwnerId
      WHERE r.Status IN ('APPROVED','DEPOSIT_PAID') AND r.ReminderSentAt IS NULL AND r.AppointmentAt BETWEEN UTC_TIMESTAMP() AND UTC_TIMESTAMP() + INTERVAL 24 HOUR`);
    for (const a of appts) {
      const when = fmtWhen(new Date(a.AppointmentAt));
      for (const to of [a.GuestEmail, a.OwnerEmail]) this.mail.notify(to, `Recordatorio de cita · ${a.Title}`, 'Recordatorio de tu cita', `Tienes una cita para "${a.Title}" el ${when}${a.AppointmentPlace ? ` en ${a.AppointmentPlace}` : ''}. El pago se realiza por transferencia o en persona.`, 'Ver reserva', `/panel/reservas/${a.Id}`);
      await this.db.execute('UPDATE Reservations SET ReminderSentAt=UTC_TIMESTAMP() WHERE Id=?', [a.Id]);
    }
    const checkins = await this.db.query<any>(`SELECT r.Id, r.CheckIn, p.Title, g.Email FROM Reservations r JOIN Properties p ON p.Id=r.PropertyId JOIN Users g ON g.Id=r.GuestId
      WHERE r.Kind='NIGHTLY' AND r.Status IN ('APPROVED','DEPOSIT_PAID','COMPLETED') AND r.CheckinReminderAt IS NULL AND r.CheckIn = UTC_DATE() + INTERVAL 1 DAY`);
    for (const c of checkins) {
      this.mail.notify(c.Email, `Tu llegada es mañana · ${c.Title}`, 'Tu llegada es mañana', `Te esperamos en "${c.Title}" el ${fmtDay(dateOnly(c.CheckIn)!)}. Revisa los detalles y escribe al anfitrión si lo necesitas.`, 'Ver reserva', `/panel/reservas/${c.Id}`);
      await this.db.execute('UPDATE Reservations SET CheckinReminderAt=UTC_TIMESTAMP() WHERE Id=?', [c.Id]);
    }
  }

  // ───────────── Configuración por propiedad (RF-21) ─────────────
  private async property(id: string) {
    const [p] = await this.db.query<any>('SELECT * FROM Properties WHERE Id=? LIMIT 1', [id]);
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    return p;
  }

  /** ¿El usuario administra la propiedad? (dueño, su agencia/desarrolladora o admin). */
  private async manages(userId: string, role: string, ownerId: string) {
    if (role === 'ADMIN' || userId === ownerId) return true;
    if (role !== 'AGENCY' && role !== 'DEVELOPER') return false;
    const [t] = await this.db.query<any>('SELECT 1 AS ok FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ag.UserId=? AND ap.UserId=? LIMIT 1', [userId, ownerId]);
    return !!t;
  }

  private settingsRow(r: any, p: any) {
    let seasons: Season[] = [];
    try { seasons = r?.Seasons ? JSON.parse(r.Seasons) : []; } catch { seasons = []; }
    return {
      enabled: !!r?.Enabled, mode: (r?.Mode || 'MONTHLY') as 'MONTHLY' | 'NIGHTLY', nightPrice: r?.NightPrice != null ? Number(r.NightPrice) : null,
      minStay: r?.MinStay ?? 1, maxStay: r?.MaxStay ?? null, maxGuests: r?.MaxGuests ?? null, deposit: Number(r?.Deposit || 0), taxRate: Number(r?.TaxRate || 0),
      cancellationPolicy: r?.CancellationPolicy || null, seasons, saleRequests: r ? !!r.SaleRequests : true,
      monthlyRent: p ? Number(p.Operation === 'BOTH' ? p.RentPrice : p.Operation === 'RENT' ? p.Price : 0) || null : null,
      salePrice: p && (p.Operation === 'SALE' || p.Operation === 'BOTH') ? Number(p.Price) : null,
      operation: p?.Operation, availability: p?.Availability || 'AVAILABLE',
    };
  }

  async getSettings(propertyId: string) {
    const p = await this.property(propertyId);
    const [r] = await this.db.query<any>('SELECT * FROM RentalSettings WHERE PropertyId=?', [propertyId]);
    return this.settingsRow(r, p);
  }

  async saveSettings(userId: string, role: string, propertyId: string, d: any) {
    const p = await this.property(propertyId);
    if (!(await this.manages(userId, role, p.OwnerId))) throw new ForbiddenException('No puedes configurar esta propiedad.');
    const mode = d.mode === 'NIGHTLY' ? 'NIGHTLY' : 'MONTHLY';
    const enabled = !!d.enabled;
    if (enabled && p.Operation === 'SALE') throw new BadRequestException('Las reservas de renta solo aplican a propiedades en renta o en venta y renta.');
    const num = (v: any, min = 0) => (v === '' || v === null || v === undefined ? null : Number(v));
    const nightPrice = num(d.nightPrice);
    if (enabled && mode === 'NIGHTLY' && !(Number(nightPrice) > 0)) throw new BadRequestException('Indica el precio por noche.');
    const minStay = Math.max(1, Math.min(365, Number(d.minStay) || 1));
    const maxStay = num(d.maxStay); if (maxStay !== null && (!Number.isInteger(maxStay) || maxStay < minStay)) throw new BadRequestException('La estadía máxima debe ser mayor o igual a la mínima.');
    const maxGuests = num(d.maxGuests); if (maxGuests !== null && (!Number.isInteger(maxGuests) || maxGuests < 1 || maxGuests > 100)) throw new BadRequestException('Número de huéspedes no válido.');
    const deposit = Number(d.deposit) || 0; if (deposit < 0) throw new BadRequestException('Depósito no válido.');
    const taxRate = Number(d.taxRate) || 0; if (taxRate < 0 || taxRate > 50) throw new BadRequestException('Impuesto no válido (0 a 50%).');
    const seasons: Season[] = Array.isArray(d.seasons) ? d.seasons.slice(0, 20).map((s: any) => ({ name: String(s.name || '').slice(0, 40), from: String(s.from || ''), to: String(s.to || ''), price: Number(s.price) })) : [];
    for (const s of seasons) if (!ISO.test(s.from) || !ISO.test(s.to) || s.to < s.from || !(s.price > 0)) throw new BadRequestException('Revisa las temporadas: fechas (inicio ≤ fin) y precio por noche.');
    await this.db.execute(`INSERT INTO RentalSettings(PropertyId,Enabled,Mode,NightPrice,MinStay,MaxStay,MaxGuests,Deposit,TaxRate,CancellationPolicy,Seasons,SaleRequests,UpdatedAt)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE Enabled=VALUES(Enabled),Mode=VALUES(Mode),NightPrice=VALUES(NightPrice),MinStay=VALUES(MinStay),MaxStay=VALUES(MaxStay),
      MaxGuests=VALUES(MaxGuests),Deposit=VALUES(Deposit),TaxRate=VALUES(TaxRate),CancellationPolicy=VALUES(CancellationPolicy),Seasons=VALUES(Seasons),SaleRequests=VALUES(SaleRequests),UpdatedAt=UTC_TIMESTAMP()`,
      [propertyId, enabled ? 1 : 0, mode, nightPrice, minStay, maxStay, maxGuests, deposit, taxRate, String(d.cancellationPolicy || '').slice(0, 1000) || null, JSON.stringify(seasons), d.saleRequests === false ? 0 : 1]);
    return this.getSettings(propertyId);
  }

  // ───────────── Calendario y bloqueos (RF-22, RF-25, RF-27) ─────────────
  private async busyRanges(propertyId: string, excludeId?: string) {
    const res = await this.db.query<any>(`SELECT Id, CheckIn, CheckOut FROM Reservations WHERE PropertyId=? AND Kind<>'SALE' AND Status IN (${BLOCKING.map(() => '?').join(',')}) AND CheckIn IS NOT NULL ${excludeId ? 'AND Id<>?' : ''}`,
      [propertyId, ...BLOCKING, ...(excludeId ? [excludeId] : [])]);
    const blocks = await this.db.query<any>('SELECT Id, StartDate, EndDate, Reason FROM BlockedDates WHERE PropertyId=?', [propertyId]);
    return [
      ...res.map((r: any) => ({ from: dateOnly(r.CheckIn)!, to: dateOnly(r.CheckOut)!, type: 'RESERVED' as const })),
      // Los bloqueos incluyen el día final; se guarda como rango semiabierto.
      ...blocks.map((b: any) => ({ id: b.Id, from: dateOnly(b.StartDate)!, to: addDays(dateOnly(b.EndDate)!, 1), type: 'BLOCKED' as const, reason: b.Reason })),
    ];
  }

  async calendar(propertyId: string) {
    const p = await this.property(propertyId);
    if (p.Status !== 'PUBLISHED') throw new NotFoundException('Propiedad no encontrada.');
    const [r] = await this.db.query<any>('SELECT * FROM RentalSettings WHERE PropertyId=?', [propertyId]);
    const ranges = (await this.busyRanges(propertyId)).map(({ from, to, type }) => ({ from, to, type }));
    return { settings: this.settingsRow(r, p), busy: ranges };
  }

  async blocks(userId: string, role: string, propertyId: string) {
    const p = await this.property(propertyId);
    if (!(await this.manages(userId, role, p.OwnerId))) throw new ForbiddenException();
    return (await this.busyRanges(propertyId)).map((x: any) => x.type === 'BLOCKED' ? { ...x, to: addDays(x.to, -1) } : x);
  }

  async addBlock(userId: string, role: string, propertyId: string, d: any) {
    const p = await this.property(propertyId);
    if (!(await this.manages(userId, role, p.OwnerId))) throw new ForbiddenException();
    const from = String(d.from || ''), to = String(d.to || from);
    if (!ISO.test(from) || !ISO.test(to) || to < from) throw new BadRequestException('Fechas no válidas.');
    await this.db.execute('INSERT INTO BlockedDates(Id,PropertyId,StartDate,EndDate,Reason) VALUES(?,?,?,?,?)', [randomUUID(), propertyId, from, to, String(d.reason || '').slice(0, 200) || null]);
    return this.blocks(userId, role, propertyId);
  }

  async removeBlock(userId: string, role: string, blockId: string) {
    const [b] = await this.db.query<any>('SELECT b.Id, b.PropertyId, p.OwnerId FROM BlockedDates b JOIN Properties p ON p.Id=b.PropertyId WHERE b.Id=?', [blockId]);
    if (!b) throw new NotFoundException('Bloqueo no encontrado.');
    if (!(await this.manages(userId, role, b.OwnerId))) throw new ForbiddenException();
    await this.db.execute('DELETE FROM BlockedDates WHERE Id=?', [blockId]);
    return this.blocks(userId, role, b.PropertyId);
  }

  private overlaps(from: string, to: string, busy: { from: string; to: string }[]) { return busy.some((b) => from < b.to && b.from < to); }

  // ───────────── Cotización (RF-24) ─────────────
  async quote(d: any, p?: any) {
    p = p || await this.property(String(d.propertyId));
    if (p.Status !== 'PUBLISHED') throw new NotFoundException('Propiedad no encontrada.');
    const [r] = await this.db.query<any>('SELECT * FROM RentalSettings WHERE PropertyId=?', [p.Id]);
    const s = this.settingsRow(r, p);
    const kind = String(d.kind) as Kind;
    if (kind === 'SALE') {
      if (!(p.Operation === 'SALE' || p.Operation === 'BOTH') || !s.saleRequests) throw new BadRequestException('Esta propiedad no acepta apartados de compra en línea.');
      return { kind, subtotal: Number(p.Price), taxes: 0, deposit: 0, total: Number(p.Price), lines: [{ label: 'Precio de venta', amount: Number(p.Price) }] };
    }
    if (!s.enabled || !(p.Operation === 'RENT' || p.Operation === 'BOTH')) throw new BadRequestException('Esta propiedad no tiene reservas en línea activas.');
    if (kind !== s.mode) throw new BadRequestException(s.mode === 'NIGHTLY' ? 'Esta propiedad se reserva por noche.' : 'Esta propiedad se renta por mes.');
    const checkIn = String(d.checkIn || '');
    if (!ISO.test(checkIn)) throw new BadRequestException('Elige la fecha de entrada.');
    if (checkIn < today()) throw new BadRequestException('La fecha de entrada no puede ser en el pasado.');
    if (checkIn > addDays(today(), 540)) throw new BadRequestException('Solo se puede reservar con hasta 18 meses de anticipación.');
    const guests = d.guests ? Number(d.guests) : null;
    if (guests !== null && (!Number.isInteger(guests) || guests < 1)) throw new BadRequestException('Número de huéspedes no válido.');
    if (guests && s.maxGuests && guests > s.maxGuests) throw new BadRequestException(`Máximo ${s.maxGuests} huéspedes.`);
    const lines: { label: string; amount: number }[] = [];
    let checkOut: string, subtotal = 0, nights: number | null = null, months: number | null = null;
    if (kind === 'NIGHTLY') {
      checkOut = String(d.checkOut || '');
      if (!ISO.test(checkOut) || checkOut <= checkIn) throw new BadRequestException('Elige la fecha de salida (posterior a la entrada).');
      nights = nightsBetween(checkIn, checkOut);
      if (nights < s.minStay) throw new BadRequestException(`La estadía mínima es de ${s.minStay} noche(s).`);
      if (s.maxStay && nights > s.maxStay) throw new BadRequestException(`La estadía máxima es de ${s.maxStay} noche(s).`);
      // Precio por noche, usando la tarifa de temporada cuando aplica.
      const byRate = new Map<number, number>();
      for (let i = 0; i < nights; i++) {
        const day = addDays(checkIn, i);
        const season = s.seasons.find((x) => day >= x.from && day <= x.to);
        const rate = season ? season.price : Number(s.nightPrice);
        byRate.set(rate, (byRate.get(rate) || 0) + 1);
        subtotal += rate;
      }
      for (const [rate, n] of byRate) lines.push({ label: `${n} noche(s) × ${fmtMoney(rate)}`, amount: money(rate * n) });
    } else {
      months = Number(d.months);
      if (!Number.isInteger(months) || months < Math.max(1, s.minStay)) throw new BadRequestException(`El plazo mínimo es de ${Math.max(1, s.minStay)} mes(es).`);
      if (s.maxStay && months > s.maxStay) throw new BadRequestException(`El plazo máximo es de ${s.maxStay} meses.`);
      if (months > 60) throw new BadRequestException('Plazo no válido.');
      if (!s.monthlyRent) throw new BadRequestException('La propiedad no tiene renta mensual definida.');
      checkOut = addMonths(checkIn, months);
      subtotal = s.monthlyRent * months;
      lines.push({ label: `${months} mes(es) × ${fmtMoney(s.monthlyRent)}`, amount: money(subtotal) });
    }
    const taxes = money(subtotal * s.taxRate / 100);
    if (taxes) lines.push({ label: `Impuestos (${s.taxRate}%)`, amount: taxes });
    if (s.deposit) lines.push({ label: 'Depósito de garantía (reembolsable)', amount: s.deposit });
    const busy = await this.busyRanges(p.Id);
    const available = !this.overlaps(checkIn, checkOut, busy);
    return { kind, checkIn, checkOut, nights, months, guests, subtotal: money(subtotal), taxes, deposit: s.deposit, total: money(subtotal + taxes + s.deposit), lines, available };
  }

  // ───────────── Solicitud (RF-23) ─────────────
  async create(userId: string, d: any) {
    const p = await this.property(String(d.propertyId));
    if (p.OwnerId === userId) throw new BadRequestException('No puedes reservar tu propia propiedad.');
    if (!['AVAILABLE', 'RESERVED'].includes(p.Availability || 'AVAILABLE') || (d.kind !== 'NIGHTLY' && (p.Availability || 'AVAILABLE') !== 'AVAILABLE')) throw new BadRequestException('Esta propiedad no está disponible por ahora.');
    const q = await this.quote(d, p);
    if ((q as any).available === false) throw new BadRequestException('Esas fechas ya no están disponibles. Elige otras en el calendario.');
    const [dup] = await this.db.query<any>(`SELECT Id FROM Reservations WHERE PropertyId=? AND GuestId=? AND Status IN ('PENDING','APPROVED','DEPOSIT_PAID') LIMIT 1`, [p.Id, userId]);
    if (dup) throw new BadRequestException('Ya tienes una solicitud activa para esta propiedad. Revísala en "Mis reservas".');
    const paymentType = q.kind === 'SALE' ? (['CONTADO', 'CREDITO', 'INFONAVIT', 'FOVISSSTE', 'OTRO'].includes(String(d.paymentType)) ? String(d.paymentType) : 'OTRO') : null;
    const id = randomUUID(); const qq: any = q;
    await this.db.execute(`INSERT INTO Reservations(Id,PropertyId,GuestId,OwnerId,Kind,Status,CheckIn,CheckOut,Months,Nights,Guests,PaymentType,Subtotal,Taxes,Deposit,Total,GuestNote)
      VALUES(?,?,?,?,?,'PENDING',?,?,?,?,?,?,?,?,?,?,?)`,
      [id, p.Id, userId, p.OwnerId, q.kind, qq.checkIn || null, qq.checkOut || null, qq.months ?? null, qq.nights ?? null, qq.guests ?? null, paymentType, q.subtotal, q.taxes, q.deposit, q.total, String(d.note || '').slice(0, 1000) || null]);
    const [o] = await this.db.query<any>('SELECT u.Email, g.FullName AS GuestName FROM Users u JOIN Users g ON g.Id=? WHERE u.Id=?', [userId, p.OwnerId]);
    if (o) this.mail.notify(o.Email, `Nueva solicitud · ${p.Title}`, 'Tienes una nueva solicitud', `${o.GuestName} solicitó ${KIND_LABEL[q.kind as Kind]} de "${p.Title}"${qq.checkIn ? ` desde el ${fmtDay(qq.checkIn)}` : ''}. Apruébala o recházala desde tu panel.`, 'Revisar solicitud', `/panel/reservas/${id}`);
    return this.detail(userId, 'BUYER', id);
  }

  // ───────────── Listado y detalle ─────────────
  private row(r: any) {
    return {
      id: r.Id, kind: r.Kind, status: r.Status, checkIn: dateOnly(r.CheckIn), checkOut: dateOnly(r.CheckOut), months: r.Months, nights: r.Nights, guests: r.Guests,
      paymentType: r.PaymentType, subtotal: Number(r.Subtotal), taxes: Number(r.Taxes), deposit: Number(r.Deposit), total: Number(r.Total),
      advanceRequired: r.AdvanceRequired != null ? Number(r.AdvanceRequired) : null, advanceAmount: r.AdvanceAmount != null ? Number(r.AdvanceAmount) : null, advanceMethod: r.AdvanceMethod, advancePaidAt: r.AdvancePaidAt,
      paidAmount: r.PaidAmount != null ? Number(r.PaidAmount) : null, paidMethod: r.PaidMethod, paidAt: r.PaidAt, paymentNotes: r.PaymentNotes,
      appointmentAt: r.AppointmentAt, appointmentPlace: r.AppointmentPlace, guestConfirmedAt: r.GuestConfirmedAt, guestNote: r.GuestNote, ownerNote: r.OwnerNote,
      createdAt: r.CreatedAt, updatedAt: r.UpdatedAt,
      property: { id: r.PropertyId, title: r.Title, slug: r.Slug, cover: r.Cover || null, municipality: r.Municipality },
      guest: { id: r.GuestId, fullName: r.GuestName }, owner: { id: r.OwnerId, fullName: r.OwnerName },
    };
  }
  private SELECT = `SELECT r.*, p.Title, p.Slug, p.Municipality, g.FullName AS GuestName, o.FullName AS OwnerName,
    (SELECT i.Url FROM PropertyImages i WHERE i.PropertyId=p.Id ORDER BY i.Position LIMIT 1) AS Cover
    FROM Reservations r JOIN Properties p ON p.Id=r.PropertyId JOIN Users g ON g.Id=r.GuestId JOIN Users o ON o.Id=r.OwnerId`;

  async list(userId: string, role: string, as: string, status?: string) {
    let where: string, params: any[];
    if (as === 'guest' || role === 'BUYER') { where = 'r.GuestId=?'; params = [userId]; }
    else if (role === 'ADMIN') { where = '1=1'; params = []; }
    else if (role === 'AGENCY' || role === 'DEVELOPER') { where = '(r.OwnerId=? OR r.OwnerId IN (SELECT ap.UserId FROM AgentProfiles ap JOIN AgencyProfiles ag ON ag.Id=ap.AgencyId WHERE ag.UserId=?))'; params = [userId, userId]; }
    else { where = 'r.OwnerId=?'; params = [userId]; }
    if (status) { where += ' AND r.Status=?'; params.push(status); }
    const rows = await this.db.query<any>(`${this.SELECT} WHERE ${where} ORDER BY (r.Status='PENDING') DESC, r.CreatedAt DESC LIMIT 300`, params);
    return rows.map((r: any) => this.row(r));
  }

  private async access(userId: string, role: string, id: string) {
    const [r] = await this.db.query<any>(`${this.SELECT} WHERE r.Id=?`, [id]);
    if (!r) throw new NotFoundException('Reserva no encontrada.');
    const isGuest = r.GuestId === userId;
    const isManager = await this.manages(userId, role, r.OwnerId);
    if (!isGuest && !isManager) throw new ForbiddenException('No tienes acceso a esta reserva.');
    return { r, isGuest, isManager };
  }

  async detail(userId: string, role: string, id: string) {
    const { r, isGuest, isManager } = await this.access(userId, role, id);
    const messages = await this.db.query<any>('SELECT m.Id, m.UserId, m.Body, m.CreatedAt, u.FullName FROM ReservationMessages m JOIN Users u ON u.Id=m.UserId WHERE m.ReservationId=? ORDER BY m.Seq, m.CreatedAt', [id]);
    const docs = await this.db.query<any>('SELECT d.Id, d.UserId, d.Kind, d.FileName, d.Mime, d.Size, d.CreatedAt, u.FullName FROM ReservationDocuments d JOIN Users u ON u.Id=d.UserId WHERE d.ReservationId=? ORDER BY d.CreatedAt', [id]);
    const [contact] = await this.db.query<any>(`SELECT g.Email AS GuestEmail, g.Phone AS GuestPhone, o.Phone AS OwnerPhone, o.Email AS OwnerEmail FROM Users g JOIN Users o ON o.Id=? WHERE g.Id=?`, [r.OwnerId, r.GuestId]);
    const [s] = await this.db.query<any>('SELECT CancellationPolicy FROM RentalSettings WHERE PropertyId=?', [r.PropertyId]);
    const base = this.row(r);
    // Trato directo: el anunciante ve los datos del interesado; el interesado ve los del anunciante al aprobarse.
    const approved = ['APPROVED', 'DEPOSIT_PAID', 'COMPLETED'].includes(r.Status);
    return {
      ...base, viewer: { isGuest, isManager }, cancellationPolicy: s?.CancellationPolicy || null,
      guest: { ...base.guest, ...(isManager ? { email: contact?.GuestEmail, phone: contact?.GuestPhone } : {}) },
      owner: { ...base.owner, ...(isGuest && approved ? { phone: contact?.OwnerPhone, email: contact?.OwnerEmail } : {}) },
      messages: messages.map((m: any) => ({ id: m.Id, userId: m.UserId, fullName: m.FullName, body: m.Body, createdAt: m.CreatedAt, mine: m.UserId === userId })),
      documents: docs.map((d: any) => ({ id: d.Id, kind: d.Kind, fileName: d.FileName, mime: d.Mime, size: d.Size, createdAt: d.CreatedAt, uploadedBy: d.FullName, mine: d.UserId === userId })),
    };
  }

  // ───────────── Acciones (RF-25) ─────────────
  async action(userId: string, role: string, id: string, d: any) {
    const { r, isGuest, isManager } = await this.access(userId, role, id);
    const act = String(d.action || '');
    const title = r.Title;
    const guestEmail = (await this.db.query<any>('SELECT Email FROM Users WHERE Id=?', [r.GuestId]))[0]?.Email;
    const ownerEmail = (await this.db.query<any>('SELECT Email FROM Users WHERE Id=?', [r.OwnerId]))[0]?.Email;
    const need = (cond: boolean, msg: string) => { if (!cond) throw new BadRequestException(msg); };
    const manager = () => { if (!isManager) throw new ForbiddenException('Solo el anunciante o un administrador puede hacer esto.'); };
    const path = `/panel/reservas/${id}`;
    const money2 = (v: any) => { const n = Number(v); if (!(n > 0)) throw new BadRequestException('Indica un monto válido.'); return money(n); };
    const method = (v: any) => { if (!['CASH', 'TRANSFER'].includes(String(v))) throw new BadRequestException('Indica la forma de pago (efectivo o transferencia).'); return String(v); };

    switch (act) {
      case 'approve': {
        manager(); need(r.Status === 'PENDING', 'Solo se pueden aprobar solicitudes pendientes.');
        if (r.Kind !== 'SALE') need(!this.overlaps(dateOnly(r.CheckIn)!, dateOnly(r.CheckOut)!, await this.busyRanges(r.PropertyId, r.Id)), 'Esas fechas ya están ocupadas por otra reserva o un bloqueo.');
        const adv = d.advanceRequired ? money2(d.advanceRequired) : null;
        await this.db.execute("UPDATE Reservations SET Status='APPROVED', AdvanceRequired=?, OwnerNote=?, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [adv, String(d.note || '').slice(0, 1000) || null, id]);
        // Evitar dobles reservas: se rechazan las solicitudes pendientes que se cruzan.
        if (r.Kind !== 'SALE') {
          const others = await this.db.query<any>(`SELECT r.Id, g.Email FROM Reservations r JOIN Users g ON g.Id=r.GuestId WHERE r.PropertyId=? AND r.Id<>? AND r.Status='PENDING' AND r.Kind<>'SALE' AND r.CheckIn < ? AND ? < r.CheckOut`, [r.PropertyId, id, dateOnly(r.CheckOut), dateOnly(r.CheckIn)]);
          for (const o of others) {
            await this.db.execute("UPDATE Reservations SET Status='REJECTED', OwnerNote='Las fechas se reservaron para otra solicitud.', UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [o.Id]);
            this.mail.notify(o.Email, `Solicitud no disponible · ${title}`, 'Esas fechas ya no están disponibles', `Las fechas que pediste para "${title}" se reservaron para otra solicitud. Puedes elegir otras fechas.`, 'Ver propiedad', `/propiedades/${r.Slug}`);
          }
        }
        this.mail.notify(guestEmail, `Solicitud aprobada · ${title}`, '¡Tu solicitud fue aprobada!', `El anunciante aprobó tu ${KIND_LABEL[r.Kind as Kind]} de "${title}".${adv ? ` Para apartar se requiere un anticipo de ${fmtMoney(adv)}, que se paga por transferencia o en persona.` : ''} Acuerden la cita de pago desde el chat de la reserva.`, 'Ver reserva', path);
        break;
      }
      case 'reject': {
        manager(); need(['PENDING', 'APPROVED'].includes(r.Status), 'Esta reserva ya no se puede rechazar.');
        await this.db.execute("UPDATE Reservations SET Status='REJECTED', OwnerNote=?, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [String(d.note || '').slice(0, 1000) || null, id]);
        this.mail.notify(guestEmail, `Solicitud no aprobada · ${title}`, 'Tu solicitud no fue aprobada', `El anunciante no pudo aprobar tu solicitud para "${title}".${d.note ? ` Motivo: ${String(d.note).slice(0, 300)}` : ''}`, 'Ver reserva', path);
        break;
      }
      case 'cancel': {
        need(['PENDING', 'APPROVED', 'DEPOSIT_PAID'].includes(r.Status), 'Esta reserva ya no se puede cancelar.');
        if (isGuest && !isManager) need(r.Status !== 'DEPOSIT_PAID', 'Tu reserva ya tiene anticipo registrado: para cancelarla escribe al anunciante en el chat.');
        await this.db.execute("UPDATE Reservations SET Status='CANCELLED', OwnerNote=COALESCE(?, OwnerNote), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [String(d.note || '').slice(0, 1000) || null, id]);
        if (r.Status === 'DEPOSIT_PAID' && r.Kind !== 'NIGHTLY') await this.db.execute("UPDATE Properties SET Availability='AVAILABLE', UpdatedAt=UTC_TIMESTAMP() WHERE Id=? AND Availability='RESERVED'", [r.PropertyId]);
        this.mail.notify(isGuest ? ownerEmail : guestEmail, `Reserva cancelada · ${title}`, 'La reserva fue cancelada', `La reserva de "${title}" fue cancelada por ${isGuest ? 'el interesado' : 'el anunciante'}.`, 'Ver reserva', path);
        break;
      }
      case 'schedule': {
        manager(); need(['APPROVED', 'DEPOSIT_PAID'].includes(r.Status), 'Primero aprueba la solicitud.');
        const at = new Date(String(d.appointmentAt || ''));
        need(!isNaN(at.getTime()) && at.getTime() > Date.now() - 3600000, 'Elige una fecha y hora futura para la cita.');
        const place = String(d.place || '').trim().slice(0, 250); need(place.length >= 3, 'Indica el lugar de la cita.');
        await this.db.execute('UPDATE Reservations SET AppointmentAt=?, AppointmentPlace=?, GuestConfirmedAt=NULL, ReminderSentAt=NULL, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?', [at.toISOString().slice(0, 19).replace('T', ' '), place, id]);
        this.mail.notify(guestEmail, `Cita de pago · ${title}`, 'Se agendó tu cita', `Cita para "${title}" el ${fmtWhen(at)} en ${place}. El pago se realiza por transferencia o en persona. Confirma tu asistencia desde la reserva.`, 'Confirmar cita', path);
        break;
      }
      case 'confirm': {
        need(isGuest, 'Solo el interesado confirma la cita.'); need(!!r.AppointmentAt, 'Aún no hay cita agendada.');
        await this.db.execute('UPDATE Reservations SET GuestConfirmedAt=UTC_TIMESTAMP(), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?', [id]);
        this.mail.notify(ownerEmail, `Cita confirmada · ${title}`, 'El interesado confirmó la cita', `La cita para "${title}" quedó confirmada.`, 'Ver reserva', path);
        break;
      }
      case 'deposit': {
        manager(); need(r.Status === 'APPROVED', 'El anticipo se registra en reservas aprobadas.');
        const amount = money2(d.amount), m = method(d.method);
        await this.db.execute("UPDATE Reservations SET Status='DEPOSIT_PAID', AdvanceAmount=?, AdvanceMethod=?, AdvancePaidAt=UTC_TIMESTAMP(), PaymentNotes=COALESCE(?,PaymentNotes), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [amount, m, String(d.notes || '').slice(0, 500) || null, id]);
        // El anticipo deja la propiedad "Apartada" (renta mensual y compra).
        if (r.Kind !== 'NIGHTLY') await this.db.execute("UPDATE Properties SET Availability='RESERVED', UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [r.PropertyId]);
        this.mail.notify(guestEmail, `Anticipo registrado · ${title}`, 'Tu apartado quedó registrado', `Se registró tu anticipo de ${fmtMoney(amount)} (${m === 'CASH' ? 'efectivo' : 'transferencia'}) para "${title}". La propiedad queda apartada para ti.`, 'Ver reserva', path);
        break;
      }
      case 'complete': {
        manager(); need(['APPROVED', 'DEPOSIT_PAID'].includes(r.Status), 'Esta reserva no está lista para cerrarse.');
        const amount = money2(d.amount), m = method(d.method);
        await this.db.execute("UPDATE Reservations SET Status='COMPLETED', PaidAmount=?, PaidMethod=?, PaidAt=UTC_TIMESTAMP(), PaymentNotes=COALESCE(?,PaymentNotes), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [amount, m, String(d.notes || '').slice(0, 500) || null, id]);
        if (r.Kind === 'MONTHLY') await this.db.execute("UPDATE Properties SET Availability='RENTED', UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [r.PropertyId]);
        if (r.Kind === 'SALE') await this.db.execute("UPDATE Properties SET Availability='SOLD', UpdatedAt=UTC_TIMESTAMP() WHERE Id=?", [r.PropertyId]);
        this.mail.notify(guestEmail, `Pago registrado · ${title}`, '¡Listo! Tu operación quedó cerrada', `Se registró tu pago de ${fmtMoney(amount)} para "${title}". Gracias por usar Agencia EH.`, 'Ver reserva', path);
        break;
      }
      default: throw new BadRequestException('Acción no válida.');
    }
    return this.detail(userId, role, id);
  }

  // ───────────── Chat y documentos ─────────────
  async message(userId: string, role: string, id: string, body: string) {
    const { r, isGuest } = await this.access(userId, role, id);
    const text = String(body || '').trim().slice(0, 2000);
    if (!text) throw new BadRequestException('Escribe un mensaje.');
    if (['REJECTED', 'CANCELLED'].includes(r.Status)) throw new BadRequestException('La reserva está cerrada.');
    // Seq conserva el orden aunque dos mensajes lleguen en el mismo segundo.
    await this.db.execute('INSERT INTO ReservationMessages(Id,ReservationId,UserId,Body,Seq) SELECT ?,?,?,?,COALESCE(MAX(Seq),0)+1 FROM ReservationMessages WHERE ReservationId=?', [randomUUID(), id, userId, text, id]);
    const toId = isGuest ? r.OwnerId : r.GuestId;
    const [to] = await this.db.query<any>('SELECT Email FROM Users WHERE Id=?', [toId]);
    const [from] = await this.db.query<any>('SELECT FullName FROM Users WHERE Id=?', [userId]);
    if (to) this.mail.notify(to.Email, `Nuevo mensaje · ${r.Title}`, 'Tienes un mensaje nuevo', `${from?.FullName || 'Alguien'} escribió sobre "${r.Title}": "${text.slice(0, 200)}${text.length > 200 ? '…' : ''}"`, 'Responder', `/panel/reservas/${id}`);
    return this.detail(userId, role, id);
  }

  async upload(userId: string, role: string, id: string, file: Express.Multer.File | undefined, kind?: string) {
    const { r } = await this.access(userId, role, id);
    if (['REJECTED', 'CANCELLED'].includes(r.Status)) throw new BadRequestException('La reserva está cerrada.');
    if (!file?.buffer?.length) throw new BadRequestException('Selecciona un archivo.');
    const b = file.buffer;
    const type = b.subarray(0, 4).toString('ascii') === '%PDF' ? ['pdf', 'application/pdf']
      : b[0] === 0xff && b[1] === 0xd8 ? ['jpg', 'image/jpeg']
      : b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? ['png', 'image/png'] : null;
    if (!type) throw new BadRequestException('Formato no permitido. Sube PDF, JPG o PNG.');
    const [c] = await this.db.query<any>('SELECT COUNT(*) AS n FROM ReservationDocuments WHERE ReservationId=?', [id]);
    if (Number(c.n) >= 20) throw new BadRequestException('Máximo 20 documentos por reserva.');
    const stored = `${randomUUID()}.${type[0]}`;
    writeFileSync(join(privateRoot(), stored), b, { mode: 0o600 });
    const name = String(file.originalname || `documento.${type[0]}`).replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ()]/g, '_').slice(0, 200);
    await this.db.execute('INSERT INTO ReservationDocuments(Id,ReservationId,UserId,Kind,FileName,StoredName,Mime,Size) VALUES(?,?,?,?,?,?,?,?)', [randomUUID(), id, userId, String(kind || '').slice(0, 40) || null, name, stored, type[1], b.length]);
    return this.detail(userId, role, id);
  }

  async document(userId: string, role: string, id: string, docId: string) {
    await this.access(userId, role, id);
    const [d] = await this.db.query<any>('SELECT * FROM ReservationDocuments WHERE Id=? AND ReservationId=?', [docId, id]);
    if (!d) throw new NotFoundException('Documento no encontrado.');
    const file = join(privateRoot(), d.StoredName);
    if (!existsSync(file)) throw new NotFoundException('El archivo ya no existe.');
    return { stream: createReadStream(file), mime: d.Mime, name: d.FileName };
  }

  async removeDocument(userId: string, role: string, id: string, docId: string) {
    await this.access(userId, role, id);
    const [d] = await this.db.query<any>('SELECT * FROM ReservationDocuments WHERE Id=? AND ReservationId=?', [docId, id]);
    if (!d) throw new NotFoundException('Documento no encontrado.');
    if (d.UserId !== userId && role !== 'ADMIN') throw new ForbiddenException('Solo quien subió el documento puede borrarlo.');
    await this.db.execute('DELETE FROM ReservationDocuments WHERE Id=?', [docId]);
    try { unlinkSync(join(privateRoot(), d.StoredName)); } catch { /* ya no existe */ }
    return this.detail(userId, role, id);
  }
}
