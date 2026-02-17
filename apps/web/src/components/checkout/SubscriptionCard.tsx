import { Check } from 'lucide-react';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[]; // JSONB in DB, assuming array of strings here
  description?: string;
}

interface SubscriptionCardProps {
  plan: PaymentPlan;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function SubscriptionCard({
  plan,
  isSelected,
  onSelect,
}: SubscriptionCardProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Interactive card
    // biome-ignore lint/a11y/useKeyWithClickEvents: Interactive card
    <div
      onClick={onSelect}
      className={`
        relative overflow-hidden rounded-2xl border-2 p-6 transition-all cursor-pointer
        ${
          isSelected
            ? 'border-[#facc15] bg-[#facc15]/5'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }
      `}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
          {plan.description && (
            <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
          )}
        </div>
        {isSelected && (
          <div className="h-6 w-6 bg-[#facc15] rounded-full flex items-center justify-center text-black">
            <Check size={14} strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="mb-6">
        <span className="text-3xl font-extrabold text-slate-900">
          {plan.price.toLocaleString()} {plan.currency}
        </span>
        <span className="text-slate-500 font-medium ml-1">
          /{plan.interval}
        </span>
      </div>

      <div className="space-y-3">
        {plan.features.map((feature, idx) => (
          <div
            /* biome-ignore lint/suspicious/noArrayIndexKey: Static content */
            key={idx}
            className="flex items-center gap-3"
          >
            <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-sm text-slate-600">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
