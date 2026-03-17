export const CART_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          images: {
            where: { isMain: true }, // only return main image
            select: { url: true },
            take: 1,
          },
        },
      },
      sku: {
        // 👈 include sku details
        include: {
          options: {
            include: {
              option: {
                select: {
                  value: true,
                  variant: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;
