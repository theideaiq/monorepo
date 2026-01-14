export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: string;
}

export interface LedgerEntry {
  id: string;
  transaction_date: string; // ISO string for timestamptz
  description: string;
  reference_id?: string;
}

export interface LedgerLine {
  id: string;
  entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

export interface LedgerTransaction extends LedgerEntry {
  lines: (LedgerLine & { account?: ChartOfAccount })[];
}

export interface HRStaffPlan {
  id: string;
  role_title: string;
  department: string;
  monthly_salary: number;
  annual_increase_pct: number;
  status: 'active' | 'hired' | 'planned' | 'terminated';
}

export interface EquityRound {
  id: string;
  name: string;
  valuation_cap: number;
  price_per_share: number;
}

export interface EquityHolder {
  id: string;
  name: string;
  type: 'founder' | 'investor' | 'employee' | 'advisor';
  round_id?: string;
  shares_owned: number;
  vesting_start_date: string;
}

export interface FinancialSettings {
  currency: string;
  corporate_tax_rate: number;
}
