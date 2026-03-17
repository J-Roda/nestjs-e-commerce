import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from 'generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // SIGNUP USER
  async signup(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
    });

    await this.prisma.cart.create({
      data: { userId: user.id },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // GET ALL USERS (admin use)
  async findAll() {
    return this.prisma.user.findMany({
      omit: {
        password: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: {
        password: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  // GET USER BY EMAIL (used by AuthModule)
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
    // Note: this one DOES return the password
    // because AuthModule needs it to verify login
  }

  // UPDATE USER
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      omit: {
        password: true,
        createdAt: true,
      },
    });
  }

  // DELETE USER
  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.user.delete({ where: { id } });
    return { message: `User ${id} deleted successfully` };
  }

  // UPDATE USER ROLE
  async updateRole(id: string, role: Role) {
    await this.findOne(id);

    // 2. Update the role
    return this.prisma.user.update({
      where: { id },
      data: { role },
      omit: { password: true },
    });
  }
}
