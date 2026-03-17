import type { StringValue } from 'ms';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // REGISTER
  async signup(dto: CreateUserDto) {
    return this.usersService.signup(dto);
  }

  // GENERATE BOTH TOKENS
  async generateTokens(payload: { sub: string; email: string; role: string }) {
    const [accessToken, refreshToken] = await Promise.all([
      // access token — short lived
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET as string,
        expiresIn: (process.env.JWT_EXPIRES_IN as StringValue) ?? '15m',
      }),

      // refresh token — long lived, different secret
      this.jwtService.signAsync(payload, {
        secret: process.env.REFRESH_TOKEN_SECRET as string,
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN as StringValue) ?? '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  // LOGIN
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const { id, email, role } = user;
    const payload = {
      sub: id,
      email,
      role,
    };

    const tokens = await this.generateTokens(payload);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // REFRESH TOKEN
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    try {
      // 1. Verify the refresh token using its own secret
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        role: string;
      }>(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET as string,
      });

      // 2. Check user still exists
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      // 3. Issue new tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      return this.generateTokens(newPayload);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // GET CURRENT USER
  async me(userId: string) {
    return this.usersService.findOne(userId);
  }
}
