import { Logger } from '@repo/utils';
import { createClient } from '@/lib/supabase/client';

export interface ProductVariant {
  id: string;
  sku: string;
  stock: number;
  price: number;
  image?: string; // Added image
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  image: string;
  images: string[];
  category: string;
  rating: number;
  reviewCount: number;
  slug: string;
  isVerified: boolean;
  description: string;
  condition?: 'new' | 'used' | 'refurbished' | 'open_box'; // Added condition
  seller?: string; // Added seller
  // biome-ignore lint/suspicious/noExplicitAny: JSON structure
  details: Record<string, any>;
  variants: ProductVariant[];
  stock: number;
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    Logger.error('Error fetching products:', error);
    return [];
  }

  return data.map((item) => {
    // Parse variants
    const variants: ProductVariant[] =
      // biome-ignore lint/suspicious/noExplicitAny: Supabase generic result
      item.product_variants?.map((v: any) => ({
        id: v.id,
        sku: v.sku,
        stock: v.stock_count || 0,
        price: v.price_override || item.price,
        image: v.image_url || undefined,
        attributes: v.attributes || {},
      })) || [];

    return {
      id: item.id,
      title: item.name,
      price: item.price,
      image: item.image_url || '',
      images: item.images || [],
      category: item.category,
      rating: 4.5, // Placeholder
      reviewCount: 0,
      slug: item.slug || item.id,
      isVerified: item.is_verified,
      description: item.description || '',
      condition: item.condition || 'new', // Default to new if missing
      seller: item.seller || 'The IDEA', // Default seller
      // biome-ignore lint/suspicious/noExplicitAny: JSON structure
      details: (item.details as Record<string, any>) || {},
      variants,
      stock: item.stock_count,
    };
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createClient();

  const { data: item, error } = await supabase
    .from('products')
    .select(`
      *,
      product_variants (*)
    `)
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      Logger.error(`Error fetching product ${slug}:`, error);
    }
    return null;
  }

  const variants: ProductVariant[] =
    // biome-ignore lint/suspicious/noExplicitAny: Supabase generic result
    item.product_variants?.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock_count || 0,
      price: v.price_override || item.price,
      image: v.image_url || undefined,
      attributes: v.attributes || {},
    })) || [];

  return {
    id: item.id,
    title: item.name,
    price: item.price,
    image: item.image_url || '',
    images: item.images || [],
    category: item.category,
    rating: 4.8,
    reviewCount: 120,
    slug: item.slug || item.id,
    isVerified: item.is_verified,
    description: item.description || '',
    condition: item.condition || 'new',
    seller: item.seller || 'The IDEA',
    // biome-ignore lint/suspicious/noExplicitAny: JSON structure
    details: (item.details as Record<string, any>) || {},
    variants,
    stock: item.stock_count,
  };
}
