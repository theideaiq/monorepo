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
      // If no user context (e.g. strict server-side job), logging might be restricted
      // but usually this is called within a user request.
      console.warn('Attempted to log admin action without user context', {
        action,
        resource,
      });
      return;
    }

    const { error } = await supabase.from('audit_logs').insert({
      admin_id: user.id,
      action,
      target_resource: resource,
      details,
    });

    if (error) {
      console.error('Failed to write audit log:', error);
    }
  } catch (err) {
    console.error('Error in logAdminAction:', err);
  }
}
