'use client';

import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/services/products';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (e: React.MouseEvent) => void;
  priority?: boolean;
}

export function ProductCard({
  product,
  onAddToCart,
  priority = false,
}: ProductCardProps) {
  // Format price
  const price = new Intl.NumberFormat('en-IQ', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <Link href={`/product/${product.slug}`} className="group block h-full">
      <motion.div
        whileHover={{ y: -5 }}
        className="relative h-full bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-brand-yellow/30 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col"
      >
        {/* Image Container */}
        <div className="relative aspect-square bg-[#1a1a1a] overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-700">
              No Image
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {product.condition === 'new' && (
              <span className="px-2 py-1 bg-brand-yellow text-brand-dark text-[10px] font-black tracking-widest uppercase rounded-sm">
                NEW
              </span>
            )}
            {product.condition !== 'new' && (
              <span className="px-2 py-1 bg-white/10 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold tracking-widest uppercase rounded-sm">
                {product.condition}
              </span>
            )}
          </div>

          {/* Quick Add Button (Visible on Hover / Mobile) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart?.(e);
            }}
            className="absolute bottom-3 right-3 p-3 bg-brand-yellow text-brand-dark rounded-full shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:text-black z-10"
            aria-label="Add to cart"
          >
            <ShoppingCart size={20} />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex-1">
            <h3 className="text-white font-bold leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">
              {product.title}
            </h3>
            <p className="text-xs text-slate-400 mb-3">{product.seller}</p>
          </div>

          <div className="flex items-end justify-between pt-3 border-t border-white/5">
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                Price
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-brand-yellow">
                  {price}
                </span>
                <span className="text-xs text-slate-500">IQD</span>
              </div>
            </div>
            {product.rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-300 bg-white/5 px-2 py-1 rounded-md">
                <span className="text-brand-yellow">★</span>
                {product.rating}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
