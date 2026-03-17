import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CategoriesModule } from '../categories/categories.module';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    CategoriesModule, // 👈 gives us access to CategoriesService
  ],
  controllers: [ProductsController],
  providers: [ProductsService, RolesGuard],
  exports: [ProductsService], // exported so OrdersModule can use it later
})
export class ProductsModule {}
