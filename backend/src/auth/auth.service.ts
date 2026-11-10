import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
const hashToken=(v:string)=>createHash('sha256').update(v).digest('hex');
const safeUser=(u:any)=>({id:u.Id,fullName:u.FullName,email:u.Email,role:u.Role,phone:u.Phone??null,emailVerified:!!u.EmailVerifiedAt,approvalStatus:u.ApprovalStatus||'APPROVED'});
/** Correos que deben ser administradores (variable ADMIN_EMAILS, separados por comas). */
const adminEmails=()=>(process.env.ADMIN_EMAILS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean);
/** Registro público (desde /acceso). Cerrado por defecto: las cuentas las crean admin, agencias y agentes. */
/** Registro público (RF-08). Abierto por defecto; PUBLIC_SIGNUP=false lo cierra. */
export const publicSignupOpen=()=>!['0','false','no'].includes(String(process.env.PUBLIC_SIGNUP||'').trim().toLowerCase());
const fmtDay=(d:any)=>new Date(String(d instanceof Date?d.toISOString():d).slice(0,10)+'T12:00:00Z').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
@Injectable() export class AuthService implements OnModuleInit {
 constructor(private readonly db:DatabaseService,private readonly jwt:JwtService,private readonly mail:MailService){}
 /** Al arrancar, convierte en ADMIN a los usuarios ya registrados con un correo de ADMIN_EMAILS. */
 async onModuleInit(){const list=adminEmails();if(!list.length)return;try{const r=await this.db.execute(`UPDATE Users SET Role='ADMIN',UpdatedAt=UTC_TIMESTAMP() WHERE Role<>'ADMIN' AND Email IN (${list.map(()=>'?').join(',')})`,list);if(r.affectedRows)console.error(`[Agencia EH] ${r.affectedRows} usuario(s) promovido(s) a ADMIN por ADMIN_EMAILS`);}catch(e:any){console.error('[Agencia EH] ADMIN_EMAILS:',e?.message);}}
 /**
  * Bloqueo por membresía: si el usuario (no admin) tiene pagos registrados y el
  * último periodo ya venció, no puede entrar. Sin pagos registrados no se bloquea.
  */
 private async assertMembership(u:any){if(u?.ApprovalStatus==='REJECTED')throw new ForbiddenException('Tu solicitud de cuenta no fue aprobada. Si crees que es un error, contacta a Agencia EH.');if(!u||u.Role==='ADMIN')return;const [m]=await this.db.query<any>('SELECT MAX(PeriodEnd) AS MaxEnd, MAX(PeriodEnd) < UTC_DATE() AS Expired FROM Payments WHERE UserId=?',[u.Id]);if(m?.MaxEnd&&Number(m.Expired)===1)throw new ForbiddenException(`Tu membresía venció el ${fmtDay(m.MaxEnd)}. Contacta a Agencia EH para renovarla y recuperar el acceso.`);}
 /** Aviso a los administradores: hay una cuenta profesional por aprobar. */
 private async notifyAdminsPending(name:string,role:string){try{const admins=await this.db.query<any>("SELECT Email FROM Users WHERE Role='ADMIN' AND IsActive=1");for(const a of admins)this.mail.sendApprovalNeeded(a.Email,name,role);}catch{}}
 /** Si el correo está en ADMIN_EMAILS y aún no es ADMIN, lo promueve. */
 private async ensureAdmin(u:any){if(u&&u.Role!=='ADMIN'&&adminEmails().includes(String(u.Email).toLowerCase())){await this.db.execute("UPDATE Users SET Role='ADMIN',UpdatedAt=UTC_TIMESTAMP() WHERE Id=?",[u.Id]);return {...u,Role:'ADMIN'};}return u;}
 private async issueTokens(user:any){
  const accessToken=await this.jwt.signAsync({sub:user.Id,role:user.Role,jti:randomUUID()},{secret:process.env.JWT_ACCESS_SECRET,expiresIn:'15m'});
  const refreshToken=await this.jwt.signAsync({sub:user.Id,type:'refresh',jti:randomUUID()},{secret:process.env.JWT_REFRESH_SECRET,expiresIn:'7d'});
  await this.db.execute('UPDATE Users SET RefreshTokenHash=?, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[hashToken(refreshToken),user.Id]);
  return {accessToken,refreshToken,user:safeUser(user)};
 }
 async register(dto:RegisterDto){
  if(!publicSignupOpen())throw new ForbiddenException('El registro público está cerrado. Tu cuenta la crea Agencia EH, tu agencia o tu asesor.');
  const email=dto.email.trim().toLowerCase(); if((dto.role==='AGENCY'||dto.role==='DEVELOPER')&&!dto.agencyName?.trim())throw new BadRequestException(dto.role==='DEVELOPER'?'Indica el nombre de la desarrolladora.':'Indica el nombre de la agencia.');
  // RF-10: agentes, agencias y desarrolladores quedan en revisión hasta que el administrador los apruebe.
  const approval=dto.role==='BUYER'?'APPROVED':'PENDING';
  const exists=await this.db.query('SELECT Id FROM Users WHERE Email=? LIMIT 1',[email]); if(exists.length)throw new ConflictException('Ya existe una cuenta con ese correo electrónico.');
  const id=randomUUID(), raw=randomBytes(32).toString('hex'), expires=new Date(Date.now()+86400000), hash=await bcrypt.hash(dto.password,12);
  try { await this.db.transaction(async tx=>{
   await this.db.execute('INSERT INTO Users(Id,Email,FullName,PasswordHash,Role,EmailVerificationTokenHash,EmailVerificationExpiresAt,ApprovalStatus) VALUES(?,?,?,?,?,?,?,?)',[id,email,dto.fullName.trim(),hash,dto.role,hashToken(raw),expires,approval],tx);
   if(dto.role==='AGENT') await this.db.execute('INSERT INTO AgentProfiles(Id,UserId) VALUES(?,?)',[randomUUID(),id],tx);
   if(dto.role==='AGENCY'||dto.role==='DEVELOPER'){const slug=dto.agencyName!.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+randomUUID().slice(0,6);await this.db.execute('INSERT INTO AgencyProfiles(Id,UserId,Name,Slug) VALUES(?,?,?,?)',[randomUUID(),id,dto.agencyName!.trim(),slug],tx);}
  }); } catch(e:any){if(e?.errno===1062)throw new ConflictException('Ya existe una cuenta con ese correo.');throw e;}
  const user=await this.ensureAdmin({Id:id,Email:email,FullName:dto.fullName.trim(),Role:dto.role,Phone:null,EmailVerifiedAt:null,ApprovalStatus:approval});if(approval==='PENDING')this.notifyAdminsPending(dto.fullName.trim(),dto.role); this.mail.sendEmailVerification(email,raw);return this.issueTokens(user);
 }
 async login(dto:LoginDto){const [u]=await this.db.query('SELECT * FROM Users WHERE Email=? LIMIT 1',[dto.email.trim().toLowerCase()]);if(!u||!u.IsActive||!(await bcrypt.compare(dto.password,u.PasswordHash)))throw new UnauthorizedException('Correo o contraseña incorrectos.');const user=await this.ensureAdmin(u);await this.assertMembership(user);return this.issueTokens(user);}
 async refresh(token?:string){if(!token)throw new UnauthorizedException('No hay una sesión para renovar.');let p:any;try{p=await this.jwt.verifyAsync(token,{secret:process.env.JWT_REFRESH_SECRET});}catch{throw new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente.');}if(p.type!=='refresh'||!p.sub)throw new UnauthorizedException('Token inválido.');const [u]=await this.db.query('SELECT * FROM Users WHERE Id=? LIMIT 1',[p.sub]);if(!u||!u.IsActive||!u.RefreshTokenHash||hashToken(token)!==u.RefreshTokenHash)throw new UnauthorizedException('La sesión ya no es válida.');const user=await this.ensureAdmin(u);await this.assertMembership(user);return this.issueTokens(user);}
 async logout(id:string){await this.db.execute('UPDATE Users SET RefreshTokenHash=NULL,UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[id]);return {success:true};}
 async me(id:string){const [u]=await this.db.query('SELECT Id,FullName,Email,Role,Phone,EmailVerifiedAt,IsActive,CreatedAt,ApprovalStatus FROM Users WHERE Id=?',[id]);if(!u||!u.IsActive)throw new UnauthorizedException();await this.assertMembership(u);return {id:u.Id,fullName:u.FullName,email:u.Email,role:u.Role,phone:u.Phone??null,emailVerified:!!u.EmailVerifiedAt,approvalStatus:u.ApprovalStatus||'APPROVED',createdAt:u.CreatedAt};}
 async updateProfile(id:string,d:UpdateProfileDto){const sets:string[]=['UpdatedAt=UTC_TIMESTAMP()'];const params:any[]=[];if(d.fullName!==undefined){sets.push('FullName=?');params.push(d.fullName.trim());}if(d.phone!==undefined){sets.push('Phone=?');params.push(d.phone.trim()||null);}params.push(id);await this.db.execute(`UPDATE Users SET ${sets.join(',')} WHERE Id=?`,params);return this.me(id);}
 async verifyEmail(token:string){const [u]=await this.db.query('SELECT Id FROM Users WHERE EmailVerificationTokenHash=? AND EmailVerificationExpiresAt>UTC_TIMESTAMP() LIMIT 1',[hashToken(token)]);if(!u)throw new BadRequestException('El enlace no es válido o ya venció. Solicita uno nuevo.');await this.db.execute('UPDATE Users SET EmailVerifiedAt=UTC_TIMESTAMP(),EmailVerificationTokenHash=NULL,EmailVerificationExpiresAt=NULL,UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[u.Id]);return {success:true,message:'Correo verificado correctamente.'};}
 async resendVerification(email:string){const [u]=await this.db.query('SELECT Id,Email FROM Users WHERE Email=? AND EmailVerifiedAt IS NULL LIMIT 1',[email.trim().toLowerCase()]);if(u){const raw=randomBytes(32).toString('hex');await this.db.execute('UPDATE Users SET EmailVerificationTokenHash=?,EmailVerificationExpiresAt=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 24 HOUR) WHERE Id=?',[hashToken(raw),u.Id]);this.mail.sendEmailVerification(u.Email,raw);}return {success:true,message:'Si la cuenta existe y requiere verificación, enviaremos instrucciones.'};}
 async requestPasswordReset(email:string){const [u]=await this.db.query('SELECT Id,Email FROM Users WHERE Email=? LIMIT 1',[email.trim().toLowerCase()]);if(u){const raw=randomBytes(32).toString('hex');await this.db.execute('UPDATE Users SET PasswordResetTokenHash=?,PasswordResetExpiresAt=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE Id=?',[hashToken(raw),u.Id]);this.mail.sendPasswordReset(u.Email,raw);}return {success:true,message:'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.'};}
 async resetPassword(token:string,password:string){const [u]=await this.db.query('SELECT Id FROM Users WHERE PasswordResetTokenHash=? AND PasswordResetExpiresAt>UTC_TIMESTAMP() LIMIT 1',[hashToken(token)]);if(!u)throw new BadRequestException('El enlace no es válido o ya venció. Solicita uno nuevo.');const passwordHash=await bcrypt.hash(password,12);await this.db.execute('UPDATE Users SET PasswordHash=?,PasswordResetTokenHash=NULL,PasswordResetExpiresAt=NULL,RefreshTokenHash=NULL,EmailVerifiedAt=COALESCE(EmailVerifiedAt,UTC_TIMESTAMP()),UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[passwordHash,u.Id]);return {success:true,message:'Contraseña actualizada. Inicia sesión nuevamente.'};}
}
