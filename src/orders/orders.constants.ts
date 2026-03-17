export const ORDER_INCLUDE = {
  user: {
    select: { id: true, name: true, email: true },
  },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          images: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      sku: {
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
  },
} as const;
