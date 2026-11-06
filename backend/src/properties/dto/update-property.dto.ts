import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
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
 @IsOptional() @IsArray() @IsUrl({}, {each:true}) images?:string[];
}
