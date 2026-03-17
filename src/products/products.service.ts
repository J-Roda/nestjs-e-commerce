// src/products/products.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';

import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { PRODUCT_INCLUDE } from './products.constants';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─────────────────────────────────────
  // CREATE PRODUCT WITH VARIANTS + SKUS
  // ─────────────────────────────────────
  async create(dto: CreateProductDto) {
    // 1. verify category exists
    await this.categoriesService.findOne(dto.categoryId);

    // 2. validate skuOptionValues match variant options
    const allOptionValues = dto.variants.flatMap(v => v.options.map(o => o.value));

    for (const sku of dto.skus) {
      for (const value of sku.optionValues) {
        if (!allOptionValues.includes(value)) {
          throw new BadRequestException(`SKU option value "${value}" does not match any variant option`);
        }
      }
    }

    // 3. create everything in a transaction
    return this.prisma.$transaction(async (tx: any) => {
      // 3a. create product
      const product = await tx.product.create({
        data: {
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          isActive: dto.isActive ?? true,
        },
      });

      // 3b. create variants and their options
      const createdOptions: Record<string, string> = {};
      // maps option value → option id for SKU linking

      for (const variant of dto.variants) {
        const createdVariant = await tx.productVariant.create({
          data: {
            name: variant.name,
            productId: product.id,
            options: {
              create: variant.options.map(o => ({ value: o.value })),
            },
          },
          include: { options: true },
        });

        // store option value → id mapping
        for (const option of createdVariant.options) {
          createdOptions[option.value] = option.id;
        }
      }

      // 3c. create SKUs with their option links
      for (const sku of dto.skus) {
        await tx.productSku.create({
          data: {
            productId: product.id,
            price: sku.price,
            stock: sku.stock,
            skuCode: sku.skuCode,
            options: {
              create: sku.optionValues.map(value => ({
                optionId: createdOptions[value],
              })),
            },
          },
        });
      }

      // 3d. return full product
      return tx.product.findUnique({
        where: { id: product.id },
        include: PRODUCT_INCLUDE,
      });
    });
  }

  // ─────────────────────────────────────
  // UPLOAD PRODUCT IMAGES
  // ─────────────────────────────────────
  async uploadImages(productId: string, files: Express.Multer.File[]) {
    // verify product exists
    await this.findOne(productId);

    if (!files || files.length === 0) {
      throw new BadRequestException('No images provided');
    }

    // check max images per product
    const existingCount = await this.prisma.productImage.count({
      where: { productId },
    });

    if (existingCount + files.length > 8) {
      throw new BadRequestException(`Maximum 8 images per product. Current: ${existingCount}`);
    }

    // upload all to Cloudinary in parallel
    const uploaded = await this.cloudinaryService.uploadImages(files, 'ecommerce/products');

    // determine order start
    const orderStart = existingCount;

    // save to database
    const images = await this.prisma.$transaction(
      uploaded.map((img, index) =>
        this.prisma.productImage.create({
          data: {
            productId,
            url: img.url,
            publicId: img.publicId,
            isMain: existingCount === 0 && index === 0, // first image is main
            order: orderStart + index,
          },
        }),
      ),
    );

    return images;
  }

  // ─────────────────────────────────────
  // DELETE PRODUCT IMAGE
  // ─────────────────────────────────────
  async deleteImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // delete from Cloudinary
    await this.cloudinaryService.deleteImage(image.publicId);

    // delete from database
    await this.prisma.productImage.delete({ where: { id: imageId } });

    // if deleted image was main, set first remaining as main
    if (image.isMain) {
      const firstImage = await this.prisma.productImage.findFirst({
        where: { productId },
        orderBy: { order: 'asc' },
      });

      if (firstImage) {
        await this.prisma.productImage.update({
          where: { id: firstImage.id },
          data: { isMain: true },
        });
      }
    }

    return { message: 'Image deleted successfully' };
  }

  // ─────────────────────────────────────
  // SET MAIN IMAGE
  // ─────────────────────────────────────
  async setMainImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // unset current main image
    await this.prisma.productImage.updateMany({
      where: { productId, isMain: true },
      data: { isMain: false },
    });

    // set new main image
    return this.prisma.productImage.update({
      where: { id: imageId },
      data: { isMain: true },
    });
  }

  // ─────────────────────────────────────
  // UPDATE SKU
  // ─────────────────────────────────────
  async updateSku(productId: string, skuId: string, dto: UpdateSkuDto) {
    const sku = await this.prisma.productSku.findFirst({
      where: { id: skuId, productId },
    });

    if (!sku) {
      throw new NotFoundException('SKU not found');
    }

    return this.prisma.productSku.update({
      where: { id: skuId },
      data: dto,
      include: {
        options: {
          include: {
            option: {
              select: {
                id: true,
                value: true,
                variant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  // ─────────────────────────────────────
  // GET ALL PRODUCTS
  // ─────────────────────────────────────
  async findAll(query: ProductQueryDto) {
    const { search, categoryId, page = 1, limit = 10, minPrice, maxPrice, isActive } = query;

    const where: any = {
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            skus: {
              some: {
                price: {
                  ...(minPrice !== undefined && { gte: minPrice }),
                  ...(maxPrice !== undefined && { lte: maxPrice }),
                },
              },
            },
          }
        : {}),
    };

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────
  // GET ONE PRODUCT
  // ─────────────────────────────────────
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    return product;
  }

  // ─────────────────────────────────────
  // UPDATE PRODUCT
  // ─────────────────────────────────────
  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    if (dto.categoryId) {
      await this.categoriesService.findOne(dto.categoryId);
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: PRODUCT_INCLUDE,
    });
  }

  // ─────────────────────────────────────
  // DELETE PRODUCT
  // ─────────────────────────────────────
  async remove(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // delete all images from Cloudinary first
    if (product.images.length > 0) {
      await this.cloudinaryService.deleteImages(product.images.map(img => img.publicId));
    }

    await this.prisma.product.delete({ where: { id } });
    return { message: 'Product deleted successfully' };
  }
}
