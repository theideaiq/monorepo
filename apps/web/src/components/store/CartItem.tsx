'use client';

import { memo } from 'react';
import Image from 'next/image';
import { Trash2, Minus, Plus } from 'lucide-react';
import type { CartItem as CartItemType } from '@/stores/cart-store';

interface CartItemProps {
  item: CartItemType;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
}

export const CartItem = memo(function CartItem({
  item,
  onRemove,
  onUpdateQuantity,
}: CartItemProps) {
  return (
    <div className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
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
              .map(([_k, v]) => `${v}`)
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
          onClick={() => onRemove(item.id)}
          className="text-slate-500 hover:text-red-500 p-1"
        >
          <Trash2 size={16} />
        </button>

        <div className="flex items-center gap-3 bg-black/20 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-50"
            disabled={item.quantity <= 1}
          >
            <Minus size={14} />
          </button>
          <span className="text-sm font-bold text-white w-4 text-center">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});
