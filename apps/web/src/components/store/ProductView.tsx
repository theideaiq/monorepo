'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Star, Share2, Heart, CheckCircle2 } from 'lucide-react';
import { Button } from '@repo/ui';
import { formatIQDNumber } from '@repo/utils';
import { VariantSelector } from '@/components/ui/VariantSelector';
import type { Product, ProductVariant } from '@/services/products';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'react-hot-toast';

interface ProductViewProps {
  product: Product;
}

export function ProductView({ product }: ProductViewProps) {
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { openCart } = useUIStore();

  // Helper to extract options from variants
  // This assumes a simple structure where variants differentiate by 1 attribute for now
  // or we just list all variants.
  // For simplicity given the time, if variants exist, we just show "Option" selector
  // In a real complex app we'd cross-reference attributes.

  const hasVariants = product.variants && product.variants.length > 0;

  // Extract unique attributes (e.g. Color, Size)
  const attributes: Record<string, string[]> = {};
  if (hasVariants) {
    product.variants.forEach((v) => {
      Object.entries(v.attributes).forEach(([key, val]) => {
        if (!attributes[key]) attributes[key] = [];
        if (!attributes[key].includes(val)) attributes[key].push(val);
      });
    });
  }

  // State for selections
  const [selections, setSelections] = useState<Record<string, string>>({});

  const handleAttributeChange = (key: string, value: string) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
    // Try to find matching image
    const matchingVariant = product.variants.find(
      (v) => v.attributes[key] === value,
    );
    if (matchingVariant?.image) {
      setSelectedImage(matchingVariant.image);
    }
  };

  const handleAddToCart = () => {
    // Validate selections if needed
    if (
      hasVariants &&
      Object.keys(attributes).length > Object.keys(selections).length
    ) {
      toast.error('Please select all options');
      return;
    }

    // Construct Cart Item
    // In a real app we'd map selection to variant ID. For now using a composite ID.
    const variantId = hasVariants
      ? `${product.id}-${Object.values(selections).join('-')}`
      : undefined;

    addItem({
      id: variantId || product.id,
      productId: product.id,
      variantId,
      title: product.title,
      price: product.price,
      image: selectedImage,
      attributes: selections,
    });

    openCart();
    toast.success('Added to cart');
  };

  const price = formatIQDNumber(product.price);

  return (
    <div className="pb-32 md:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* LEFT: Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square bg-[#1a1a1a] rounded-3xl overflow-hidden border border-white/5">
            <Image
              src={selectedImage}
              alt={product.title}
              fill
              className="object-contain p-8 hover:scale-105 transition-transform duration-500"
              priority
            />
            <div className="absolute top-4 left-4">
              {product.condition === 'new' ? (
                <span className="bg-brand-yellow text-brand-dark font-black px-3 py-1 rounded text-xs uppercase tracking-widest">
                  New
                </span>
              ) : (
                <span className="bg-white/10 backdrop-blur text-white font-bold px-3 py-1 rounded text-xs uppercase tracking-widest border border-white/10">
                  {product.condition}
                </span>
              )}
            </div>
          </div>

          {/* Thumbnails (Scrollable on mobile) */}
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedImage(product.image)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === product.image ? 'border-brand-yellow' : 'border-transparent opacity-50 hover:opacity-100'}`}
            >
              <Image
                src={product.image}
                alt="Main"
                fill
                className="object-cover"
              />
            </button>
            {product.images?.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedImage(img)}
                className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-brand-yellow' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                <Image
                  src={img}
                  alt={`View ${i}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Info */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
                {product.title}
              </h1>
              <button
                type="button"
                className="text-slate-500 hover:text-brand-pink transition-colors"
              >
                <Heart size={28} />
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1 text-brand-yellow">
                <Star size={16} fill="currentColor" />
                {product.rating}
              </span>
              <span>•</span>
              <span>{product.seller}</span>
              {product.isVerified && (
                <CheckCircle2 size={16} className="text-blue-500" />
              )}
            </div>
          </div>

          <div className="text-4xl font-black text-brand-yellow">
            {price}{' '}
            <span className="text-lg font-medium text-slate-500">IQD</span>
          </div>

          {/* Variants */}
          {hasVariants && (
            <div className="space-y-6 pt-6 border-t border-white/10">
              {Object.entries(attributes).map(([key, options]) => (
                <VariantSelector
                  key={key}
                  label={key}
                  options={options}
                  selected={selections[key] || ''}
                  onChange={(val) => handleAttributeChange(key, val)}
                />
              ))}
            </div>
          )}

          {/* Description */}
          <div className="prose prose-invert prose-sm max-w-none text-slate-400">
            <p>
              {product.description ||
                'No description available for this premium item.'}
            </p>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex gap-4 pt-8 border-t border-white/10">
            <Button
              onClick={handleAddToCart}
              className="flex-1 h-16 text-lg font-bold bg-brand-yellow text-brand-dark hover:bg-white"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Actions */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t border-white/10 z-30 md:hidden flex gap-4 pb-8"
      >
        <div className="flex flex-col justify-center">
          <span className="text-xs text-slate-400 uppercase">Total</span>
          <span className="text-lg font-bold text-white">{price}</span>
        </div>
        <Button
          onClick={handleAddToCart}
          className="flex-1 h-12 bg-brand-yellow text-brand-dark font-bold"
        >
          Add to Cart
        </Button>
      </motion.div>
    </div>
  );
}
