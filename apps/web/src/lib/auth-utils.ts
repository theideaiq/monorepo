import { createClient } from '@/lib/supabase/client';
import { Logger } from '@repo/utils';

export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  // Simplified admin check for now, can be expanded
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
    Logger.warn(`Unauthorized access attempt by ${user.id}`);
    throw new Error('Unauthorized: Admin access required');
  }

  return { supabase, user };
}
