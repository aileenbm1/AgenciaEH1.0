import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
  @IsIn(['BUYER', 'AGENT', 'AGENCY']) role!: 'BUYER' | 'AGENT' | 'AGENCY';
  @IsOptional() @IsString() @MaxLength(120) agencyName?: string;
}
