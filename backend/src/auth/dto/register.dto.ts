import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
  /** Registro público: solo compradores/inquilinos. Las demás cuentas las crea el administrador. */
  @IsOptional() @IsIn(['BUYER'], { message: 'Solo los compradores pueden crear su cuenta. Las cuentas de agentes, agencias y desarrolladoras las crea el administrador de Agencia EH.' }) role?: 'BUYER';
  @IsOptional() @IsString() @MaxLength(120) agencyName?: string;
}
