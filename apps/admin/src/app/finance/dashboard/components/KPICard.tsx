import { Card } from '@repo/ui';

export function KPICard({
  title,
  value,
  type = 'number',
}: {
  title: string;
  value: number;
  type?: 'currency' | 'number' | 'percent';
}) {
  let formattedValue = value.toString();
  if (type === 'currency') {
    formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  } else if (type === 'percent') {
    formattedValue = `${value.toFixed(1)}%`;
  } else {
    formattedValue = new Intl.NumberFormat('en-US').format(value);
  }

  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2 text-2xl font-bold">{formattedValue}</div>
    </Card>
  );
}
