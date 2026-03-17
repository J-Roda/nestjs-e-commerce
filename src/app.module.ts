import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
// import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
// import { AuthController } from './auth/auth.controller';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CartController } from './cart/cart.controller';
import { CartService } from './cart/cart.service';
import { CartModule } from './cart/cart.module';
import { CloudinaryService } from './common/services/cloudinary.service';
import { CloudinaryModule } from './common/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // 👈 explicitly point to .env
    }),

    // rate limiting — max 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000, // 1 minute in milliseconds
        limit: 100, // max requests per ttl
      },
    ]),

    UsersModule,
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    CartModule,
    CloudinaryModule,
  ],
  controllers: [CartController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 👈 applies rate limiting globally
    },
    CartService,
    CloudinaryService,
  ],
})
export class AppModule {}
