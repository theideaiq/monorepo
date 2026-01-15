'use server';

import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/audit';
import { requireAdmin } from '@/lib/auth-checks';
import { createClient } from '@/lib/supabase/server';

export async function createProduct(data: any) {
  const supabase = await createClient();
  await requireAdmin(supabase);

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

export async function updateProduct(id: string, updates: any) {
  const supabase = await createClient();
  await requireAdmin(supabase);

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

export async function updateStock(id: string, newCount: number) {
  const supabase = await createClient();
  await requireAdmin(supabase);

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

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) throw new Error(error.message);

  await logAdminAction('delete_product', 'inventory', { product_id: id });
  revalidatePath('/products');
}
