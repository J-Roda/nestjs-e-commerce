# 🛒 NestJS E-Commerce Backend API

A scalable e-commerce REST API built with **NestJS**, **Prisma 7**, and **PostgreSQL**. Supports product variants (Shopee-style), cart management, JWT authentication with refresh tokens, image uploads via Cloudinary, and role-based access control.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Users](#users)
  - [Categories](#categories)
  - [Products](#products)
  - [Cart](#cart)
  - [Orders](#orders)
- [Request & Response Format](#request--response-format)
- [Error Handling](#error-handling)
- [Roles & Permissions](#roles--permissions)
- [Product Variants & SKUs](#product-variants--skus)
- [Image Upload](#image-upload)

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| NestJS | Backend framework |
| Prisma 7 | ORM |
| PostgreSQL | Database |
| JWT | Authentication |
| bcrypt | Password hashing |
| Cloudinary | Image hosting |
| class-validator | Request validation |

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd nestjs-e-commerce

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env
# Fill in your values in .env

# 4. Run database migrations
npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. Start the server
npm run start:dev
```

Server runs at: `http://localhost:3000`

---

## 🔐 Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nestjs_e_commerce?schema=e_commerce"

JWT_SECRET="your-access-token-secret"
JWT_EXPIRES_IN="15m"

REFRESH_TOKEN_SECRET="your-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

NODE_ENV="development"
PORT=3000

CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

---

## 🔑 Authentication

This API uses **JWT stored in HTTP-only cookies**. There are two tokens:

| Token | Cookie Name | Lifespan | Purpose |
|---|---|---|---|
| Access Token | `access_token` | 15 minutes | Authenticate requests |
| Refresh Token | `refresh_token` | 7 days | Get new access token |

### How it works

```
1. POST /auth/login
   → Server sets access_token cookie (15min)
   → Server sets refresh_token cookie (7 days, path: /auth/refresh only)

2. Every request
   → Browser/client sends access_token cookie automatically

3. When access_token expires (after 15min)
   → POST /auth/refresh
   → Server validates refresh_token
   → Issues new access_token + new refresh_token

4. POST /auth/logout
   → Server clears both cookies
```

### Frontend Setup

For **axios**, enable cookies:
```javascript
const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true, // 👈 required for cookies
});
```

For **fetch**:
```javascript
fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  credentials: 'include', // 👈 required for cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

### Auto Refresh Token (Axios Interceptor)

```javascript
// Automatically refresh token when access_token expires
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await api.post('/auth/refresh');
        return api.request(error.config); // retry original request
      } catch {
        // refresh failed — redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 📡 API Endpoints

### Base URL
```
http://localhost:3000
```

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Register new user |
| POST | `/auth/login` | Public | Login, sets cookies |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Public | Logout, clears cookies |
| GET | `/auth/me` | 🔒 Required | Get current user |

#### POST `/auth/signup`
```json
// Request Body
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Secret123"
}

// Password Rules:
// - Min 8 characters
// - Max 32 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 number

// Response 201
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "createdAt": "2026-03-09T10:00:00.000Z"
  }
}
```

#### POST `/auth/login`
```json
// Request Body
{
  "email": "john@example.com",
  "password": "Secret123"
}

// Response 200
// Sets cookies: access_token, refresh_token
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": "Login successful",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER"
    }
  }
}
```

#### POST `/auth/refresh`
```json
// No body needed — uses refresh_token cookie automatically

// Response 200
// Sets new cookies: access_token, refresh_token
{
  "success": true,
  "data": {
    "message": "Tokens refreshed successfully"
  }
}
```

#### POST `/auth/logout`
```json
// No body needed

// Response 200
// Clears both cookies
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### Users

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/users` | Public | Any | Create user (alternative signup) |
| GET | `/users` | 🔒 Required | ADMIN+ | Get all users |
| GET | `/users/:id` | 🔒 Required | ADMIN+ | Get user by ID |
| PATCH | `/users/:id` | 🔒 Required | Any | Update own profile |
| PATCH | `/users/:id/role` | 🔒 Required | SUPER_ADMIN | Update user role |
| DELETE | `/users/:id` | 🔒 Required | ADMIN+ | Delete user |

#### PATCH `/users/:id/role`
```json
// Request Body
{
  "role": "ADMIN"  // CUSTOMER | ADMIN | SUPER_ADMIN
}
```

---

### Categories

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/categories` | 🔒 Required | ADMIN+ | Create category |
| GET | `/categories` | Public | Any | Get all categories |
| GET | `/categories/:id` | Public | Any | Get category with products |
| PATCH | `/categories/:id` | 🔒 Required | ADMIN+ | Update category |
| DELETE | `/categories/:id` | 🔒 Required | ADMIN+ | Delete category |

#### POST `/categories`
```json
// Request Body
{
  "name": "Electronics"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "createdAt": "2026-03-09T10:00:00.000Z"
  }
}
```

---

### Products

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/products` | 🔒 Required | ADMIN+ | Create product with variants |
| GET | `/products` | Public | Any | Get all products (with filters) |
| GET | `/products/:id` | Public | Any | Get product details |
| PATCH | `/products/:id` | 🔒 Required | ADMIN+ | Update product info |
| DELETE | `/products/:id` | 🔒 Required | ADMIN+ | Delete product |
| POST | `/products/:id/images` | 🔒 Required | ADMIN+ | Upload images (max 8) |
| DELETE | `/products/:id/images/:imageId` | 🔒 Required | ADMIN+ | Delete image |
| PATCH | `/products/:id/images/:imageId/main` | 🔒 Required | ADMIN+ | Set main image |
| PATCH | `/products/:id/skus/:skuId` | 🔒 Required | ADMIN+ | Update SKU price/stock |

#### POST `/products`
```json
// Request Body
{
  "name": "iPhone 15 Pro",
  "description": "Latest Apple flagship phone",
  "categoryId": "category-uuid",
  "isActive": true,
  "variants": [
    {
      "name": "Color",
      "options": [
        { "value": "Black" },
        { "value": "White" }
      ]
    },
    {
      "name": "Storage",
      "options": [
        { "value": "128GB" },
        { "value": "256GB" }
      ]
    }
  ],
  "skus": [
    { "price": 999.99, "stock": 10, "skuCode": "IPH15-BLK-128", "optionValues": ["Black", "128GB"] },
    { "price": 1099.99, "stock": 5, "skuCode": "IPH15-BLK-256", "optionValues": ["Black", "256GB"] },
    { "price": 999.99, "stock": 8, "skuCode": "IPH15-WHT-128", "optionValues": ["White", "128GB"] },
    { "price": 1099.99, "stock": 3, "skuCode": "IPH15-WHT-256", "optionValues": ["White", "256GB"] }
  ]
}
```

#### GET `/products` — Query Parameters

| Param | Type | Description | Example |
|---|---|---|---|
| `search` | string | Search by name | `?search=iphone` |
| `categoryId` | string | Filter by category | `?categoryId=uuid` |
| `minPrice` | number | Min SKU price | `?minPrice=500` |
| `maxPrice` | number | Max SKU price | `?maxPrice=1000` |
| `isActive` | boolean | Filter active/inactive | `?isActive=true` |
| `page` | number | Page number (default: 1) | `?page=2` |
| `limit` | number | Items per page (default: 10) | `?limit=20` |

```
GET /products?search=iphone&categoryId=uuid&minPrice=500&page=1&limit=10
```

#### Product Response Shape
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "name": "iPhone 15 Pro",
        "description": "Latest Apple flagship phone",
        "isActive": true,
        "category": { "id": "uuid", "name": "Electronics" },
        "images": [
          {
            "id": "uuid",
            "url": "https://res.cloudinary.com/...",
            "isMain": true,
            "order": 0
          }
        ],
        "variants": [
          {
            "id": "uuid",
            "name": "Color",
            "options": [
              { "id": "uuid", "value": "Black" },
              { "id": "uuid", "value": "White" }
            ]
          }
        ],
        "skus": [
          {
            "id": "sku-uuid",
            "price": "999.99",
            "stock": 10,
            "skuCode": "IPH15-BLK-128",
            "options": [
              {
                "option": {
                  "id": "uuid",
                  "value": "Black",
                  "variant": { "id": "uuid", "name": "Color" }
                }
              }
            ]
          }
        ]
      }
    ],
    "meta": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

#### POST `/products/:id/images`
```
Content-Type: multipart/form-data

Key: images
Type: File
Value: select one or more image files (max 8 total per product)

Rules:
- Allowed types: JPEG, PNG, WebP
- Max file size: 2MB per image
- Max 8 images per product
- First uploaded image becomes the main image automatically
```

#### PATCH `/products/:id/skus/:skuId`
```json
// Request Body (all fields optional)
{
  "price": 949.99,
  "stock": 20,
  "skuCode": "IPH15-BLK-128-SALE"
}
```

---

### Cart

> ⚠️ All cart endpoints require authentication.
> A cart is automatically created when a user signs up.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/cart` | 🔒 Required | Create cart (already auto-created on signup) |
| GET | `/cart` | 🔒 Required | Get current user's cart |
| POST | `/cart/items` | 🔒 Required | Add item to cart |
| PATCH | `/cart/items/:itemId` | 🔒 Required | Update item quantity |
| DELETE | `/cart/items/:itemId` | 🔒 Required | Remove item from cart |
| DELETE | `/cart` | 🔒 Required | Clear entire cart |
| POST | `/cart/checkout` | 🔒 Required | Checkout — creates order |

#### POST `/cart/items`
```json
// Request Body
// skuId = the specific variant the customer selected
// (e.g. iPhone 15 Pro - Black - 128GB)
{
  "skuId": "sku-uuid",
  "quantity": 2
}
```

#### Cart Response Shape
```json
{
  "success": true,
  "data": {
    "id": "cart-uuid",
    "itemCount": 3,
    "total": 2999.97,
    "items": [
      {
        "id": "cart-item-uuid",
        "quantity": 2,
        "product": {
          "id": "product-uuid",
          "name": "iPhone 15 Pro",
          "description": "Latest Apple flagship",
          "images": [{ "url": "https://res.cloudinary.com/..." }]
        },
        "sku": {
          "id": "sku-uuid",
          "price": "999.99",
          "stock": 8,
          "options": [
            { "option": { "value": "Black", "variant": { "name": "Color" } } },
            { "option": { "value": "128GB", "variant": { "name": "Storage" } } }
          ]
        }
      }
    ]
  }
}
```

#### POST `/cart/checkout`
```json
// No body needed — uses current cart

// Response 201
{
  "success": true,
  "data": {
    "message": "Order placed successfully",
    "order": {
      "id": "order-uuid",
      "status": "PENDING",
      "total": "1999.98",
      "items": [...]
    }
  }
}
```

---

### Orders

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/orders` | 🔒 Required | Any | Direct buy (skip cart) |
| GET | `/orders` | 🔒 Required | ADMIN+ | Get all orders |
| GET | `/orders/my-orders` | 🔒 Required | Any | Get my orders |
| GET | `/orders/:id` | 🔒 Required | Any* | Get order details |
| PATCH | `/orders/:id/status` | 🔒 Required | ADMIN+ | Update order status |
| DELETE | `/orders/:id` | 🔒 Required | Any* | Cancel order |

> *Customers can only view/cancel their own orders. Admins can view/cancel any order.

#### POST `/orders` — Direct Buy (Skip Cart)
```json
// Request Body
{
  "items": [
    { "skuId": "sku-uuid", "quantity": 1 },
    { "skuId": "another-sku-uuid", "quantity": 2 }
  ]
}
```

#### Order Status Flow
```
PENDING → PAID → SHIPPED → DELIVERED
   ↓
CANCELLED (only from PENDING)
```

#### PATCH `/orders/:id/status`
```json
// Request Body
{
  "status": "PAID"  // PENDING | PAID | SHIPPED | DELIVERED | CANCELLED
}
```

#### Order Response Shape
```json
{
  "success": true,
  "data": {
    "id": "order-uuid",
    "status": "PENDING",
    "total": "1999.98",
    "createdAt": "2026-03-09T10:00:00.000Z",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "items": [
      {
        "id": "order-item-uuid",
        "quantity": 2,
        "price": "999.99",
        "product": {
          "id": "product-uuid",
          "name": "iPhone 15 Pro",
          "images": [{ "url": "https://res.cloudinary.com/..." }]
        },
        "sku": {
          "options": [
            { "option": { "value": "Black", "variant": { "name": "Color" } } },
            { "option": { "value": "128GB", "variant": { "name": "Storage" } } }
          ]
        }
      }
    ]
  }
}
```

---

## 📦 Request & Response Format

### All Successful Responses
```json
{
  "success": true,
  "statusCode": 200,
  "data": { },
  "timestamp": "2026-03-09T10:00:00.000Z"
}
```

### All Error Responses
```json
{
  "success": false,
  "statusCode": 404,
  "message": "User with id abc-123 not found",
  "path": "/users/abc-123",
  "timestamp": "2026-03-09T10:00:00.000Z"
}
```

### Validation Error Response (400)
```json
{
  "success": false,
  "statusCode": 400,
  "message": [
    "Name is required",
    "Please provide a valid email",
    "Password must be at least 8 characters"
  ],
  "path": "/auth/signup",
  "timestamp": "2026-03-09T10:00:00.000Z"
}
```

---

## ❌ Error Handling

| Status Code | Meaning |
|---|---|
| 400 | Bad Request — validation failed or invalid data |
| 401 | Unauthorized — not logged in or token expired |
| 403 | Forbidden — logged in but insufficient role |
| 404 | Not Found — resource doesn't exist |
| 409 | Conflict — duplicate data (e.g. email already in use) |
| 500 | Internal Server Error |

---

## 👥 Roles & Permissions

| Role | Description |
|---|---|
| `CUSTOMER` | Default role. Can shop, manage own cart and orders |
| `ADMIN` | Can manage products, categories, view all orders |
| `SUPER_ADMIN` | Full access including changing user roles |

### Permission Matrix

| Action | CUSTOMER | ADMIN | SUPER_ADMIN |
|---|---|---|---|
| Browse products/categories | ✅ | ✅ | ✅ |
| Manage own cart | ✅ | ✅ | ✅ |
| Place orders | ✅ | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| View all orders | ❌ | ✅ | ✅ |
| Update order status | ❌ | ✅ | ✅ |
| Create/Edit/Delete products | ❌ | ✅ | ✅ |
| Create/Edit/Delete categories | ❌ | ✅ | ✅ |
| Upload product images | ❌ | ✅ | ✅ |
| View all users | ❌ | ✅ | ✅ |
| Change user roles | ❌ | ❌ | ✅ |

---

## 🎨 Product Variants & SKUs

Products follow a **Shopee-style variant system**:

```
Product: iPhone 15 Pro
├── Variant: Color
│   ├── Option: Black
│   └── Option: White
├── Variant: Storage
│   ├── Option: 128GB
│   └── Option: 256GB
└── SKUs (purchasable combinations):
    ├── Black + 128GB → price: $999.99, stock: 10
    ├── Black + 256GB → price: $1099.99, stock: 5
    ├── White + 128GB → price: $999.99, stock: 8
    └── White + 256GB → price: $1099.99, stock: 3
```

### Frontend Flow
```
1. Fetch product  →  GET /products/:id
2. Show variant options (Color, Storage) to user
3. User selects "Black" + "128GB"
4. Find the matching SKU from skus[] array
5. Use that SKU's id when adding to cart
   POST /cart/items  { skuId: "matching-sku-id", quantity: 1 }
```

### Finding the Right SKU
```javascript
// After user selects their options
const selectedOptions = { Color: 'Black', Storage: '128GB' };

const matchingSku = product.skus.find((sku) =>
  sku.options.every(({ option }) =>
    selectedOptions[option.variant.name] === option.value
  )
);

// Use matchingSku.id for cart/order
```

---

## 🖼 Image Upload

- **Max file size:** 2MB per image
- **Allowed formats:** JPEG, PNG, WebP
- **Max images per product:** 8
- **Storage:** Cloudinary CDN
- **First uploaded image** is automatically set as the main image

### Upload Example (JavaScript)
```javascript
const formData = new FormData();
files.forEach(file => formData.append('images', file));

await api.post(`/products/${productId}/images`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 🗄 Database Schema Overview

```
User ──────────< Order ──────────< OrderItem >──────── ProductSku
  |                                                         |
  └──────────── Cart ──────────< CartItem >─────────────────┘
                                                            |
Category ─────────────< Product >──── ProductVariant        |
                           |               |                |
                    ProductImage    ProductVariantOption     |
                                          |                 |
                                      SkuOption ───────────┘
```

---

## 📁 Project Structure

```
src/
├── auth/           # JWT authentication, login, signup, refresh
├── cart/           # Cart management and checkout
├── categories/     # Product categories
├── common/         # Shared utilities
│   ├── config/     # Cloudinary, Multer config
│   ├── decorators/ # @Roles decorator
│   ├── enums/      # Role enum
│   ├── filters/    # Global exception filter
│   ├── guards/     # RolesGuard
│   ├── interceptors/ # Response interceptor
│   └── services/   # CloudinaryService
├── orders/         # Order management
├── prisma/         # Database connection
├── products/       # Products with variants and SKUs
├── users/          # User management
├── app.module.ts
└── main.ts
```
