import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
export class CreatePropertyDto {
 @IsString() @MinLength(8) title!:string; @IsString() @MinLength(30) description!:string; @IsIn(['RENT','SALE']) operation!:'RENT'|'SALE';
 @Type(()=>Number) @IsNumber() @Min(1) price!:number; @IsString() @MinLength(2) municipality!:string; @IsOptional() @IsString() neighborhood?:string; @IsString() @MinLength(2) propertyType!:string;
 @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(30) bedrooms?:number; @IsOptional() @Type(()=>Number) @IsInt() @Min(0) @Max(30) bathrooms?:number;
 @IsOptional() @Type(()=>Number) @IsNumber() @Min(0) landArea?:number; @IsOptional() @Type(()=>Number) @IsNumber() @Min(0) builtArea?:number; @IsOptional() @IsArray() @IsUrl({}, {each:true}) images?:string[];
}
