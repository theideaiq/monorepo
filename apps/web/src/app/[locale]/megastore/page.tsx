'use client';

import { motion } from 'framer-motion';
import {
  Book,
  Gamepad2,
  Heart,
  Laptop,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Star,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
// UI Kit
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

// Mock Data (The Marketplace)
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

const CATEGORIES = [
  { name: 'Gaming', icon: <Gamepad2 size={18} /> },
  { name: 'Laptops', icon: <Laptop size={18} /> },
  { name: 'Phones', icon: <Smartphone size={18} /> },
  { name: 'Books', icon: <Book size={18} /> },
];

export default function MegastorePage() {
  const [filter, setFilter] = useState('All');

  const addToCart = (product: string) => {
    toast.success(`${product} added to cart`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* 1. HERO (PlayStation Store Style) */}
      <section className="relative h-[60vh] bg-[#0f1014] overflow-hidden flex items-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070')] bg-cover bg-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1014] via-[#0f1014]/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="max-w-2xl"
          >
            <Badge variant="brand" className="mb-4">
              MEGADEALS ARE HERE
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
              NEXT GEN <br />
              <span className="text-brand-yellow">HAS ARRIVED.</span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 max-w-lg">
              Shop the latest tech, verified pre-owned gear, and rare
              collectibles. Secure payment via Wayl. Same-day delivery in
              Baghdad.
            </p>
            <div className="flex gap-4">
              <Button className="h-12 px-8" variant="primary">
                Shop Deals
              </Button>
              <Button className="h-12 px-8 bg-white/10 text-white hover:bg-white/20">
                Sell Your Item
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. MARKETPLACE CONTROLS (Amazon/eBay Style) */}
      <section className="sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('All')}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === 'All' ? 'bg-brand-dark text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All Items
            </button>
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.name}
                onClick={() => setFilter(cat.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filter === cat.name ? 'bg-brand-dark text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-96">
            <Input
              placeholder="Search for PS5, iPhone, Books..."
              className="pl-10"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
          </div>
        </div>
      </section>

      {/* 3. PRODUCT GRID */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {PRODUCTS.filter(
            (p) => filter === 'All' || p.category === filter,
          ).map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full hover:shadow-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden border-slate-100">
                {/* Image Area */}
                <div className="relative h-64 bg-slate-100 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Overlay Action */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => addToCart(product.title)}
                      className="p-3 bg-white rounded-full hover:bg-brand-yellow hover:scale-110 transition text-brand-dark"
                    >
                      <ShoppingCart size={20} />
                    </button>
                    <button
                      type="button"
                      className="p-3 bg-white rounded-full hover:bg-brand-pink hover:scale-110 transition text-brand-dark"
                    >
                      <Heart size={20} />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-2">
                    {product.condition === 'New' ? (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                        NEW
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase">
                        {product.condition}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Area */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight">
                      {product.title}
                    </h3>
                  </div>

                  {/* Seller Info (eBay Style) */}
                  <div className="flex items-center gap-1 mb-4 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {product.seller}
                    </span>
                    {product.isVerified && (
                      <ShieldCheck size={14} className="text-blue-500" />
                    )}
                    <span>•</span>
                    <Star
                      size={12}
                      className="text-brand-yellow fill-brand-yellow"
                    />
                    <span>{product.rating}</span>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">
                        Price
                      </p>
                      <p className="text-xl font-black text-brand-dark">
                        {product.price.toLocaleString()}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          IQD
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={() => addToCart(product.title)}
                      variant="ghost"
                      className="h-10 w-10 p-0 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-dark hover:text-white"
                    >
                      <ShoppingCart size={18} />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. FLASH DEALS (Amazon Lightning Deal Style) */}
      <section className="bg-brand-dark text-white py-16 px-4 mb-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/3">
            <div className="flex items-center gap-2 text-brand-yellow mb-4">
              <Zap className="animate-pulse" />
              <span className="font-bold tracking-widest text-sm">
                FLASH DEAL ENDS IN 04:22:10
              </span>
            </div>
            <h2 className="text-4xl font-bold mb-6">
              Logitech G Pro X Superlight
            </h2>
            <p className="text-slate-400 mb-8">
              The world&apos;s lightest wireless gaming mouse. Used by pros.
              Verified refurbished condition available.
            </p>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-4xl font-bold text-white">120,000 IQD</span>
              <span className="text-xl text-slate-500 line-through">
                180,000 IQD
              </span>
            </div>
            <Button className="w-full h-14 text-lg bg-brand-pink hover:bg-pink-600 border-none">
              Claim Deal Now
            </Button>
          </div>

          <div className="md:w-2/3 relative h-[400px] w-full bg-slate-800 rounded-3xl overflow-hidden border border-white/10">
            <Image
              src="https://images.unsplash.com/photo-1615663245857-acda5b2b15d5?auto=format&fit=crop&q=80&w=1600"
              alt="Flash Deal"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
