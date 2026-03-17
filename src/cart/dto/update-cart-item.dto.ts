import { IsInt, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @IsInt()
  @IsPositive()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Type(() => Number)
  quantity: number;
}
