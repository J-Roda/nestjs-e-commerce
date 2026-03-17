import { Decimal } from '@prisma/client/runtime/index-browser';

export interface CartSku {
  id: string;
  price: Decimal;
  stock: number;
  options: {
    option: {
      value: string;
      variant: { name: string };
    };
  }[];
}

export interface CartItemProduct {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[];
}

export interface CartItemWithProduct {
  id: string;
  quantity: number;
  cartId: string;
  productId: string;
  skuId: string;
  createdAt: Date;
  updatedAt: Date;
  product: CartItemProduct;
  sku: CartSku; // 👈 added sku
}

export interface RawCart {
  id: string;
  items: CartItemWithProduct[];
}

export interface FormattedCart {
  id: string;
  items: CartItemWithProduct[];
  itemCount: number;
  total: number;
}

export function formatCart(cart: RawCart): FormattedCart {
  const total = cart.items.reduce(
    (sum, item) => sum + Number(item.sku.price) * item.quantity, // 👈 sku.price
    0,
  );

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: cart.id,
    items: cart.items,
    itemCount,
    total: Number(total.toFixed(2)),
  };
}
