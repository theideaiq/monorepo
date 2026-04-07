/**
 * Seed Products Script
 *
 * Populates the `products` table with sample data.
 *
 * Usage:
 * 1. Ensure environment variables are set (either in .env or .env.local).
 * 2. Run via tsx: `pnpm tsx packages/database/scripts/seed-products.ts`
 *
 * Note: Uses Service Role key to bypass RLS policies during seeding.
 */

import dotenv from 'dotenv';
import path from 'path';
import { createServiceRoleClient } from '../src/service';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Root env
dotenv.config({ path: path.resolve(__dirname, '../../../apps/web/.env') }); // Web env
dotenv.config({
  path: path.resolve(__dirname, '../../../apps/web/.env.local'),
});
dotenv.config({ path: path.resolve(__dirname, '../../../apps/admin/.env') }); // Admin env
dotenv.config({
  path: path.resolve(__dirname, '../../../apps/admin/.env.local'),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Optional: better for migration

if (!supabaseUrl || (!supabaseKey && !supabaseServiceKey)) {
  console.error('Error: Missing Supabase environment variables.');
  console.error(
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are set.',
  );
  process.exit(1);
}

// Use Service Key if available to bypass RLS, otherwise Anon Key (might fail if RLS blocks inserts)
const supabase = createServiceRoleClient(
  supabaseUrl,
  supabaseServiceKey || supabaseKey!,
);

// Mock Data copied from apps/web/src/services/products.ts to avoid importing ts files directly in a script if tsconfig/modules are tricky
const PRODUCTS = [
  {
    id: 1,
    title: 'PlayStation 5 Slim Console',
    price: 650000,
    category: 'Gaming',
    condition: 'New',
    seller: 'The IDEA Official',
    rating: 5.0,
    image:
      'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800',
    isVerified: true,
  },
  {
    id: 2,
    title: 'MacBook Air M2 (Midnight)',
    price: 1450000,
    category: 'Laptops',
    condition: 'Open Box',
    seller: 'TechResale Baghdad',
    rating: 4.8,
    image:
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800',
    isVerified: true,
  },
  {
    id: 3,
    title: 'Xbox Series X Controller',
    price: 85000,
    category: 'Accessories',
    condition: 'Used - Good',
    seller: 'GamerAli99',
    rating: 4.5,
    image:
      'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&q=80&w=800',
    isVerified: false,
  },
  {
    id: 4,
    title: 'iPhone 15 Pro Max',
    price: 1850000,
    category: 'Phones',
    condition: 'New',
    seller: 'The IDEA Official',
    rating: 5.0,
    image:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=800',
    isVerified: true,
  },
  {
    id: 5,
    title: 'Atomic Habits (Hardcover)',
    price: 25000,
    category: 'Books',
    condition: 'New',
    seller: 'Baghdad Books',
    rating: 4.9,
    image:
      'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&q=80&w=800',
    isVerified: true,
  },
  {
    id: 6,
    title: 'Sony WH-1000XM5',
    price: 450000,
    category: 'Audio',
    condition: 'New',
    seller: 'AudioKings',
    rating: 4.7,
    image:
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800',
    isVerified: true,
  },
];

type NewCategory = 'book' | 'game' | 'dvd' | 'merch' | 'other';

function mapCategory(oldCategory: string): NewCategory {
  const lower = oldCategory.toLowerCase();
  if (lower === 'gaming') return 'game';
  if (lower === 'books') return 'book';
  return 'other'; // 'Laptops', 'Phones', 'Accessories', 'Audio' -> 'other'
}

async function migrate() {
  console.log('Starting migration...');

  for (const product of PRODUCTS) {
    const mappedProduct = {
      name: product.title,
      description: `Condition: ${product.condition}. Seller: ${product.seller}`, // Storing extra info in description
      price: product.price,
      image_url: product.image,
      type: 'sale', // Default
      category: mapCategory(product.category),
      stock_count: 50, // Default
      rental_tier: null, // Default
      // We rely on Postgres to generate the UUID id
    };

    console.log(`Migrating: ${mappedProduct.name} (${mappedProduct.category})`);

    const { error } = await supabase.from('products').insert(mappedProduct);

    if (error) {
      console.error(`Failed to insert ${mappedProduct.name}:`, error.message);
    } else {
      console.log(`Successfully inserted ${mappedProduct.name}`);
    }
  }

  console.log('Migration complete.');
}

migrate();
