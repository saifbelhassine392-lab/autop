import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe minimum 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe minimum 8 caracteres'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'Prenom minimum 2 caracteres').optional(),
  lastName: z.string().min(2, 'Nom minimum 2 caracteres').optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{10,}$/, 'Telephone invalide').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const productSchema = z.object({
  sku: z.string().min(3, 'SKU minimum 3 caracteres'),
  name: z.string().min(2, 'Nom minimum 2 caracteres'),
  slug: z.string().min(2, 'Slug minimum 2 caracteres'),
  description: z.string().min(10, 'Description minimum 10 caracteres'),
  shortDesc: z.string().optional(),
  price: z.number().positive('Prix doit etre positif'),
  comparePrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  stock: z.number().int().min(0, 'Stock minimum 0'),
  stockAlert: z.number().int().min(0).default(5),
  trackStock: z.boolean().default(true),
  categoryId: z.string().min(1, 'Categorie requise'),
  brandId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED']).default('DRAFT'),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Produit requis'),
  quantity: z.number().int().min(1, 'Quantite minimum 1'),
});

export const addressSchema = z.object({
  label: z.string().optional().default('Livraison'),
  street: z.string().min(1, 'Adresse requise'),
  city: z.string().min(1, 'Ville requise'),
  zipCode: z.string().min(1, 'Code postal requis').optional().default('2035'),
  country: z.string().default('Tunisie'),
});

export const orderSchema = z.object({
  shippingAddress: z.union([addressSchema, z.record(z.any()), z.string()]),
  billingAddress: z.union([addressSchema, z.record(z.any()), z.string()]).optional(),
  paymentMethod: z.enum(['CARD', 'PAYPAL', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']).default('CASH_ON_DELIVERY'),
  shippingMethod: z.string().default('standard'),
  customerNote: z.string().optional(),
});

export const quoteItemSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, 'Description requise'),
  sku: z.string().optional(),
  price: z.number().positive(),
  quantity: z.number().int().min(1),
});

export const quoteSchema = z.object({
  clientName: z.string().min(2, 'Nom client minimum 2 caracteres'),
  clientEmail: z.string().email('Email client invalide'),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Au moins un article requis'),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1, 'Produit requis'),
  rating: z.number().int().min(1).max(5, 'Note entre 1 et 5'),
  title: z.string().optional(),
  comment: z.string().min(10, 'Commentaire minimum 10 caracteres'),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().regex(/^\+?[0-9\s-]{10,}$/).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Nouveau mot de passe minimum 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CartItemInput = z.infer<typeof cartItemSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type QuoteInput = z.infer<typeof quoteSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;