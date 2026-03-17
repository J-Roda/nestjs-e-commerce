import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VariantOptionDto {
  @IsString()
  @IsNotEmpty()
  value: string; // e.g. "Black", "128GB"
}

export class ProductVariantDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g. "Color", "Storage"

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantOptionDto)
  options: VariantOptionDto[];
}

export class SkuDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  price: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock: number;

  @IsOptional()
  @IsString()
  skuCode?: string; // e.g. "IPH15-BLK-128"

  // maps to variant option values
  // e.g. ["Black", "128GB"]
  @IsArray()
  @IsString({ each: true })
  optionValues: string[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkuDto)
  skus: SkuDto[];
}
