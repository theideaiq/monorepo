import { cn } from '@repo/utils';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../card/Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: number; // e.g. 12
    label: string; // e.g. "from last month"
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
        {icon && <div className="text-brand-pink">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {(description || trend) && (
          <div className="mt-1 flex items-center text-xs text-slate-500">
            {trend && (
              <span
                className={cn(
                  'mr-2 flex items-center font-medium',
                  trend.direction === 'up' && 'text-green-600',
                  trend.direction === 'down' && 'text-red-600',
                  trend.direction === 'neutral' && 'text-slate-600',
                )}
              >
                {trend.direction === 'up' && (
                  <ArrowUp className="mr-1 h-3 w-3" />
                )}
                {trend.direction === 'down' && (
                  <ArrowDown className="mr-1 h-3 w-3" />
                )}
                {trend.direction === 'neutral' && (
                  <ArrowRight className="mr-1 h-3 w-3" />
                )}
                {trend.value}%
              </span>
            )}
            {trend?.label || description}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
