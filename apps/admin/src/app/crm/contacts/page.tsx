import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/crm';
import { ContactsTable } from './ContactsTable';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const supabase = await createClient();

  // Fetch profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    // biome-ignore lint/suspicious/noConsole: Error logging
    console.error('Error fetching profiles:', error);
    return <div>Error loading profiles</div>;
  }

  // Cast to Profile[] as strict typing might mismatch on nullable fields if not perfectly aligned
  const data = (profiles || []) as unknown as Profile[];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">CRM Contacts</h1>
        <p className="text-slate-500">Manage your user base and leads.</p>
      </div>

      <ContactsTable initialData={data} />
    </div>
  );
}
