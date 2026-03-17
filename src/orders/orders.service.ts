import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Role } from '../common/enums/role.enum';
import { ORDER_INCLUDE } from './orders.constants';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────
  // CREATE ORDER DIRECTLY
  // (without cart — direct buy now)
  // ─────────────────────────────────────
  async create(userId: string, dto: CreateOrderDto) {
    // 1. fetch all SKUs in one query
    const skuIds = dto.items.map(item => item.skuId);

    const skus = await this.prisma.productSku.findMany({
      where: { id: { in: skuIds } },
      include: {
        product: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    // 2. verify all SKUs exist
    if (skus.length !== skuIds.length) {
      throw new NotFoundException('One or more product variants not found');
    }

    // 3. check stock and calculate total
    let total = 0;

    for (const item of dto.items) {
      const sku = skus.find(s => s.id === item.skuId);

      if (!sku) {
        throw new NotFoundException(`Product variant ${item.skuId} not found`);
      }

      if (!sku.product.isActive) {
        throw new BadRequestException(`Product "${sku.product.name}" is no longer available`);
      }

      if (sku.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for variant "${item.skuId}". Available: ${sku.stock}`);
      }

      // use SKU price for total
      total += Number(sku.price) * item.quantity;
    }

    // 4. create order + reduce stock in transaction
    const order = await this.prisma.$transaction(async (tx: any) => {
      // 4a. create order with items
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          items: {
            create: dto.items.map(item => {
              const sku = skus.find(s => s.id === item.skuId)!;
              return {
                productId: sku.product.id, // snapshot product
                skuId: item.skuId, // snapshot sku
                quantity: item.quantity,
                price: sku.price, // snapshot price at purchase
              };
            }),
          },
        },
        include: ORDER_INCLUDE,
      });

      // 4b. reduce stock per SKU
      for (const item of dto.items) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  // ─────────────────────────────────────
  // GET ALL ORDERS (admin only)
  // ─────────────────────────────────────
  async findAll() {
    return this.prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────
  // GET MY ORDERS
  // ─────────────────────────────────────
  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────
  // GET ONE ORDER
  // ─────────────────────────────────────
  async findOne(id: string, requestingUser: { id: string; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    // customers can only see their own orders
    const isAdmin = [Role.ADMIN, Role.SUPER_ADMIN].includes(requestingUser.role as Role);

    if (!isAdmin && order.userId !== requestingUser.id) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  // ─────────────────────────────────────
  // UPDATE ORDER STATUS (admin only)
  // ─────────────────────────────────────
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a cancelled order');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: dto.status },
      include: ORDER_INCLUDE,
    });
  }

  // ─────────────────────────────────────
  // CANCEL ORDER
  // ─────────────────────────────────────
  async cancel(id: string, requestingUser: { id: string; role: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    // customers can only cancel their own orders
    const isAdmin = [Role.ADMIN, Role.SUPER_ADMIN].includes(requestingUser.role as Role);

    if (!isAdmin && order.userId !== requestingUser.id) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}". Only PENDING orders can be cancelled.`,
      );
    }

    // restore SKU stock when cancelled
    return this.prisma.$transaction(async (tx: any) => {
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: id },
      });

      // restore stock per SKU  👈 changed from product to sku
      for (const item of orderItems) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: { stock: { increment: item.quantity } },
        });
      }

      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: ORDER_INCLUDE,
      });
    });
  }
}
