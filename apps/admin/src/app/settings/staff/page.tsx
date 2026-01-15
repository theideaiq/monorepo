import { getStaff } from '@/actions/staff';
import StaffManagement from '@/components/settings/StaffManagement';
import { createClient } from '@/lib/supabase/server';

export default async function StaffPage() {
  const staff = await getStaff();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch current user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* @ts-ignore */}
      <StaffManagement
        initialStaff={staff || []}
        currentUserRole={profile?.role || 'user'}
        currentUserId={user?.id || ''}
      />
    </div>
  );
}
