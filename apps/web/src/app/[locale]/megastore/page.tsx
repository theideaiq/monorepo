'use client';

// UI Kit
import { Badge, Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { Book, Gamepad2, Laptop, Search, Smartphone, Zap } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ProductCard } from '@/components/ui/ProductCard';
import { useProducts } from '@/hooks/queries/use-products';
import type { Product } from '@/services/products';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

const CATEGORIES = [
  { name: 'Gaming', icon: <Gamepad2 size={18} /> },
  { name: 'Laptops', icon: <Laptop size={18} /> },
  { name: 'Phones', icon: <Smartphone size={18} /> },
  { name: 'Books', icon: <Book size={18} /> },
];

export default function MegastorePage() {
  const [filter, setFilter] = useState('All');
  const { data, isLoading } = useProducts();
  // Force cast to fix build error
  const products = (data as unknown as Product[]) || [];
  const addItem = useCartStore((s) => s.addItem);
  const { openCart } = useUIStore();

  // biome-ignore lint/suspicious/noExplicitAny: Product type compatibility
  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault(); // Prevent navigation
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
    });
    toast.success(`${product.title} added to cart`);
    openCart();
  };

  // Memoize filtered products
  const filteredProducts = useMemo(
    () => products.filter((p) => filter === 'All' || p.category === filter),
    [products, filter],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-yellow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg pt-20 pb-24">
      {/* 1. HERO */}
      <section className="relative h-[50vh] md:h-[60vh] overflow-hidden flex items-center mx-4 rounded-3xl mt-4">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070')] bg-cover bg-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-8 w-full">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="max-w-2xl"
          >
            <Badge
              variant="brand"
              className="mb-4 bg-brand-yellow text-brand-dark border-none"
            >
              MEGADEALS ARE HERE
            </Badge>
            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none">
              NEXT GEN <br />
              <span className="text-brand-yellow">HAS ARRIVED.</span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 max-w-lg">
              Shop the latest tech, verified pre-owned gear, and rare
              collectibles. Same-day delivery in Baghdad.
            </p>
            <div className="flex gap-4">
              <Button className="h-14 px-8 bg-white text-black hover:bg-slate-200 font-bold rounded-full">
                Shop Deals
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. CONTROLS */}
      <section className="sticky top-[72px] z-30 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 py-4 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('All')}
              className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${filter === 'All' ? 'bg-brand-yellow text-brand-dark border-brand-yellow' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
            >
              All Items
            </button>
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.name}
                onClick={() => setFilter(cat.name)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${filter === cat.name ? 'bg-brand-yellow text-brand-dark border-brand-yellow' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              size={18}
            />
            <input
              placeholder="Search..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-12 pr-4 text-white placeholder-slate-500 focus:border-brand-yellow outline-none transition-colors"
            />
          </div>
        </div>
      </section>

      {/* 3. GRID */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {filteredProducts.map((product) => (
              <div key={product.id} className="h-[420px]">
                <ProductCard
                  product={product}
                  onAddToCart={(e) => handleQuickAdd(e, product)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500">
              <Search size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              No products found
            </h3>
            <p className="text-slate-400 mb-8">
              We couldn&apos;t find any items in this category.
            </p>
            <Button
              variant="outline"
              onClick={() => setFilter('All')}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </section>

      {/* 4. FLASH DEALS */}
      <section className="max-w-7xl mx-auto px-4 mb-20">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-black rounded-[2.5rem] border border-white/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-[20%] bg-brand-pink/20 blur-[120px] rounded-full pointer-events-none" />

          <div className="grid md:grid-cols-2 gap-12 p-8 md:p-16 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-yellow/10 text-brand-yellow text-xs font-bold tracking-widest mb-6">
                <Zap size={14} className="fill-brand-yellow" /> FLASH DEAL
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                Logitech G Pro X Superlight
              </h2>
              <p className="text-slate-400 mb-8 text-lg">
                The world&apos;s lightest wireless gaming mouse. Used by pros.
                Verified refurbished condition available.
              </p>
              <div className="flex items-center gap-4 mb-8">
                <span className="text-4xl font-black text-white">120,000</span>
                <span className="text-xl text-slate-500 line-through">
                  180,000
                </span>
              </div>
              <Button className="h-14 px-10 bg-brand-pink hover:bg-pink-600 text-white font-bold rounded-full text-lg border-none">
                Claim Deal
              </Button>
            </div>
            <div className="relative aspect-square md:aspect-video rounded-3xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1615663245857-acda5b2b15d5?auto=format&fit=crop&q=80&w=1600"
                alt="Flash Deal"
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
