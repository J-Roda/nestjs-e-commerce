import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU ID is required' })
  skuId: string; // 👈 changed from productId to skuId

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  quantity?: number = 1;
}
