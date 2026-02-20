import dotenv from 'dotenv';
import path from 'node:path';
import { createServiceRoleClient } from '../src/service';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Root env
dotenv.config({ path: path.resolve(__dirname, '../../../apps/web/.env') }); // Web env
dotenv.config({
  path: path.resolve(__dirname, '../../../apps/web/.env.local'),
});
dotenv.config({ path: path.resolve(__dirname, '../../../apps/admin/.env') }); // Admin env
dotenv.config({
  path: path.resolve(__dirname, '../../../apps/admin/.env.local'),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || (!supabaseKey && !supabaseServiceKey)) {
  console.error('Error: Missing Supabase environment variables.');
  console.error(
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are set.',
  );
  process.exit(1);
}

// Prefer Service Key for seeding to bypass potential RLS
const supabase = createServiceRoleClient(
  supabaseUrl,
  // biome-ignore lint/style/noNonNullAssertion: validated above
  supabaseServiceKey || supabaseKey!,
);

const accounts = [
  // ASSETS
  {
    code: '1000',
    name: 'Cash in Bank',
    type: 'asset',
    category: 'Current Assets',
  },
  {
    code: '1200',
    name: 'Inventory (Vinyls/Tech)',
    type: 'asset',
    category: 'Inventory',
  },

  // REVENUE
  { code: '4000', name: 'Music Sales', type: 'revenue', category: 'Sales' },
  {
    code: '4100',
    name: 'Tech/Hardware Sales',
    type: 'revenue',
    category: 'Sales',
  },
  { code: '4200', name: 'Rental Income', type: 'revenue', category: 'Rentals' },
  {
    code: '4300',
    name: 'Academy Subscriptions',
    type: 'revenue',
    category: 'Academy',
  },

  // COGS (Cost of Goods Sold)
  { code: '5000', name: 'COGS - Vinyls', type: 'expense', category: 'COGS' },
  { code: '5100', name: 'COGS - Hardware', type: 'expense', category: 'COGS' },
  {
    code: '5200',
    name: 'Shipping & Delivery',
    type: 'expense',
    category: 'COGS',
  },

  // EXPENSES (SG&A)
  {
    code: '6000',
    name: 'Payroll & Salaries',
    type: 'expense',
    category: 'Ops',
  },
  {
    code: '6100',
    name: 'Marketing & Ads',
    type: 'expense',
    category: 'Growth',
  },
  {
    code: '6200',
    name: 'Software Subscriptions',
    type: 'expense',
    category: 'Tech',
  },
  { code: '6300', name: 'Office Rent', type: 'expense', category: 'Ops' },
  {
    code: '6400',
    name: 'Legal & Professional',
    type: 'expense',
    category: 'Ops',
  },
];

async function seedAccounts() {
  console.log('Starting Chart of Accounts seed...');

  // Optional: Clean up existing entries to avoid duplicates if running multiple times?
  // Or just upsert based on code. The table schema provided doesn't explicitly say code is unique,
  // but it usually is. I'll use upsert if possible, but without a unique constraint, upsert might fail or duplicate.
  // The user said "Please do not create new migration files".
  // I'll check if they exist first.

  // Better approach: select existing codes, filter out, insert new ones.
  const { data: existing, error: fetchError } = await supabase
    .from('chart_of_accounts')
    .select('code');

  if (fetchError) {
    console.error('Error fetching existing accounts:', fetchError.message);
    // If table doesn't exist, we can't do anything.
    return;
  }

  const existingCodes = new Set(existing?.map((a) => a.code));

  const toInsert = accounts.filter((a) => !existingCodes.has(a.code));

  if (toInsert.length === 0) {
    console.log('All accounts already exist. Skipping.');
    return;
  }

  const { error } = await supabase.from('chart_of_accounts').insert(toInsert);

  if (error) {
    console.error('Error seeding accounts:', error.message);
  } else {
    console.log(`Successfully seeded ${toInsert.length} accounts.`);
  }
}

seedAccounts();
