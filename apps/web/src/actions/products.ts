import { Logger } from '@repo/utils';
import { createClient } from '@/lib/supabase/client';
import { requireAdmin } from '@/lib/auth-utils';

/**
 * Creates a new product in the database.
 * Restricted to admins.
 * Audit: Logs 'create_product'.
 */
// biome-ignore lint/suspicious/noExplicitAny: legacy
export async function createProduct(data: any) {
  const { supabase } = await requireAdmin();
  const { data: product, error } = await supabase
    .from('products')
    .insert(data)
    .select()
    .single();

  if (error) {
    Logger.error('Error creating product:', error);
    throw new Error('Failed to create product');
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    action: 'create_product',
    entity_id: product.id,
    details: { name: product.name },
  });

  return product;
}

/**
 * Updates an existing product.
 * Restricted to admins.
 * Audit: Logs 'update_product'.
 */
// biome-ignore lint/suspicious/noExplicitAny: legacy
export async function updateProduct(id: string, updates: any) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);

  if (error) {
    Logger.error('Error updating product:', error);
    throw new Error('Failed to update product');
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    action: 'update_product',
    entity_id: id,
    details: updates,
  });

  return true;
}
