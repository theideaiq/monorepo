'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';

// biome-ignore lint/suspicious/noExplicitAny: Rentals type definition pending
export default function RentalsList({ rentals }: { rentals: any[] }) {
  const t = useTranslations('Account');
  const [selectedRental, setSelectedRental] = useState<string | null>(null);

  if (!rentals || rentals.length === 0) {
    return <p className="text-slate-500">{t('no_rentals')}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rentals.map((rental) => (
        <div
          key={rental.id}
          className="bg-white p-4 rounded-lg shadow border border-slate-100"
        >
          <div className="flex items-center gap-4 mb-4">
            {rental.product?.image_url && (
              <Image
                src={rental.product.image_url}
                alt={rental.product.name}
                width={64}
                height={64}
                className="object-cover rounded"
              />
            )}
            <div>
              <h3 className="font-semibold">
                {rental.product?.name || 'Unknown Item'}
              </h3>
              <p className="text-xs text-slate-500">
                Due: {new Date(rental.due_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          {selectedRental === rental.id ? (
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-2">
              {t('returnText')}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSelectedRental(rental.id)}
              className="w-full text-center border border-blue-600 text-blue-600 rounded py-1.5 text-sm hover:bg-blue-50"
            >
              {t('returnInstructions')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
