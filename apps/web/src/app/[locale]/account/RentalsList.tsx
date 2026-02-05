'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

// biome-ignore lint/suspicious/noExplicitAny: Profile data structure is dynamic
export default function RentalsList({ rentals }: { rentals: any[] }) {
  const t = useTranslations('Account');
  const [_selectedRental, _setSelectedRental] = useState<string | null>(null);

  if (!rentals.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('no_rentals')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rentals.map((rental) => (
        <div key={rental.id} className="border rounded-lg p-4">
          <div className="flex items-center gap-4 mb-4">
            {rental.product?.image_url && (
              // biome-ignore lint/performance/noImgElement: External image URL
              <img
                src={rental.product.image_url}
                alt={rental.product.name}
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div>
              <h3 className="font-semibold">{rental.product?.name}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(rental.start_date).toLocaleDateString()} -{' '}
                {new Date(rental.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className={`px-2 py-1 rounded-full ${
              rental.status === 'active' ? 'bg-green-100 text-green-800' :
              rental.status === 'overdue' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {t(`status.${rental.status}`)}
            </span>
            <span className="font-medium">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
              }).format(rental.total_amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
