import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../mail/mail.service';
import { removeMedia } from '../uploads/media';
import { DatabaseService } from '../database/database.service';
import { CreatePaymentDto, DeleteUserDto, UpdateUserDto } from './admin.dto';

const hashToken = (v: string) => createHash('sha256').update(v).digest('hex');

const dateOnly = (v: any) => (v instanceof Date ? v.toISOString().slice(0, 10) : v ? String(v).slice(0, 10) : null);
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Última membresía (pago con PeriodEnd más reciente) de cada usuario.
const LAST_PAYMENT = `SELECT p.UserId, p.Plan, p.PeriodEnd, p.PaidAt FROM Payments p
  JOIN (SELECT UserId, MAX(PeriodEnd) AS MaxEnd FROM Payments GROUP BY UserId) m ON m.UserId = p.UserId AND m.MaxEnd = p.PeriodEnd`;

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  async metrics() {
    const [users] = await this.db.query<any>(`SELECT COUNT(*) AS total,
      SUM(Role='BUYER') AS buyers, SUM(Role='AGENT') AS agents, SUM(Role='AGENCY') AS agencies, SUM(Role='DEVELOPER') AS developers, SUM(Role='ADMIN') AS admins, SUM(ApprovalStatus='PENDING') AS pending,
      SUM(IsActive=0) AS inactive, SUM(CreatedAt >= UTC_TIMESTAMP() - INTERVAL 30 DAY) AS new30, SUM(EmailVerifiedAt IS NOT NULL) AS verified FROM Users`);
    const props = await this.db.query<any>('SELECT Status, COUNT(*) AS n FROM Properties GROUP BY Status');
    const [members] = await this.db.query<any>(`SELECT
      SUM(MaxEnd >= UTC_DATE()) AS active,
      SUM(MaxEnd >= UTC_DATE() AND MaxEnd <= UTC_DATE() + INTERVAL 7 DAY) AS expiring7,
      SUM(MaxEnd < UTC_DATE()) AS expired
      FROM (SELECT UserId, MAX(PeriodEnd) AS MaxEnd FROM Payments GROUP BY UserId) t`);
    const [month] = await this.db.query<any>(`SELECT COALESCE(SUM(Amount),0) AS total, COUNT(*) AS n,
      COALESCE(SUM(CASE WHEN Method='CASH' THEN Amount END),0) AS cash, COALESCE(SUM(CASE WHEN Method='TRANSFER' THEN Amount END),0) AS transfer
      FROM Payments WHERE PaidAt >= DATE_FORMAT(UTC_DATE(),'%Y-%m-01')`);
    const [prev] = await this.db.query<any>(`SELECT COALESCE(SUM(Amount),0) AS total FROM Payments
      WHERE PaidAt >= DATE_FORMAT(UTC_DATE() - INTERVAL 1 MONTH,'%Y-%m-01') AND PaidAt < DATE_FORMAT(UTC_DATE(),'%Y-%m-01')`);
    const expiring = await this.db.query<any>(`SELECT u.Id, u.FullName, u.Email, u.Role, l.Plan, l.PeriodEnd FROM (${LAST_PAYMENT}) l
      JOIN Users u ON u.Id = l.UserId WHERE l.PeriodEnd >= UTC_DATE() AND l.PeriodEnd <= UTC_DATE() + INTERVAL 7 DAY ORDER BY l.PeriodEnd LIMIT 10`);
    const n = (v: any) => Number(v || 0);
    const byStatus = Object.fromEntries(props.map((r: any) => [r.Status, n(r.n)]));
    return {
      users: { total: n(users.total), byRole: { BUYER: n(users.buyers), AGENT: n(users.agents), AGENCY: n(users.agencies), DEVELOPER: n(users.developers), ADMIN: n(users.admins) }, pending: n(users.pending), inactive: n(users.inactive), new30: n(users.new30), verified: n(users.verified) },
      properties: { total: props.reduce((a: number, r: any) => a + n(r.n), 0), byStatus },
      memberships: { active: n(members?.active), expiring7: n(members?.expiring7), expired: n(members?.expired),
        expiring: expiring.map((r: any) => ({ id: r.Id, fullName: r.FullName, email: r.Email, role: r.Role, plan: r.Plan, periodEnd: dateOnly(r.PeriodEnd) })) },
      payments: { monthTotal: n(month.total), monthCount: n(month.n), monthCash: n(month.cash), monthTransfer: n(month.transfer), prevMonthTotal: n(prev.total) },
    };
  }

  async users(q: any) {
    const page = Math.max(1, Number(q.page) || 1), take = Math.min(50, Math.max(5, Number(q.take) || 20));
    const where: string[] = ['1=1'], params: any[] = [];
    if (q.search) { const t = String(q.search).trim().slice(0, 100); where.push(`(u.FullName LIKE CONCAT('%',?,'%') OR u.Email LIKE CONCAT('%',?,'%') OR u.Phone LIKE CONCAT('%',?,'%'))`); params.push(t, t, t); }
    if (q.approval) { if (!['PENDING', 'APPROVED', 'REJECTED'].includes(String(q.approval))) throw new BadRequestException('Estado no válido.'); where.push('u.ApprovalStatus=?'); params.push(q.approval); }
    if (q.role) { if (!['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN'].includes(String(q.role))) throw new BadRequestException('Rol no válido.'); where.push('u.Role=?'); params.push(q.role); }
    if (q.status === 'active') where.push('u.IsActive=1'); else if (q.status === 'inactive') where.push('u.IsActive=0');
    if (q.membership === 'active') where.push('l.PeriodEnd >= UTC_DATE()');
    else if (q.membership === 'expired') where.push('l.PeriodEnd < UTC_DATE()');
    else if (q.membership === 'none') where.push('l.UserId IS NULL');
    const from = `FROM Users u LEFT JOIN (${LAST_PAYMENT}) l ON l.UserId = u.Id LEFT JOIN Users cb ON cb.Id = u.CreatedById WHERE ${where.join(' AND ')}`;
    const [count] = await this.db.query<any>(`SELECT COUNT(*) AS total ${from}`, params);
    const rows = await this.db.query<any>(`SELECT u.Id, u.FullName, u.Email, u.Phone, u.Role, u.IsActive, u.EmailVerifiedAt, u.CreatedAt, u.ApprovalStatus,
      l.Plan, l.PeriodEnd, (SELECT COUNT(*) FROM Properties pr WHERE pr.OwnerId = u.Id) AS Properties, cb.FullName AS CreatedByName
      ${from} ORDER BY (u.ApprovalStatus='PENDING') DESC, u.CreatedAt DESC LIMIT ? OFFSET ?`, [...params, take, (page - 1) * take]);
    const total = Number(count.total);
    return {
      items: rows.map((r: any) => ({
        id: r.Id, fullName: r.FullName, email: r.Email, phone: r.Phone, role: r.Role, isActive: !!r.IsActive, emailVerified: !!r.EmailVerifiedAt,
        createdAt: r.CreatedAt, properties: Number(r.Properties), createdBy: r.CreatedByName ?? null, approvalStatus: r.ApprovalStatus || 'APPROVED',
        membership: r.PeriodEnd ? { plan: r.Plan, periodEnd: dateOnly(r.PeriodEnd), active: dateOnly(r.PeriodEnd)! >= new Date().toISOString().slice(0, 10) } : null,
      })),
      total, page, take, pages: Math.ceil(total / take),
    };
  }

  async updateUser(adminId: string, id: string, d: UpdateUserDto) {
    const [u] = await this.db.query<any>('SELECT Id, FullName, Email, Role, IsActive, ApprovalStatus FROM Users WHERE Id=? LIMIT 1', [id]);
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    if (id === adminId && ((d.role && d.role !== 'ADMIN') || d.isActive === false)) throw new ForbiddenException('No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.');
    const losesAdmin = u.Role === 'ADMIN' && ((d.role && d.role !== 'ADMIN') || d.isActive === false);
    if (losesAdmin) {
      const [a] = await this.db.query<any>("SELECT COUNT(*) AS n FROM Users WHERE Role='ADMIN' AND IsActive=1 AND Id<>?", [id]);
      if (Number(a.n) === 0) throw new BadRequestException('Debe quedar al menos un administrador activo.');
    }
    const sets: string[] = ['UpdatedAt=UTC_TIMESTAMP()'], params: any[] = [];
    if (d.role) { sets.push('Role=?'); params.push(d.role); }
    if (d.isActive !== undefined) { sets.push('IsActive=?'); params.push(d.isActive ? 1 : 0); if (!d.isActive) sets.push('RefreshTokenHash=NULL'); }
    if (d.approval && d.approval !== u.ApprovalStatus) { sets.push('ApprovalStatus=?'); params.push(d.approval); if (d.approval === 'REJECTED') sets.push('RefreshTokenHash=NULL'); }
    if (d.fullName !== undefined) { sets.push('FullName=?'); params.push(d.fullName.trim()); }
    if (d.phone !== undefined) { sets.push('Phone=?'); params.push(d.phone.trim() || null); }
    if (d.email !== undefined) {
      const email = d.email.trim().toLowerCase();
      if (email !== u.Email) {
        const [dup] = await this.db.query<any>('SELECT Id FROM Users WHERE Email=? AND Id<>? LIMIT 1', [email, id]);
        if (dup) throw new ConflictException('Ya existe otra cuenta con ese correo.');
        // Cambiar el correo cierra la sesión y anula enlaces pendientes enviados al correo anterior.
        sets.push('Email=?', 'RefreshTokenHash=NULL', 'PasswordResetTokenHash=NULL', 'PasswordResetExpiresAt=NULL', 'EmailVerificationTokenHash=NULL'); params.push(email);
      }
    }
    // Un cambio de rol cierra la sesión para que el nuevo rol se aplique al volver a entrar.
    if (d.role && d.role !== u.Role) sets.push('RefreshTokenHash=NULL');
    await this.db.transaction(async (tx) => {
      await this.db.execute(`UPDATE Users SET ${sets.join(',')} WHERE Id=?`, [...params, id], tx);
      if (d.role === 'AGENT') await this.db.execute('INSERT IGNORE INTO AgentProfiles(Id,UserId) VALUES(?,?)', [randomUUID(), id], tx);
      if (d.role === 'AGENCY' || d.role === 'DEVELOPER') await this.db.execute('INSERT IGNORE INTO AgencyProfiles(Id,UserId,Name,Slug) VALUES(?,?,?,?)', [randomUUID(), id, u.FullName, `${slugify(u.FullName) || 'agencia'}-${randomUUID().slice(0, 6)}`], tx);
    });
    if (d.approval && d.approval !== u.ApprovalStatus && d.approval !== 'PENDING') this.mail.sendApprovalResult(d.email?.trim().toLowerCase() || u.Email, d.approval === 'APPROVED');
    return (await this.users({ search: '', take: 50 })).items.find((x) => x.id === id) ?? { id };
  }

  async payments(q: any) {
    const where: string[] = ['1=1'], params: any[] = [];
    if (q.userId) { where.push('p.UserId=?'); params.push(String(q.userId)); }
    if (q.month) {
      if (!/^\d{4}-\d{2}$/.test(String(q.month))) throw new BadRequestException('Mes no válido (AAAA-MM).');
      where.push(`p.PaidAt >= ? AND p.PaidAt < (? + INTERVAL 1 MONTH)`); params.push(`${q.month}-01`, `${q.month}-01`);
    }
    const rows = await this.db.query<any>(`SELECT p.*, u.FullName, u.Email, r.FullName AS RecordedBy FROM Payments p
      JOIN Users u ON u.Id = p.UserId JOIN Users r ON r.Id = p.RecordedById WHERE ${where.join(' AND ')} ORDER BY p.PaidAt DESC, p.CreatedAt DESC LIMIT 200`, params);
    const items = rows.map((r: any) => ({
      id: r.Id, userId: r.UserId, fullName: r.FullName, email: r.Email, plan: r.Plan, amount: Number(r.Amount), currency: r.Currency,
      method: r.Method, reference: r.Reference, paidAt: dateOnly(r.PaidAt), periodStart: dateOnly(r.PeriodStart), periodEnd: dateOnly(r.PeriodEnd),
      notes: r.Notes, recordedBy: r.RecordedBy, createdAt: r.CreatedAt,
    }));
    return { items, total: items.reduce((a: number, p: any) => a + p.amount, 0) };
  }

  async createPayment(adminId: string, d: CreatePaymentDto) {
    if (d.periodEnd < d.periodStart) throw new BadRequestException('La fecha de fin del periodo no puede ser anterior al inicio.');
    if (d.method === 'TRANSFER' && !d.reference?.trim()) throw new BadRequestException('Indica la referencia o folio de la transferencia.');
    const [u] = await this.db.query<any>('SELECT Id FROM Users WHERE Id=? LIMIT 1', [d.userId]);
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    const id = randomUUID();
    await this.db.execute(`INSERT INTO Payments(Id,UserId,Plan,Amount,Method,Reference,PaidAt,PeriodStart,PeriodEnd,Notes,RecordedById)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`, [id, d.userId, d.plan.trim(), d.amount, d.method, d.reference?.trim() || null,
      d.paidAt.slice(0, 10), d.periodStart.slice(0, 10), d.periodEnd.slice(0, 10), d.notes?.trim() || null, adminId]);
    return (await this.payments({ userId: d.userId })).items.find((p) => p.id === id);
  }

  async deletePayment(id: string) {
    const r = await this.db.execute('DELETE FROM Payments WHERE Id=?', [id]);
    if (!r.affectedRows) throw new NotFoundException('Pago no encontrado.');
    return { deleted: true };
  }

  /** El admin fija una contraseña nueva: cierra las sesiones del usuario y anula enlaces pendientes. */
  async setPassword(id: string, password: string) {
    const [u] = await this.db.query<any>('SELECT Id, FullName FROM Users WHERE Id=? LIMIT 1', [id]);
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    const hash = await bcrypt.hash(password, 12);
    await this.db.execute(`UPDATE Users SET PasswordHash=?, RefreshTokenHash=NULL, PasswordResetTokenHash=NULL, PasswordResetExpiresAt=NULL,
      EmailVerifiedAt=COALESCE(EmailVerifiedAt, UTC_TIMESTAMP()), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?`, [hash, id]);
    return { success: true, message: `Contraseña de ${u.FullName} actualizada. Se cerraron sus sesiones abiertas.` };
  }

  /** Enlace (24 h) para que el usuario elija su contraseña; se envía por correo y se devuelve para copiar/WhatsApp. */
  async passwordLink(id: string) {
    const [u] = await this.db.query<any>('SELECT Id, Email, FullName FROM Users WHERE Id=? LIMIT 1', [id]);
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    const raw = randomBytes(32).toString('hex');
    await this.db.execute('UPDATE Users SET PasswordResetTokenHash=?, PasswordResetExpiresAt=DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?', [hashToken(raw), id]);
    this.mail.sendPasswordReset(u.Email, raw, '24 horas', true);
    return { link: this.mail.resetLink(raw), emailSent: this.mail.status.configured, email: u.Email, expiresInHours: 24 };
  }

  /**
   * Borra un usuario con sus propiedades (y fotos), pagos, favoritos y perfiles.
   * Se conservan las cuentas que creó y los pagos que registró (pasan a quien borra).
   */
  async deleteUser(adminId: string, id: string, d: DeleteUserDto) {
    if (id === adminId) throw new ForbiddenException('No puedes borrar tu propia cuenta.');
    const [u] = await this.db.query<any>('SELECT Id, Email, FullName, Role, IsActive FROM Users WHERE Id=? LIMIT 1', [id]);
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    if (d.confirmEmail.trim().toLowerCase() !== u.Email) throw new BadRequestException('El correo de confirmación no coincide.');
    if (u.Role === 'ADMIN') {
      const [a] = await this.db.query<any>("SELECT COUNT(*) AS n FROM Users WHERE Role='ADMIN' AND IsActive=1 AND Id<>?", [id]);
      if (Number(a.n) === 0) throw new BadRequestException('Debe quedar al menos un administrador activo.');
    }
    const images = (await this.db.query<any>('SELECT i.Url FROM PropertyImages i JOIN Properties p ON p.Id=i.PropertyId WHERE p.OwnerId=?', [id])).map((r) => r.Url as string);
    const [counts] = await this.db.query<any>('SELECT (SELECT COUNT(*) FROM Properties WHERE OwnerId=?) AS props, (SELECT COUNT(*) FROM Payments WHERE UserId=?) AS pays', [id, id]);
    await this.db.transaction(async (tx) => {
      await this.db.execute('UPDATE Payments SET RecordedById=? WHERE RecordedById=?', [adminId, id], tx);
      await this.db.execute('DELETE FROM Payments WHERE UserId=?', [id], tx);
      await this.db.execute('DELETE FROM Reservations WHERE GuestId=?', [id], tx);
      await this.db.execute('DELETE FROM ReservationMessages WHERE UserId=?', [id], tx);
      await this.db.execute('UPDATE Leads SET AssignedToId=NULL WHERE AssignedToId=?', [id], tx);
      await this.db.execute('DELETE FROM Properties WHERE OwnerId=?', [id], tx);
      await this.db.execute('UPDATE AgentProfiles SET AgencyId=NULL WHERE AgencyId IN (SELECT Id FROM AgencyProfiles WHERE UserId=?)', [id], tx);
      await this.db.execute('UPDATE Users SET CreatedById=NULL WHERE CreatedById=?', [id], tx);
      await this.db.execute('DELETE FROM Users WHERE Id=?', [id], tx);
    });
    removeMedia(images);
    return { deleted: true, message: `${u.FullName} fue eliminado junto con ${Number(counts.props)} propiedad(es) y ${Number(counts.pays)} pago(s).` };
  }
}
