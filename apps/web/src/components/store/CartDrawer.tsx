'use client';

import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@repo/ui';

export function CartDrawer() {
  const { isCartOpen, closeCart } = useUIStore();
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const router = useRouter();

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  const formattedTotal = new Intl.NumberFormat('en-IQ').format(total);

  return (
    <Drawer
      isOpen={isCartOpen}
      onClose={closeCart}
      title={`Your Cart (${items.length})`}
      footer={
        <div className="space-y-4">
          <div className="flex justify-between text-white font-bold text-lg">
            <span>Total</span>
            <span>{formattedTotal} IQD</span>
          </div>
          <Button
            className="w-full h-14 bg-brand-yellow text-brand-dark font-bold text-lg hover:bg-white"
            onClick={handleCheckout}
            disabled={items.length === 0}
          >
            Checkout
          </Button>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
          <ShoppingBag size={48} className="opacity-20" />
          <p>Your cart is empty.</p>
          <Button variant="outline" onClick={closeCart}>
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5"
            >
              <div className="w-20 h-20 bg-black rounded-lg relative overflow-hidden flex-shrink-0">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-sm line-clamp-2">
                  {item.title}
                </h4>
                {item.attributes && (
                  <p className="text-xs text-slate-500 mt-1">
                    {Object.entries(item.attributes)
                      .map(([k, v]) => `${v}`)
                      .join(', ')}
                  </p>
                )}
                <p className="text-brand-yellow font-bold mt-2">
                  {new Intl.NumberFormat('en-IQ').format(item.price)} IQD
                </p>
              </div>

              <div className="flex flex-col justify-between items-end">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-slate-500 hover:text-red-500 p-1 transition-colors"
                  aria-label={`Remove ${item.title}`}
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease quantity of ${item.title}`}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold text-white w-4 text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                    aria-label={`Increase quantity of ${item.title}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
