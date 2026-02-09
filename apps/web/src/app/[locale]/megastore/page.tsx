'use client';

import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { Badge, Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { Book, Gamepad2, Laptop, Search, Smartphone, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

export default function MegaStorePage() {
  const t = useTranslations('MegaStore');
  const { addItem } = useCartStore();
  const { openCart } = useUIStore();

  // biome-ignore lint/suspicious/noExplicitAny: Product type definition to be consolidated
  const handleQuickAdd = (e: React.MouseEvent, product: any) => {
    e.preventDefault(); // Prevent navigation
    addItem({
      id: product.id,
      productId: product.id,
      quantity: 1,
      product: {
        name: product.name,
        price: product.price,
        image: product.image,
        slug: product.slug,
      },
    });
    openCart();
  };

  const categories = [
    { name: 'Phones', icon: Smartphone, color: 'bg-blue-500' },
    { name: 'Laptops', icon: Laptop, color: 'bg-purple-500' },
    { name: 'Gaming', icon: Gamepad2, color: 'bg-red-500' },
    { name: 'Books', icon: Book, color: 'bg-yellow-500' },
    { name: 'Electronics', icon: Zap, color: 'bg-green-500' },
  ];

  const flashDeals = [
    {
      id: '1',
      name: 'iPhone 15 Pro Max',
      price: 1199,
      image:
        'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=800',
      discount: '-15%',
      slug: 'iphone-15-pro-max',
    },
    {
      id: '2',
      name: 'MacBook Pro M3',
      price: 1899,
      image:
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?auto=format&fit=crop&q=80&w=800',
      discount: '-10%',
      slug: 'macbook-pro-m3',
    },
    {
      id: '3',
      name: 'Sony WH-1000XM5',
      price: 349,
      image:
        'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800',
      discount: '-20%',
      slug: 'sony-wh-1000xm5',
    },
    {
      id: '4',
      name: 'PlayStation 5 Slim',
      price: 449,
      image:
        'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=800',
      discount: '-10%',
      slug: 'ps5-slim',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section */}
      <section className="relative h-[500px] w-full bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&q=80&w=2070"
            alt="Megastore Hero"
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-4">
              New Arrivals
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              The Future of <span className="text-yellow-400">Shopping</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Discover millions of products with the best deals, fastest
              delivery, and verified sellers.
            </p>

            <div className="flex w-full max-w-md mx-auto relative">
              <input
                type="text"
                placeholder="Search for anything..."
                className="w-full h-14 pl-12 pr-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              <Button className="absolute right-2 top-2 rounded-full h-10 px-6 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold">
                Search
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="container mx-auto px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer group"
            >
              <div
                className={`w-12 h-12 rounded-full ${cat.color} bg-opacity-10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <cat.icon className={`w-6 h-6 ${cat.color.replace('bg-', 'text-')}`} />
              </div>
              <h3 className="font-semibold text-slate-800">{cat.name}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Flash Deals ⚡
            </h2>
            <p className="text-slate-500">Limited time offers ending soon</p>
          </div>
          <Link
            href="/megastore/deals"
            className="text-yellow-600 font-semibold hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {flashDeals.map((product) => (
            <Link href={`/product/${product.slug}`} key={product.id}>
              <motion.div
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 group h-full flex flex-col"
              >
                <div className="relative aspect-square">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    {product.discount}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-auto">
                    <span className="text-lg font-bold text-slate-900">
                      ${product.price}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      ${Math.round(product.price * 1.2)}
                    </span>
                  </div>
                  <Button
                    className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-800"
                    onClick={(e) => handleQuickAdd(e, product)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
