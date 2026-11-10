import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { DEMO_PATH_RE, MEDIA_PATH_RE } from '../../uploads/media';

/** Foto: enlace http(s), foto subida o foto de ejemplo del sitio. */
export const IMAGE_REF = new RegExp(`^(https?://\\S{3,2040}|${MEDIA_PATH_RE.source.slice(1, -1)}|${DEMO_PATH_RE.source.slice(1, -1)})$`);
export const OPERATIONS = ['RENT', 'SALE', 'BOTH'] as const;
export const CATEGORIES = ['Residencial', 'Comercial', 'Industrial', 'Terreno', 'Vacacional'] as const;

export class CreatePropertyDto {
  @IsString() @MinLength(8) @MaxLength(180) title!: string;
  @IsString() @MinLength(30) description!: string;
  /** RENT = renta, SALE = venta, BOTH = venta y renta. */
  @IsIn(OPERATIONS) operation!: 'RENT' | 'SALE' | 'BOTH';
  /** Precio de venta (SALE/BOTH) o renta mensual (RENT). */
  @Type(() => Number) @IsNumber() @Min(1) price!: number;
  /** Renta mensual cuando la operación es BOTH. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) rentPrice?: number;
  @IsOptional() @IsIn(CATEGORIES) category?: string;
  @IsString() @MinLength(2) municipality!: string;
  @IsOptional() @IsString() neighborhood?: string;
  @IsString() @MinLength(2) propertyType!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(30) bedrooms?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(30) bathrooms?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) landArea?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) builtArea?: number;
  @IsOptional() @IsDateString() availableFrom?: string;
  /** Ubicación en el mapa (OpenStreetMap). Sin ShowExactLocation se muestra aproximada (~1 km). */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude?: number | null;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude?: number | null;
  @IsOptional() @IsBoolean() showExactLocation?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @Matches(IMAGE_REF, { each: true, message: 'Cada foto debe ser un enlace http(s) o una foto subida.' }) images?: string[];
  /** Etiqueta de cada foto, en el mismo orden que images (Fachada, Sala, Plano…). */
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MaxLength(40, { each: true }) imageLabels?: string[];
  /** Campos personalizados: { claveDelCampo: valor }. */
  @IsOptional() @IsObject() custom?: Record<string, string | number | boolean | null>;
}
