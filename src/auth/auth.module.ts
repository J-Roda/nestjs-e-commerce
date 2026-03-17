import { type StringValue } from 'ms';
// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    // UsersModule is needed because AuthService uses UsersService
    UsersModule,

    // Register Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Register JWT with secret and expiry
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN as StringValue) ?? '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // 👈 must be a provider so NestJS can inject it
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard], // export guard so other modules can use it
})
export class AuthModule {}
