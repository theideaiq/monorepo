'use client';

import { Check } from 'lucide-react';

interface SubscriptionCardProps {
  plan: {
    id: string;
    name: string;
    price: number;
    description: string;
    features: string[];
  };
  selected: boolean;
  onSelect: () => void;
}

export function SubscriptionCard({
  plan,
  selected,
  onSelect,
}: SubscriptionCardProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: legacy
    <div
      onClick={onSelect}
      className={`
        relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200
        ${
          selected
            ? 'border-brand-yellow bg-brand-yellow/5'
            : 'border-slate-200 hover:border-brand-yellow/50'
        }
      `}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg">{plan.name}</h3>
          <p className="text-slate-500 text-sm">{plan.description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'IQD',
              maximumFractionDigits: 0,
            }).format(plan.price)}
          </div>
          <div className="text-xs text-slate-500">/year</div>
        </div>
      </div>

      <div className="space-y-3">
        {plan.features.map((feature, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <div key={idx} className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-sm text-slate-600">{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div
          className={`
            w-full py-2 rounded-lg text-sm font-bold text-center transition-colors
            ${
              selected
                ? 'bg-brand-yellow text-black'
                : 'bg-slate-100 text-slate-600'
            }
          `}
        >
          {selected ? 'Selected' : 'Select Plan'}
        </div>
      </div>
    </div>
  );
}
