import { Badge, Button } from '@repo/ui';
import { waylClient } from '@/lib/wayl';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const { data: transactions } = await waylClient.links.list({ take: 50 });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Transactions</h1>
        <Button variant="outline">Refresh</Button>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950 text-xs uppercase font-medium text-slate-300">
            <tr>
              <th className="px-6 py-4">Reference ID</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Created At</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {transactions?.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-mono text-white">
                    {tx.referenceId}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {Number(tx.total).toLocaleString()} {tx.currency}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        tx.status === 'Complete'
                          ? 'success'
                          : tx.status === 'Pending'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {tx.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <Button variant="ghost" size="sm">
                      Details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
