'use server';

import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth-checks/server';

/**
 * Creates a new product.
 *
 * Security: Requires Admin role.
 * Audit: Logs 'create_product'.
 */
export async function createProduct(data: any) {
  const { supabase } = await requireAdmin();
  const { data: product, error } = await supabase
    .from('products')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logAdminAction('create_product', 'inventory', {
    product_id: product.id,
    name: data.name,
  });
  revalidatePath('/products');
  return product;
}

/**
 * Updates an existing product.
 *
 * Security: Requires Admin role.
 * Audit: Logs 'update_product'.
 */
export async function updateProduct(id: string, updates: any) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAdminAction('update_product', 'inventory', {
    product_id: id,
    updates,
  });
  revalidatePath('/products');
}

/**
 * Updates product stock count.
 *
 * Security: Requires Admin role.
 * Audit: Logs 'update_stock'.
 */
export async function updateStock(id: string, newCount: number) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('products')
    .update({ stock_count: newCount })
    .eq('id', id);

  if (error) throw new Error(error.message);

  await logAdminAction('update_stock', 'inventory', {
    product_id: id,
    new_stock: newCount,
  });
  revalidatePath('/products');
}

/**
 * Deletes a product.
 *
 * Security: Requires Admin role.
 * Audit: Logs 'delete_product'.
 */
export async function deleteProduct(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) throw new Error(error.message);

  await logAdminAction('delete_product', 'inventory', { product_id: id });
  revalidatePath('/products');
}
