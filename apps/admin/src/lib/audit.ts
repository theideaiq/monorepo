import { Logger } from '@repo/utils';
import { createClient } from '@/lib/supabase/server';

/**
 * Logs an administrative action to the audit table.
 *
 * @param action - The action performed (e.g., 'update_user', 'delete_post').
 * @param resource - The target resource identifier (e.g., user ID).
 * @param details - Optional JSON object with additional context.
 */
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
      // Silently log error to console to prevent disrupting the admin flow
      Logger.error('Failed to write audit log', error);
    }
  } catch (err) {
    // Silently catch exceptions
    Logger.error('Unexpected error in audit logging', err);
  }
}
