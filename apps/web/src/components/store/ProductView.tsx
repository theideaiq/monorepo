import { Button } from '@repo/ui';
import { motion } from 'framer-motion';
import { CheckCircle2, Heart, Share2, Star } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { VariantSelector } from '@/components/ui/VariantSelector';
import type { Product } from '@/services/products';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

interface ProductViewProps {
  product: Product;
}

export function ProductView({ product }: ProductViewProps) {
  const [selectedImage, setSelectedImage] = useState(product.image);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const { addItem } = useCartStore();
  const { openCart } = useUIStore();

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: product.price,
      image: selectedImage,
    });
    toast.success('Added to cart');
    openCart();
  };

  const handleVariantChange = (key: string, value: string) => {
    // Find variant with matching attribute
    const matchingVariant = product.variants.find(
      (v) => v.attributes[key] === value,
    );
    if (matchingVariant?.image) {
      setSelectedImage(matchingVariant.image);
    }
    setSelectedVariant(value);
  };

  // Get unique attributes
  const attributes = product.variants.reduce(
    (acc, variant) => {
      for (const [key, value] of Object.entries(variant.attributes)) {
        if (!acc[key]) acc[key] = new Set();
        acc[key].add(value);
      }
      return acc;
    },
    {} as Record<string, Set<string>>,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
      {/* LEFT: Image Gallery */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="relative aspect-square bg-white/5 border border-white/10 rounded-3xl overflow-hidden group">
          <Image
            src={selectedImage}
            alt={product.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority
          />
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-brand-yellow text-brand-dark font-bold text-xs uppercase tracking-widest rounded-full">
              {product.condition}
            </span>
          </div>
        </div>

        {product.images.length > 1 && (
          /* Thumbnails (Scrollable on mobile) */
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
                type="button"
                // biome-ignore lint/suspicious/noArrayIndexKey: Static image list
                key={i}
                onClick={() => setSelectedImage(img)}
                className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-brand-yellow' : 'border-transparent opacity-50 hover:opacity-100'}`}
              >
                <Image
                  src={img}
                  alt={`View ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* RIGHT: Product Details */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col h-full"
      >
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-brand-pink font-bold uppercase tracking-widest mb-2">
                {product.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                {product.title}
              </h1>
              <button
                type="button"
                className="text-slate-500 hover:text-brand-pink transition-colors"
              >
                <Heart size={28} />
              </button>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-brand-yellow">
                {new Intl.NumberFormat('en-IQ').format(product.price)}
                <span className="text-sm text-slate-500 ml-1 font-medium">
                  IQD
                </span>
              </div>
              <div className="flex items-center justify-end gap-1 mt-1">
                <Star className="text-brand-yellow fill-brand-yellow" size={14} />
                <span className="text-white font-bold text-sm">
                  {product.rating}
                </span>
                <span className="text-slate-500 text-xs">(128 reviews)</span>
              </div>
            </div>
          </div>

          <p className="text-slate-400 leading-relaxed mb-8 text-lg">
            {product.description}
          </p>

          {/* Variants */}
          {Object.entries(attributes).map(([key, values]) => (
            <VariantSelector
              key={key}
              label={key}
              options={Array.from(values)}
              selected={selectedVariant || ''}
              onChange={(val) => handleVariantChange(key, val)}
            />
          ))}

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <CheckCircle2 className="text-green-500" />
              <span className="text-sm text-slate-300 font-medium">
                Verified Authentic
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <CheckCircle2 className="text-brand-yellow" />
              <span className="text-sm text-slate-300 font-medium">
                Instant Delivery
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 left-0 right-0 p-4 md:p-0 bg-brand-bg/80 backdrop-blur-xl md:bg-transparent border-t border-white/10 md:border-none mt-auto">
          <div className="flex gap-4">
            <Button
              size="lg"
              className="flex-1 h-14 text-lg bg-brand-yellow text-brand-dark hover:bg-white font-bold rounded-xl"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2" /> Add to Cart
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-14 w-14 p-0 rounded-xl border-white/20 text-white hover:bg-white/10"
            >
              <Share2 size={20} />
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
