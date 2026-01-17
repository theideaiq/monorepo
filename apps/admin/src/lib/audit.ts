import { createClient } from '@/lib/supabase/server';

export async function logAdminAction(
  action: string,
  resource: string,
  details?: Record<string, any>,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      admin_id: user.id,
      action,
      target_resource: resource,
      details,
    });

    if (error) {
    }
  } catch (_err) {}
}
