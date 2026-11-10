import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateLeadDto {
  @IsUUID() propertyId!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsOptional() @IsString() @MaxLength(25) phone?: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
  @IsOptional() @IsIn(['MESSAGE', 'VISIT']) kind?: 'MESSAGE' | 'VISIT';
  @IsOptional() @IsDateString() visitAt?: string;
  /** Origen del prospecto (ficha, fanpage, facebook…) y campaña UTM. */
  @IsOptional() @IsString() @Matches(/^[a-z0-9_.-]{1,40}$/i) source?: string;
  @IsOptional() @IsString() @MaxLength(80) campaign?: string;
  /** Campo trampa anti-spam: debe venir vacío. */
  @IsOptional() @IsString() @MaxLength(200) website?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsIn(['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'CLOSED', 'LOST']) status?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsOptional() @IsDateString() visitAt?: string;
}

export class SaveSearchDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsObject() query!: Record<string, string>;
  @IsOptional() @Type(() => Boolean) @IsBoolean() alerts?: boolean;
}

export class UpdateSearchDto { @IsBoolean() alerts!: boolean; }

export class UpdateAgencyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(140) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(25) phone?: string;
}

export class UpdateAgentDto {
  @IsOptional() @IsString() @MaxLength(1000) bio?: string;
  @IsOptional() @IsString() @MaxLength(25) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
}
