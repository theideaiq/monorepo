'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: legacy code
export default function RentalsList({ rentals }: { rentals: any[] }) {
  const t = useTranslations('Account');
  const [_selectedRental, _setSelectedRental] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">{t('rentals')}</h2>
      {rentals.length === 0 ? (
        <p className="text-slate-400">{t('noRentals')}</p>
      ) : (
        <div className="grid gap-4">
          {rentals.map((rental) => (
            <div
              key={rental.id}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="flex items-center gap-4 mb-4">
                {rental.product?.image_url && (
                  // biome-ignore lint/performance/noImgElement: Legacy image handling
                  <img
                    src={rental.product.image_url}
                    alt={rental.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold">
                    {rental.product?.name || 'Unknown Product'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {new Date(rental.start_date).toLocaleDateString()} -{' '}
                    {new Date(rental.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span
                  className={`px-2 py-1 rounded-full ${
                    rental.status === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {rental.status}
                </span>
                <span className="font-bold">
                  {rental.total_price?.toLocaleString()} IQD
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
