import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CART_INCLUDE } from './cart.constants';
import { formatCart } from './cart.helpers';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────
  // CREATE CART
  // ─────────────────────────────────────
  async createCart(userId: string) {
    const existing = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Cart already exists for this user');
    }

    const cart = await this.prisma.cart.create({
      data: { userId },
      include: CART_INCLUDE,
    });

    return formatCart(cart);
  }

  // ─────────────────────────────────────
  // GET CART
  // ─────────────────────────────────────
  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: CART_INCLUDE,
    });

    if (!cart) {
      throw new NotFoundException('Cart not found. Please create a cart first.');
    }

    return formatCart(cart);
  }

  // ─────────────────────────────────────
  // ADD ITEM TO CART
  // ─────────────────────────────────────
  async addItem(userId: string, dto: AddToCartDto) {
    // 1. verify cart exists
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found. Please create a cart first.');
    }

    // 2. verify SKU exists and has enough stock  👈 changed from product to sku
    const sku = await this.prisma.productSku.findUnique({
      where: { id: dto.skuId },
      include: {
        product: {
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    if (!sku) {
      throw new NotFoundException('Product variant not found');
    }

    if (!sku.product.isActive) {
      throw new BadRequestException('Product is no longer available');
    }

    if (sku.stock < (dto.quantity ?? 1)) {
      throw new BadRequestException(`Insufficient stock. Available: ${sku.stock}`);
    }

    // 3. check if this SKU already in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_skuId: {
          // 👈 changed from cartId_productId
          cartId: cart.id,
          skuId: dto.skuId,
        },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + (dto.quantity ?? 1);

      if (newQuantity > sku.stock) {
        throw new BadRequestException(`Cannot add more. Max available stock: ${sku.stock}`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: sku.product.id, // 👈 still store productId for reference
          skuId: dto.skuId,
          quantity: dto.quantity ?? 1,
        },
      });
    }

    return this.getCart(userId);
  }

  // ─────────────────────────────────────
  // UPDATE ITEM QUANTITY
  // ─────────────────────────────────────
  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId },
      },
      include: {
        sku: true, // 👈 check stock from sku
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity > cartItem.sku.stock) {
      throw new BadRequestException(`Insufficient stock. Available: ${cartItem.sku.stock}`);
    }

    await this.prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  // ─────────────────────────────────────
  // REMOVE ITEM FROM CART
  // ─────────────────────────────────────
  async removeItem(userId: string, cartItemId: string) {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: cartItemId,
        cart: { userId },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });

    return this.getCart(userId);
  }

  // ─────────────────────────────────────
  // CLEAR ENTIRE CART
  // ─────────────────────────────────────
  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { message: 'Cart cleared successfully' };
  }

  // ─────────────────────────────────────
  // CHECKOUT
  // ─────────────────────────────────────
  async checkout(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            sku: true, // 👈 get price + stock from sku
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty. Add items before checking out.');
    }

    // validate stock from SKU
    for (const item of cart.items) {
      if (item.sku.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${item.product.name}". Available: ${item.sku.stock}`);
      }
    }

    // calculate total from SKU price
    const total = cart.items.reduce((sum, item) => {
      return sum + Number(item.sku.price) * item.quantity; // 👈 sku.price
    }, 0);

    const order = await this.prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          total,
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              skuId: item.skuId,
              quantity: item.quantity,
              price: item.sku.price, // 👈 snapshot sku price at checkout
            })),
          },
        },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
              sku: {
                include: {
                  options: {
                    include: {
                      option: {
                        select: {
                          value: true,
                          variant: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // reduce stock per SKU
      for (const item of cart.items) {
        await tx.productSku.update({
          where: { id: item.skuId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // clear cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return newOrder;
    });

    return {
      message: 'Order placed successfully',
      order,
    };
  }
}
