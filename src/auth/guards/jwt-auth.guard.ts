// src/auth/guards/jwt-auth.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// This guard protects routes — just add @UseGuards(JwtAuthGuard) to any route
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
