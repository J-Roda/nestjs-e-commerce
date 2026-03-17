import { IsEnum, IsNotEmpty } from 'class-validator';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message: 'Status must be PENDING, PAID, SHIPPED, DELIVERED or CANCELLED',
  })
  @IsNotEmpty()
  status: OrderStatus;
}
