import { Button } from '@repo/ui';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface Rental {
  id: string;
  status: string;
  end_date: string;
  product?: {
    name?: string;
    image_url?: string;
  };
}

export default function RentalsList({ rentals }: { rentals: Rental[] }) {
  const t = useTranslations('Account');
  const [selectedRental, setSelectedRental] = useState<string | null>(null);

  if (!rentals || rentals.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText size={48} className="mx-auto mb-4 opacity-20" />
        <p>You have no active rentals.</p>
        <Button href="/plus" variant="outline" className="mt-4">
          Browse The IDEA+
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rentals.map((rental) => (
        <div
          key={rental.id}
          className="bg-slate-900 border border-white/5 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            {rental.product?.image_url && (
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={rental.product.image_url}
                  alt={rental.product.name || 'Rental item'}
                  fill
                  className="object-cover rounded"
                />
              </div>
            )}
            <div>
              <h3 className="font-bold text-white">
                {rental.product?.name || 'Unknown Item'}
              </h3>
              <p className="text-sm text-slate-400">
                Status: <span className="text-brand-pink">{rental.status}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Clock size={14} /> Due:{' '}
              {new Date(rental.end_date).toLocaleDateString()}
            </span>
            {rental.status === 'overdue' && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertTriangle size={14} /> Late fees accumulating
              </span>
            )}
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1">
              Extend Rental
            </Button>
            <Button className="flex-1">Return Item</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
