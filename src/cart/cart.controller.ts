import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // POST /cart ← create cart for user
  @Post()
  createCart(@Request() req: { user: { id: string } }) {
    return this.cartService.createCart(req.user.id);
  }

  // GET /cart ← get current user's cart
  @Get()
  getCart(@Request() req: { user: { id: string } }) {
    return this.cartService.getCart(req.user.id);
  }

  // POST /cart/items ← add item to cart
  @Post('items')
  addItem(@Request() req: { user: { id: string } }, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(req.user.id, dto);
  }

  // PATCH /cart/items/:itemId ← update quantity
  @Patch('items/:itemId')
  updateItem(
    @Request() req: { user: { id: string } },
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.id, itemId, dto);
  }

  // DELETE /cart/items/:itemId ← remove item
  @Delete('items/:itemId')
  removeItem(@Request() req: { user: { id: string } }, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(req.user.id, itemId);
  }

  // DELETE /cart ← clear entire cart
  @HttpCode(HttpStatus.OK)
  @Delete()
  clearCart(@Request() req: { user: { id: string } }) {
    return this.cartService.clearCart(req.user.id);
  }

  // POST /cart/checkout ← place order
  @Post('checkout')
  checkout(@Request() req: { user: { id: string } }) {
    return this.cartService.checkout(req.user.id);
  }
}
