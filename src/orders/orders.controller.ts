import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders ← direct buy now (skip cart)
  @Post()
  create(@Request() req: { user: { id: string } }, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, dto);
  }

  // GET /orders ← admin only
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  // GET /orders/my-orders ← must be before :id
  @Get('my-orders')
  findMyOrders(@Request() req: { user: { id: string } }) {
    return this.ordersService.findMyOrders(req.user.id);
  }

  // GET /orders/:id
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { id: string; role: string } }) {
    return this.ordersService.findOne(id, req.user);
  }

  // PATCH /orders/:id/status ← admin only
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  // DELETE /orders/:id ← customer cancels own, admin cancels any
  @Delete(':id')
  cancel(@Param('id') id: string, @Request() req: { user: { id: string; role: string } }) {
    return this.ordersService.cancel(id, req.user);
  }
}
