'use client';

import { Button, Input } from '@repo/ui';
import { motion } from 'framer-motion';
import { Gamepad2, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ProductCard } from '@/components/ui/ProductCard';
import { useProducts } from '@/hooks/queries/use-products';
import type { Product } from '@/services/products';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

export default function Megastore() {
  const t = useTranslations('Store');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { openCart } = useUIStore();

  const { data, isLoading } = useProducts();
  // Ensure products is always treated as Product[]
  const products = (data as unknown as Product[]) || [];

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); // Prevent navigation
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
    });
    openCart();
    toast.success(t('addedToCart'));
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((p: Product) => {
        const matchesSearch = p.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory
          ? p.category === selectedCategory
          : true;
        return matchesSearch && matchesCategory;
      }),
    [searchTerm, selectedCategory, products],
  );

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      {/* Header */}
      <div className="container mx-auto px-4 mb-12">
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
          THE <span className="text-brand-yellow">MEGASTORE</span>
        </h1>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full bg-[#1a1a1a] border-white/10 pl-12 h-14 text-lg rounded-2xl focus:border-brand-pink transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <Button
              variant={selectedCategory === null ? 'primary' : 'outline'}
              className="whitespace-nowrap h-14 rounded-2xl"
              onClick={() => setSelectedCategory(null)}
            >
              All Gear
            </Button>
            <Button
              variant={selectedCategory === 'Gaming' ? 'primary' : 'outline'}
              className="whitespace-nowrap h-14 rounded-2xl gap-2"
              onClick={() => setSelectedCategory('Gaming')}
            >
              <Gamepad2 size={18} /> Gaming
            </Button>
            <Button
              variant={selectedCategory === 'Laptops' ? 'primary' : 'outline'}
              className="whitespace-nowrap h-14 rounded-2xl gap-2"
              onClick={() => setSelectedCategory('Laptops')}
            >
              Laptops
            </Button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-[#1a1a1a] rounded-[2rem] aspect-[3/4] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {filteredProducts.length > 0 ? (
              <>
                {filteredProducts.map((product: Product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickAdd={(e) => handleQuickAdd(e, product)}
                  />
                ))}
              </>
            ) : (
              <div className="col-span-full py-24 text-center">
                <div className="inline-block p-6 bg-white/5 rounded-full mb-4">
                  <Search size={32} className="text-slate-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  No products found
                </h3>
                <p className="text-slate-400">
                  We couldn't find anything matching "{searchTerm}".
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory(null);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
