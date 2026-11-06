import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, randomUUID, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
const hashToken=(v:string)=>createHash('sha256').update(v).digest('hex');
const safeUser=(u:any)=>({id:u.Id,fullName:u.FullName,email:u.Email,role:u.Role,phone:u.Phone??null,emailVerified:!!u.EmailVerifiedAt});
@Injectable() export class AuthService {
 constructor(private readonly db:DatabaseService,private readonly jwt:JwtService){}
 private async issueTokens(user:any){
  const accessToken=await this.jwt.signAsync({sub:user.Id,role:user.Role,jti:randomUUID()},{secret:process.env.JWT_ACCESS_SECRET,expiresIn:'15m'});
  const refreshToken=await this.jwt.signAsync({sub:user.Id,type:'refresh',jti:randomUUID()},{secret:process.env.JWT_REFRESH_SECRET,expiresIn:'7d'});
  await this.db.execute('UPDATE Users SET RefreshTokenHash=?, UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[hashToken(refreshToken),user.Id]);
  return {accessToken,refreshToken,user:safeUser(user)};
 }
 async register(dto:RegisterDto){
  const email=dto.email.trim().toLowerCase(); if(dto.role==='AGENCY'&&!dto.agencyName?.trim())throw new BadRequestException('Indica el nombre de la agencia.');
  const exists=await this.db.query('SELECT Id FROM Users WHERE Email=? LIMIT 1',[email]); if(exists.length)throw new ConflictException('Ya existe una cuenta con ese correo electrónico.');
  const id=randomUUID(), raw=randomBytes(32).toString('hex'), expires=new Date(Date.now()+86400000), hash=await bcrypt.hash(dto.password,12);
  try { await this.db.transaction(async tx=>{
   await this.db.execute('INSERT INTO Users(Id,Email,FullName,PasswordHash,Role,EmailVerificationTokenHash,EmailVerificationExpiresAt) VALUES(?,?,?,?,?,?,?)',[id,email,dto.fullName.trim(),hash,dto.role,hashToken(raw),expires],tx);
   if(dto.role==='AGENT') await this.db.execute('INSERT INTO AgentProfiles(Id,UserId) VALUES(?,?)',[randomUUID(),id],tx);
   if(dto.role==='AGENCY'){const slug=dto.agencyName!.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')+'-'+randomUUID().slice(0,6);await this.db.execute('INSERT INTO AgencyProfiles(Id,UserId,Name,Slug) VALUES(?,?,?,?)',[randomUUID(),id,dto.agencyName!.trim(),slug],tx);}
  }); } catch(e:any){if(e?.errno===1062)throw new ConflictException('Ya existe una cuenta con ese correo.');throw e;}
  const user={Id:id,Email:email,FullName:dto.fullName.trim(),Role:dto.role,Phone:null,EmailVerifiedAt:null}; this.devLink('VERIFICACIÓN DE CORREO',`/verificar-correo?token=${raw}`);return this.issueTokens(user);
 }
 async login(dto:LoginDto){const [u]=await this.db.query('SELECT * FROM Users WHERE Email=? LIMIT 1',[dto.email.trim().toLowerCase()]);if(!u||!u.IsActive||!(await bcrypt.compare(dto.password,u.PasswordHash)))throw new UnauthorizedException('Correo o contraseña incorrectos.');return this.issueTokens(u);}
 async refresh(token?:string){if(!token)throw new UnauthorizedException('No hay una sesión para renovar.');let p:any;try{p=await this.jwt.verifyAsync(token,{secret:process.env.JWT_REFRESH_SECRET});}catch{throw new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente.');}if(p.type!=='refresh'||!p.sub)throw new UnauthorizedException('Token inválido.');const [u]=await this.db.query('SELECT * FROM Users WHERE Id=? LIMIT 1',[p.sub]);if(!u||!u.IsActive||!u.RefreshTokenHash||hashToken(token)!==u.RefreshTokenHash)throw new UnauthorizedException('La sesión ya no es válida.');return this.issueTokens(u);}
 async logout(id:string){await this.db.execute('UPDATE Users SET RefreshTokenHash=NULL,UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[id]);return {success:true};}
 async me(id:string){const [u]=await this.db.query('SELECT Id,FullName,Email,Role,Phone,EmailVerifiedAt,IsActive,CreatedAt FROM Users WHERE Id=?',[id]);if(!u||!u.IsActive)throw new UnauthorizedException();return {id:u.Id,fullName:u.FullName,email:u.Email,role:u.Role,phone:u.Phone??null,emailVerified:!!u.EmailVerifiedAt,createdAt:u.CreatedAt};}
 async updateProfile(id:string,d:UpdateProfileDto){const sets:string[]=['UpdatedAt=UTC_TIMESTAMP()'];const params:any[]=[];if(d.fullName!==undefined){sets.push('FullName=?');params.push(d.fullName.trim());}if(d.phone!==undefined){sets.push('Phone=?');params.push(d.phone.trim()||null);}params.push(id);await this.db.execute(`UPDATE Users SET ${sets.join(',')} WHERE Id=?`,params);return this.me(id);}
 async verifyEmail(token:string){const [u]=await this.db.query('SELECT Id FROM Users WHERE EmailVerificationTokenHash=? AND EmailVerificationExpiresAt>UTC_TIMESTAMP() LIMIT 1',[hashToken(token)]);if(!u)throw new BadRequestException('El enlace no es válido o ya venció. Solicita uno nuevo.');await this.db.execute('UPDATE Users SET EmailVerifiedAt=UTC_TIMESTAMP(),EmailVerificationTokenHash=NULL,EmailVerificationExpiresAt=NULL,UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[u.Id]);return {success:true,message:'Correo verificado correctamente.'};}
 async resendVerification(email:string){const [u]=await this.db.query('SELECT Id FROM Users WHERE Email=? AND EmailVerifiedAt IS NULL LIMIT 1',[email.trim().toLowerCase()]);if(u){const raw=randomBytes(32).toString('hex');await this.db.execute('UPDATE Users SET EmailVerificationTokenHash=?,EmailVerificationExpiresAt=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 24 HOUR) WHERE Id=?',[hashToken(raw),u.Id]);this.devLink('VERIFICACIÓN DE CORREO',`/verificar-correo?token=${raw}`);}return {success:true,message:'Si la cuenta existe y requiere verificación, enviaremos instrucciones.'};}
 async requestPasswordReset(email:string){const [u]=await this.db.query('SELECT Id FROM Users WHERE Email=? LIMIT 1',[email.trim().toLowerCase()]);if(u){const raw=randomBytes(32).toString('hex');await this.db.execute('UPDATE Users SET PasswordResetTokenHash=?,PasswordResetExpiresAt=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 HOUR) WHERE Id=?',[hashToken(raw),u.Id]);this.devLink('RECUPERACIÓN DE CONTRASEÑA',`/restablecer-contrasena?token=${raw}`);}return {success:true,message:'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.'};}
 async resetPassword(token:string,password:string){const [u]=await this.db.query('SELECT Id FROM Users WHERE PasswordResetTokenHash=? AND PasswordResetExpiresAt>UTC_TIMESTAMP() LIMIT 1',[hashToken(token)]);if(!u)throw new BadRequestException('El enlace no es válido o ya venció. Solicita uno nuevo.');const passwordHash=await bcrypt.hash(password,12);await this.db.execute('UPDATE Users SET PasswordHash=?,PasswordResetTokenHash=NULL,PasswordResetExpiresAt=NULL,RefreshTokenHash=NULL,UpdatedAt=UTC_TIMESTAMP() WHERE Id=?',[passwordHash,u.Id]);return {success:true,message:'Contraseña actualizada. Inicia sesión nuevamente.'};}
 private devLink(label:string,path:string){if(process.env.NODE_ENV!=='production')console.info(`[Agencia EH · ${label}] ${process.env.WEB_ORIGIN||'http://localhost:3000'}${path}`);}
}
