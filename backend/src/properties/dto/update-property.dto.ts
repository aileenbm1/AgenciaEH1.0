import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ArrayMaxSize, Matches } from 'class-validator';
import { MEDIA_PATH_RE } from '../../uploads/media';
const IMAGE_REF = new RegExp(`^(https?://\\S{3,2040}|${MEDIA_PATH_RE.source.slice(1, -1)})$`);
export class UpdatePropertyDto {
 @IsOptional() @IsString() @MinLength(8) title?:string;
 @IsOptional() @IsString() @MinLength(30) description?:string;
 @IsOptional() @IsIn(['RENT','SALE']) operation?:'RENT'|'SALE';
 @IsOptional() @Type(()=>Number) @IsNumber() @Min(1) price?:number;
 @IsOptional() @IsString() @MinLength(2) municipality?:string;
 @IsOptional() @IsString() neighborhood?:string;
 @IsOptional() @IsString() @MinLength(2) propertyType?:string;
 @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(30) bedrooms?:number;
 @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(30) bathrooms?:number;
 @IsOptional() @Type(()=>Number) @IsNumber() @Min(0) landArea?:number;
 @IsOptional() @Type(()=>Number) @IsNumber() @Min(0) builtArea?:number;
 @IsOptional() @IsArray() @ArrayMaxSize(20) @Matches(IMAGE_REF, {each:true, message:'Cada foto debe ser un enlace http(s) o una foto subida.'}) images?:string[];
}
