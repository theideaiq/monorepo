'use client';

import { Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { CheckCircle2, Heart, Share2, ShoppingCart, Star } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { type Product } from '@/services/products';

interface ProductViewProps {
  product: Product;
}

export function ProductView({ product }: ProductViewProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-12">
      {/* Gallery */}
      <div className="space-y-4">
        <div className="aspect-square relative rounded-2xl overflow-hidden bg-white/5 border border-white/10">
          <Image
            src={product.images[selectedImage] || product.image}
            alt={product.title}
            fill
            className="object-cover"
            priority
          />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {product.images.map((image, idx) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedImage(idx)}
              className={`
                aspect-square relative rounded-xl overflow-hidden border-2 transition-all
                ${
                  selectedImage === idx
                    ? 'border-brand-yellow'
                    : 'border-transparent opacity-50 hover:opacity-100'
                }
              `}
            >
              <Image
                src={image}
                alt={`${product.title} view ${idx + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-brand-yellow">
              <Star className="fill-current" size={20} />
              <span className="font-bold">{product.rating}</span>
              <span className="text-slate-500">
                ({product.reviewCount} reviews)
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon">
                <Heart size={20} />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 size={20} />
              </Button>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white mb-2">
            {product.title}
          </h1>
          <p className="text-slate-400 text-lg">{product.description}</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Price</p>
              <div className="text-3xl font-bold text-white">
                {new Intl.NumberFormat('en-IQ', {
                  style: 'currency',
                  currency: 'IQD',
                  maximumFractionDigits: 0,
                }).format(product.price)}
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1 rounded-full text-sm font-medium">
              <CheckCircle2 size={14} />
              In Stock
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              size="lg"
              className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/90 font-bold"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2" size={20} />
              Add to Cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-white/20 hover:bg-white/10"
            >
              Buy Now
            </Button>
          </div>
        </div>

        {/* Features / Specs */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Specifications</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(product.details).map(([key, value]) => (
              <div
                key={key}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                  {key}
                </p>
                <p className="font-medium text-white">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
