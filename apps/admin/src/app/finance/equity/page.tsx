import { Card } from '@repo/ui';
import { getEquityData } from '../actions';
import { EquityPieChart, EquityTable } from './components/EquityComponents';

export default async function EquityPage() {
  const { holders, rounds } = await getEquityData();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Equity & Cap Table</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Ownership Distribution</h3>
          <EquityPieChart holders={holders} />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Funding Rounds</h3>
          <div className="space-y-4">
            {rounds.map((round) => (
              <div
                key={round.id}
                className="flex justify-between items-center border-b pb-2 last:border-0"
              >
                <div>
                  <div className="font-medium">{round.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(round.price_per_share)}{' '}
                    / share
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    Valuation Cap
                  </div>
                  <div className="font-bold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      notation: 'compact',
                    }).format(round.valuation_cap)}
                  </div>
                </div>
              </div>
            ))}
            {rounds.length === 0 && (
              <div className="text-muted-foreground text-sm">
                No rounds found.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Shareholders</h3>
        <EquityTable holders={holders} />
      </div>
    </div>
  );
}
