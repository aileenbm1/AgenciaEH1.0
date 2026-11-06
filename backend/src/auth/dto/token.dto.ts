import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
export class EmailDto { @IsEmail() email!: string; }
export class TokenDto { @IsString() token!: string; }
export class ResetPasswordDto { @IsString() token!: string; @IsString() @MinLength(10) @MaxLength(72) password!: string; }
