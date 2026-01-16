import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/crm';
import { ContactsTable } from './ContactsTable';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const supabase = await createClient();

  // Fetch profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, avatar_url, role, updated_at, crm_tags, crm_status',
    )
    .order('updated_at', { ascending: false });

  if (error) {
    // biome-ignore lint/suspicious/noConsole: Error logging
    console.error('Error fetching profiles:', error);
    return <div>Error loading profiles</div>;
  }

  // Cast to Profile[] as strict typing might mismatch on nullable fields if not perfectly aligned
  const data = (profiles || []) as unknown as Profile[];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">CRM Contacts</h1>
        <p className="text-slate-500">Manage your user base and leads.</p>
      </div>

      <ContactsTable initialData={data} />
    </div>
  );
}
