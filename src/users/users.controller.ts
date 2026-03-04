import { Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  @Get('login')
  login(@Req() request: Request): string {
    return 'test'
  }
}
