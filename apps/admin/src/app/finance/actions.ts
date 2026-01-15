'use server';

import { redirect } from 'next/navigation';
import { logAdminAction } from '@/lib/audit';
import { createClient } from '@/lib/supabase/server';
import {
  type ChartOfAccount,
  type EquityHolder,
  type EquityRound,
  type HRStaffPlan,
  LedgerEntry,
  LedgerLine,
  type LedgerTransaction,
} from '@/types/finance';

// --- PROFIT & LOSS ---

interface PnLResult {
  revenue: number;
  cogs: number;
  expenses: number;
  netIncome: number;
  breakdown: Record<string, number>; // Category breakdown
}

export async function getProfitAndLoss(
  startDate: string,
  endDate: string,
): Promise<PnLResult> {
  const supabase = await createClient();

  // Fetch all ledger lines within the date range, joined with accounts
  const { data: lines, error } = await supabase
    .from('ledger_lines')
    .select(`
      debit,
      credit,
      chart_of_accounts!inner (
        name,
        type,
        category
      ),
      ledger_entries!inner (
        transaction_date
      )
    `)
    .gte('ledger_entries.transaction_date', startDate)
    .lte('ledger_entries.transaction_date', endDate);

  if (error) {
    // biome-ignore lint/suspicious/noConsole: Log critical data fetching error
    console.error('Error fetching P&L data:', error);
    redirect('/login');
  }

  let revenue = 0;
  let cogs = 0;
  let expenses = 0;
  const breakdown: Record<string, number> = {};

  lines.forEach((line: any) => {
    const account = line.chart_of_accounts;
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    // Normal balance:
    // Asset/Expense: Debit +
    // Liability/Revenue/Equity: Credit +

    // For P&L:
    // Revenue (Credit balance) -> Credit - Debit
    // Expense/COGS (Debit balance) -> Debit - Credit

    let amount = 0;

    if (account.type === 'revenue') {
      amount = credit - debit;
      revenue += amount;
    } else if (account.type === 'expense') {
      // Check category for COGS
      amount = debit - credit;
      if (account.category?.toUpperCase().includes('COGS')) {
        cogs += amount;
      } else {
        expenses += amount;
      }
    }

    if (amount !== 0) {
      breakdown[account.name] = (breakdown[account.name] || 0) + amount;
    }
  });

  return {
    revenue,
    cogs,
    expenses,
    netIncome: revenue - cogs - expenses,
    breakdown,
  };
}

// --- LEDGER ---

export async function getLedgerEntries(): Promise<LedgerTransaction[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ledger_entries')
    .select(`
      *,
      lines:ledger_lines (
        *,
        account:chart_of_accounts (*)
      )
    `)
    .order('transaction_date', { ascending: false });

  if (error) {
    // biome-ignore lint/suspicious/noConsole: Log critical data fetching error
    console.error('Error fetching ledger entries:', error);
    redirect('/login');
  }

  return data as LedgerTransaction[];
}

export async function getChartOfAccounts(): Promise<ChartOfAccount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .order('code');
  if (error) redirect('/login');
  return data as ChartOfAccount[];
}

export async function createJournalEntry(
  date: string,
  description: string,
  lines: { accountId: string; debit: number; credit: number }[],
) {
  const supabase = await createClient();

  // Start a transaction implicitly by doing sequential inserts?
  // Supabase/PostgREST doesn't support complex transactions in one call easily without RPC.
  // However, we can insert the entry first, then the lines.
  // If lines fail, we have an orphan entry. Ideally we use an RPC, but for now we'll do sequential.

  const { data: entry, error: entryError } = await supabase
    .from('ledger_entries')
    .insert({
      transaction_date: date,
      description,
    })
    .select()
    .single();

  if (entryError) redirect('/login');

  const linesToInsert = lines.map((line) => ({
    entry_id: entry.id,
    account_id: line.accountId,
    debit: line.debit,
    credit: line.credit,
  }));

  const { error: linesError } = await supabase
    .from('ledger_lines')
    .insert(linesToInsert);

  if (linesError) {
    // Rollback entry? We can try to delete it.
    await supabase.from('ledger_entries').delete().eq('id', entry.id);
    redirect('/login');
  }

  await logAdminAction('create_journal_entry', 'finance', {
    date,
    description,
    amount: lines[0]?.debit,
  });
  return entry;
}

// --- STAFF ---

export async function getStaff(): Promise<HRStaffPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('hr_staff_plan')
    .select('*')
    .order('role_title');
  if (error) redirect('/login');
  return data as HRStaffPlan[];
}

export async function updateStaff(id: string, updates: Partial<HRStaffPlan>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('hr_staff_plan')
    .update(updates)
    .eq('id', id);
  if (error) redirect('/login');
  await logAdminAction('update_staff_plan', 'finance', {
    staff_id: id,
    updates,
  });
}

export async function createStaff(staff: Omit<HRStaffPlan, 'id'>) {
  const supabase = await createClient();
  const { error } = await supabase.from('hr_staff_plan').insert(staff);
  if (error) redirect('/login');
  await logAdminAction('create_staff_plan', 'finance', { staff });
}
export async function deleteStaff(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('hr_staff_plan').delete().eq('id', id);
  if (error) redirect('/login');
  await logAdminAction('delete_staff_plan', 'finance', { staff_id: id });
}

// --- EQUITY ---

interface EquityData {
  holders: EquityHolder[];
  rounds: EquityRound[];
}

export async function getEquityData(): Promise<EquityData> {
  const supabase = await createClient();

  const [holdersResult, roundsResult] = await Promise.all([
    supabase.from('equity_holders').select('*'),
    supabase.from('equity_rounds').select('*'),
  ]);

  if (holdersResult.error || roundsResult.error) redirect('/login');

  return {
    holders: holdersResult.data as EquityHolder[],
    rounds: roundsResult.data as EquityRound[],
  };
}
