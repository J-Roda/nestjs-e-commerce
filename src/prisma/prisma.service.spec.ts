// src/prisma/prisma.service.ts

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Called automatically when the NestJS app starts
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  // Called automatically when the NestJS app shuts down
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }
}
