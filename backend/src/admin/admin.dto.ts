import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsIn(['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']) role?: 'BUYER' | 'AGENT' | 'AGENCY' | 'DEVELOPER' | 'ADMIN';
  @IsOptional() @IsIn(['APPROVED', 'REJECTED', 'PENDING']) approval?: 'APPROVED' | 'REJECTED' | 'PENDING';
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) fullName?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MaxLength(25) phone?: string;
}

export class SetPasswordDto {
  @IsString() @MinLength(10) @MaxLength(72) password!: string;
}

export class DeleteUserDto {
  /** El correo del usuario, escrito a mano como confirmación. */
  @IsEmail() confirmEmail!: string;
}

export class CreatePaymentDto {
  @IsUUID() userId!: string;
  @IsString() @MinLength(2) @MaxLength(60) plan!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(1) @Max(9999999999) amount!: number;
  @IsIn(['CASH', 'TRANSFER']) method!: 'CASH' | 'TRANSFER';
  @IsOptional() @IsString() @MaxLength(120) reference?: string;
  @IsDateString() paidAt!: string;
  @IsDateString() periodStart!: string;
  @IsDateString() periodEnd!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
