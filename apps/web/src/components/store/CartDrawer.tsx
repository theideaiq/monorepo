'use client';

import { Button } from '@repo/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

export function CartDrawer() {
  const t = useTranslations('Store');
  const router = useRouter();
  const { isCartOpen, closeCart } = useUIStore();
  const { items, removeItem, updateQuantity, total } = useCartStore();

  const formattedTotal = new Intl.NumberFormat('en-IQ').format(total);

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[400px] bg-[#111] border-l border-white/10 shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-brand-yellow" />
                <h2 className="text-xl font-bold">Your Cart</h2>
                <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs font-bold">
                  {items.length}
                </span>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                  <ShoppingBag size={48} className="opacity-20" />
                  <p>Your cart is empty</p>
                  <Button variant="outline" onClick={closeCart}>
                    Continue Shopping
                  </Button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 bg-white/5 p-4 rounded-2xl"
                  >
                    <div className="relative w-20 h-20 bg-black rounded-xl border border-white/5 overflow-hidden flex-shrink-0">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-sm line-clamp-2">
                          {item.title}
                        </h3>
                        {item.attributes &&
                          Object.keys(item.attributes).length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">
                              {Object.entries(item.attributes)
                                .map(([_k, v]) => `${v}`)
                                .join(', ')}
                            </p>
                          )}
                      </div>

                      <div className="font-bold text-brand-yellow text-sm">
                        {new Intl.NumberFormat('en-IQ').format(item.price)} IQD
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-500 hover:text-red-500 p-1"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/10 p-6 space-y-4 bg-black/40">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="font-bold text-white">
                    {formattedTotal} IQD
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Shipping</span>
                  <span className="text-slate-500">Calculated at checkout</span>
                </div>
                <div className="pt-4 flex items-center justify-between border-t border-white/10">
                  <span className="font-bold">Total</span>
                  <span className="text-xl font-black text-brand-yellow">
                    {formattedTotal} <span className="text-sm">IQD</span>
                  </span>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full h-14 bg-white text-black font-bold hover:bg-brand-pink hover:text-white transition-colors"
                >
                  {t('checkout')}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
