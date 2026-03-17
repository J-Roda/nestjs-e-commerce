import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { name: dto.name } });

    if (existing) throw new ConflictException('Category name already exist');

    return this.prisma.category.create({
      data: { name: dto.name },
    });
  }

  // ─────────────────────────────────────
  // GET ALL
  // ─────────────────────────────────────
  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }, // shows how many products per category
        },
      },
    });
  }

  // ─────────────────────────────────────
  // GET ONE
  // ─────────────────────────────────────
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          omit: {
            categoryId: true, // 👈 omit what you don't need
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }

    return category;
  }

  // ─────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────
  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id); // throws 404 if not found

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  // ─────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────
  async remove(id: string) {
    await this.findOne(id); // throws 404 if not found

    // check if category has products before deleting
    const productCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new ConflictException(
        `Cannot delete category with ${productCount} products. Move or delete products first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}
