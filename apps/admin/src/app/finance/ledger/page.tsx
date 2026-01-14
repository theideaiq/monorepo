import { getChartOfAccounts, getLedgerEntries } from '../actions';
import { LedgerTable } from './components/LedgerTable';
import { NewJournalEntryModal } from './components/NewJournalEntryModal';

export default async function LedgerPage() {
  const [entries, accounts] = await Promise.all([
    getLedgerEntries(),
    getChartOfAccounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Ledger</h2>
        <NewJournalEntryModal accounts={accounts} />
      </div>

      <LedgerTable data={entries} />
    </div>
  );
}
