import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import type { Request as ExpressRequest, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// cookie options reused across routes
const ACCESS_TOKEN_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_TOKEN_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/auth/refresh', // 👈 only sent to this specific route
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/signup
  @Post('signup')
  signup(@Body() dto: CreateUserDto) {
    return this.authService.signup(dto);
  }

  // POST /auth/login
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    console.log(dto);
    const { accessToken, refreshToken, user } = await this.authService.login(dto);

    res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE);

    return {
      message: 'Login successful',
      user,
    };
  }

  // POST /auth/refresh ← issues new access_token using refresh_token
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string;

    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refresh(refreshToken);

    // rotate both tokens — old refresh token replaced with new one
    res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE);
    res.cookie('refresh_token', newRefreshToken, REFRESH_TOKEN_COOKIE);

    return { message: 'Tokens refreshed successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', ACCESS_TOKEN_COOKIE);
    res.clearCookie('refresh_token', REFRESH_TOKEN_COOKIE);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.authService.me(req.user.id);
  }
}
