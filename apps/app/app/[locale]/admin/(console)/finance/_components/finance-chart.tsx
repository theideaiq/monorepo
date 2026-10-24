"use client";

import { formatPrice } from "@repo/commerce";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/design-system/components/ui/chart";
import { getDirection } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

export interface MonthPoint {
  expenses: number;
  label: string;
  net: number;
  revenue: number;
}

/** Revenue and expenses per month as bars, net income as a line. */
export const FinanceChart = ({ data }: { readonly data: MonthPoint[] }) => {
  const t = useTranslations("admin.finance.dashboard");
  const locale = useLocale();
  const rtl = getDirection(locale) === "rtl";

  const config = {
    expenses: { color: "var(--chart-2)", label: t("expenses") },
    net: { color: "var(--chart-1)", label: t("net") },
    revenue: { color: "var(--chart-3)", label: t("revenue") },
  } satisfies ChartConfig;

  return (
    <ChartContainer className="aspect-auto h-72 w-full" config={config}>
      <ComposedChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          reversed={rtl}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          orientation={rtl ? "right" : "left"}
          tickFormatter={(value: number) =>
            formatNumber(value, locale, {
              maximumFractionDigits: 1,
              notation: "compact",
            })
          }
          tickLine={false}
          width={56}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <span className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">
                    {config[name as keyof typeof config]?.label ?? name}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(Number(value), locale)}
                  </span>
                </span>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
        <Line
          dataKey="net"
          dot={false}
          stroke="var(--color-net)"
          strokeWidth={2}
          type="monotone"
        />
      </ComposedChart>
    </ChartContainer>
  );
};
