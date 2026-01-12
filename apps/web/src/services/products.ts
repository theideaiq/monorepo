// Mock Data (The Marketplace)
export const PRODUCTS = [
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

export async function getProducts() {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return PRODUCTS;
}
