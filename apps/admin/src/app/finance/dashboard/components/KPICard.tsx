import { Card } from '@repo/ui';
import { formatCurrency, formatNumber } from '@repo/utils';

export function KPICard({
  title,
  value,
  type = 'number',
}: {
  title: string;
  value: number;
  type?: 'currency' | 'number' | 'percent';
}) {
  let formattedValue: string;
  if (type === 'currency') {
    formattedValue = formatCurrency(value, 'USD');
  } else if (type === 'percent') {
    formattedValue = `${value.toFixed(1)}%`;
  } else {
    formattedValue = formatNumber(value);
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2 text-2xl font-bold">{formattedValue}</div>
    </Card>
  );
}
