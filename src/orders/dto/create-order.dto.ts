import { IsArray, IsNotEmpty, IsString, IsInt, IsPositive, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU ID is required' })
  skuId: string; // 👈 changed from productId to skuId

  @IsInt({ message: 'Quantity must be a whole number' })
  @IsPositive({ message: 'Quantity must be greater than 0' })
  quantity: number;
}

export class CreateOrderDto {
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Order must have at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
