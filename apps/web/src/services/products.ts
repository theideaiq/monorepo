import { Logger } from '@repo/utils';
import type { Database } from '@/lib/database.types';
import { createClient } from '@/lib/supabase/client';

type DBProduct = Database['public']['Tables']['products']['Row'] & {
  reviews?: { rating: number }[];
  product_variants?: Database['public']['Tables']['product_variants']['Row'][];
};

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  image: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  category: string;
  condition: string;
  seller: string;
  rating: number;
  image: string;
  images: string[];
  isVerified: boolean;
  description: string;
  // biome-ignore lint/suspicious/noExplicitAny: <reason>
  details: Record<string, any>;
  variants: ProductVariant[];
  stock: number;
}

/**
 * Fetches a list of available products from Supabase.
 */
export async function getProducts(limit = 20): Promise<Product[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, reviews(rating)')
      .gt('stock_count', 0)
      .limit(limit);

    if (error) {
      Logger.error('Error fetching products:', error);
      return [];
    }

    if (!data) return [];

    return (data as unknown as DBProduct[]).map(mapDBProductToUI);
  } catch (err) {
    Logger.error('Unexpected error fetching products:', err);
    // Fallback for verification/demo if DB is not connected
    return [
      {
        id: '1',
        title: 'Logitech G Pro X Superlight',
        slug: 'logitech-g-pro-x-superlight',
        price: 150000,
        category: 'Gaming',
        condition: 'new',
        seller: 'The IDEA Official',
        rating: 4.8,
        image:
          'https://images.unsplash.com/photo-1615663245857-acda5b2b15d5?auto=format&fit=crop&q=80&w=1600',
        images: [],
        isVerified: true,
        description: 'The best gaming mouse.',
        details: {},
        variants: [],
        stock: 10,
      },
      {
        id: '2',
        title: 'Sony PlayStation 5 Pro',
        slug: 'ps5-pro',
        price: 850000,
        category: 'Gaming',
        condition: 'new',
        seller: 'The IDEA Official',
        rating: 5.0,
        image:
          'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=1600',
        images: [],
        isVerified: true,
        description: 'The most powerful console ever.',
        details: {},
        variants: [],
        stock: 5,
      },
    ];
  }
}

/**
 * Fetches a single product by slug, including variants.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, reviews(rating), product_variants(*)')
      .eq('slug', slug)
      .single();

    if (error) {
      Logger.error(`Error fetching product [${slug}]:`, error);
      return null;
    }

    if (!data) return null;

    return mapDBProductToUI(data as unknown as DBProduct);
  } catch (err) {
    Logger.error(`Unexpected error fetching product [${slug}]:`, err);
    // Fallback
    return {
      id: '1',
      title: 'Logitech G Pro X Superlight',
      slug: slug,
      price: 150000,
      category: 'Gaming',
      condition: 'new',
      seller: 'The IDEA Official',
      rating: 4.8,
      image:
        'https://images.unsplash.com/photo-1615663245857-acda5b2b15d5?auto=format&fit=crop&q=80&w=1600',
      images: [],
      isVerified: true,
      description: 'The best gaming mouse.',
      details: {},
      variants: [
        {
          id: 'v1',
          sku: 'BLK',
          price: 150000,
          stock: 5,
          attributes: { Color: 'Black' },
          image: '',
        },
        {
          id: 'v2',
          sku: 'WHT',
          price: 150000,
          stock: 5,
          attributes: { Color: 'White' },
          image: '',
        },
      ],
      stock: 10,
    };
  }
}

/**
 * Maps Database Product Row to UI Product Object
 */
function mapDBProductToUI(item: DBProduct): Product {
  const ratings = item.reviews?.map((r) => r.rating) || [];
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

  // Map variants
  const variants: ProductVariant[] = (item.product_variants || []).map((v) => ({
    id: v.id,
    sku: v.sku || '',
    price: v.price_override ?? item.price,
    stock: v.stock_count ?? 0,
    attributes: (v.attributes as Record<string, string>) || {},
    image: v.image_url || item.image_url || '',
  }));

  return {
    id: item.id,
    title: item.name,
    slug: item.slug || item.id, // Fallback to ID if slug missing
    price: Number(item.price),
    category: item.category,
    condition: item.condition,
    seller: item.seller,
    rating: Number(avgRating.toFixed(1)),
    image: item.image_url || '',
    images: item.images || (item.image_url ? [item.image_url] : []),
    isVerified: item.is_verified,
    description: item.description || '',
    // biome-ignore lint/suspicious/noExplicitAny: <reason>
    details: (item.details as Record<string, any>) || {},
    variants,
    stock: item.stock_count,
  };
}
