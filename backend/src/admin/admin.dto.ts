import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional() @IsIn(['BUYER', 'AGENT', 'AGENCY', 'ADMIN']) role?: 'BUYER' | 'AGENT' | 'AGENCY' | 'ADMIN';
  @IsOptional() @IsBoolean() isActive?: boolean;
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
