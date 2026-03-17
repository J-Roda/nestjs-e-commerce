// src/products/products.constants.ts

export const PRODUCT_INCLUDE = {
  category: {
    select: { id: true, name: true },
  },
  images: {
    orderBy: { order: 'asc' as const },
    select: {
      id: true,
      url: true,
      publicId: true,
      isMain: true,
      order: true,
    },
  },
  variants: {
    include: {
      options: {
        select: {
          id: true,
          value: true,
        },
      },
    },
  },
  skus: {
    include: {
      options: {
        include: {
          option: {
            select: {
              id: true,
              value: true,
              variant: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  },
} as const;
