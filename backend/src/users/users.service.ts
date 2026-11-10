import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from './users.dto';

type Role = 'BUYER' | 'AGENT' | 'AGENCY' | 'DEVELOPER' | 'ADMIN';
/** Quién puede crear qué tipo de cuenta. */
export const CAN_CREATE: Record<Role, Role[]> = {
  ADMIN: ['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN'],
  // Solo el administrador crea cuentas; los compradores se registran solos.
  AGENCY: [],
  DEVELOPER: [],
  AGENT: [],
  BUYER: [],
};
const INVITE_HOURS = 24 * 7;
const hashToken = (v: string) => createHash('sha256').update(v).digest('hex');
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}

  private async creator(id: string) {
    const [c] = await this.db.query<any>('SELECT Id, FullName, Role, IsActive FROM Users WHERE Id=? LIMIT 1', [id]);
    if (!c || !c.IsActive) throw new ForbiddenException();
    return c as { Id: string; FullName: string; Role: Role };
  }

  /** Genera un enlace de activación nuevo (7 días) y lo envía por correo. */
  private async invite(user: { Id: string; Email: string; FullName: string }, creatorName: string) {
    const raw = randomBytes(32).toString('hex');
    await this.db.execute(`UPDATE Users SET PasswordResetTokenHash=?, PasswordResetExpiresAt=DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${INVITE_HOURS} HOUR), UpdatedAt=UTC_TIMESTAMP() WHERE Id=?`, [hashToken(raw), user.Id]);
    this.mail.sendInvite(user.Email, raw, user.FullName.split(' ')[0], creatorName);
    return { activationLink: this.mail.activationLink(raw), emailSent: this.mail.status.configured, expiresInDays: INVITE_HOURS / 24 };
  }

  async create(creatorId: string, d: CreateUserDto) {
    const c = await this.creator(creatorId);
    const [ap] = await this.db.query<any>('SELECT ApprovalStatus FROM Users WHERE Id=? LIMIT 1', [c.Id]);
    if (ap && ap.ApprovalStatus !== 'APPROVED') throw new ForbiddenException('Tu cuenta está en revisión. Podrás crear cuentas cuando el administrador la apruebe.');
    if (!CAN_CREATE[c.Role]?.includes(d.role)) throw new ForbiddenException('No puedes crear ese tipo de cuenta.');
    if ((d.role === 'AGENCY' || d.role === 'DEVELOPER') && !d.agencyName?.trim()) throw new BadRequestException('Indica el nombre de la empresa.');
    const email = d.email.trim().toLowerCase();
    const [exists] = await this.db.query('SELECT Id FROM Users WHERE Email=? LIMIT 1', [email]);
    if (exists) throw new ConflictException('Ya existe una cuenta con ese correo.');
    const id = randomUUID();
    // Contraseña aleatoria imposible de adivinar: la persona elige la suya con el enlace de activación.
    const unusable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    let agencyId: string | null = null;
    // El admin puede ligar al agente con una agencia o desarrolladora.
    if (d.role === 'AGENT' && d.agencyId) {
      const [a] = await this.db.query<any>('SELECT Id FROM AgencyProfiles WHERE Id=? LIMIT 1', [d.agencyId]);
      if (!a) throw new BadRequestException('La agencia elegida no existe.');
      agencyId = a.Id;
    }
    try {
      await this.db.transaction(async (tx) => {
        await this.db.execute('INSERT INTO Users(Id,Email,FullName,Phone,PasswordHash,Role,CreatedById) VALUES(?,?,?,?,?,?,?)',
          [id, email, d.fullName.trim(), d.phone?.trim() || null, unusable, d.role, c.Id], tx);
        if (d.role === 'AGENT') await this.db.execute('INSERT INTO AgentProfiles(Id,UserId,AgencyId) VALUES(?,?,?)', [randomUUID(), id, agencyId], tx);
        if (d.role === 'AGENCY' || d.role === 'DEVELOPER') await this.db.execute('INSERT INTO AgencyProfiles(Id,UserId,Name,Slug) VALUES(?,?,?,?)',
          [randomUUID(), id, d.agencyName!.trim(), `${slugify(d.agencyName!) || 'agencia'}-${randomUUID().slice(0, 6)}`], tx);
      });
    } catch (e: any) { if (e?.errno === 1062) throw new ConflictException('Ya existe una cuenta con ese correo.'); throw e; }
    const inv = await this.invite({ Id: id, Email: email, FullName: d.fullName.trim() }, c.FullName);
    return { user: (await this.mine(creatorId)).find((u) => u.id === id), ...inv };
  }

  /** Agencias y desarrolladoras para ligar agentes (solo admin). */
  async agencies() {
    const rows = await this.db.query<any>("SELECT ag.Id, ag.Name, u.Role FROM AgencyProfiles ag JOIN Users u ON u.Id=ag.UserId WHERE u.IsActive=1 ORDER BY ag.Name");
    return rows.map((r: any) => ({ id: r.Id, name: r.Name, kind: r.Role }));
  }

  /** Cuentas creadas por el usuario (el admin ve las que él creó; el resto, en su panel). */
  async mine(creatorId: string) {
    const rows = await this.db.query<any>(`SELECT Id, FullName, Email, Phone, Role, IsActive, EmailVerifiedAt, CreatedAt,
      (PasswordResetTokenHash IS NOT NULL AND PasswordResetExpiresAt > UTC_TIMESTAMP()) AS InvitePending
      FROM Users WHERE CreatedById=? ORDER BY CreatedAt DESC`, [creatorId]);
    return rows.map((r: any) => ({ id: r.Id, fullName: r.FullName, email: r.Email, phone: r.Phone, role: r.Role, isActive: !!r.IsActive,
      activated: !!r.EmailVerifiedAt, invitePending: !!Number(r.InvitePending), createdAt: r.CreatedAt }));
  }

  /** Nuevo enlace de activación, solo para cuentas que aún no se activan. */
  async resendInvite(creatorId: string, id: string) {
    const c = await this.creator(creatorId);
    const [u] = await this.db.query<any>('SELECT Id, Email, FullName, CreatedById, EmailVerifiedAt FROM Users WHERE Id=? LIMIT 1', [id]);
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    if (c.Role !== 'ADMIN' && u.CreatedById !== c.Id) throw new ForbiddenException('Solo puedes reenviar invitaciones de cuentas que creaste.');
    if (u.EmailVerifiedAt) throw new BadRequestException('Esta cuenta ya está activada. Si olvidó su contraseña, puede usar "¿Olvidaste tu contraseña?".');
    return this.invite(u, c.FullName);
  }
}
