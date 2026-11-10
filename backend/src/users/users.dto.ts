import { IsUUID, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsOptional() @IsString() @MaxLength(25) phone?: string;
  @IsIn(['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']) role!: 'BUYER' | 'AGENT' | 'AGENCY' | 'DEVELOPER' | 'ADMIN';
  @IsOptional() @IsString() @MaxLength(140) agencyName?: string;
  /** Agencia a la que pertenece un agente nuevo (opcional). */
  @IsOptional() @IsUUID() agencyId?: string;
}
