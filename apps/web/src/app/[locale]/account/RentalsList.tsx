'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: Data fetch
export default function RentalsList({ rentals }: { rentals: any[] }) {
  const t = useTranslations('Account');
  const [selectedRental, setSelectedRental] = useState<string | null>(null);

  if (!rentals?.length) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
        <p className="text-slate-400">{t('noRentals')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rentals.map((rental) => (
        <div
          key={rental.id}
          className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-brand-yellow/50 transition-colors"
        >
          <div className="flex items-center gap-4 mb-4">
            {rental.product?.image_url && (
              <Image
                src={rental.product.image_url}
                width={64}
                height={64}
                alt={rental.product.name}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div>
              <h3 className="font-bold text-white">{rental.product?.name}</h3>
              <p className="text-sm text-slate-400">
                {new Date(rental.start_date).toLocaleDateString()} -{' '}
                {new Date(rental.end_date).toLocaleDateString()}
              </p>
            </div>
            <div className="ml-auto">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  rental.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}
              >
                {rental.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
