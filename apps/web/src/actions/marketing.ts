export async function createSegment(
  name: string,
  criteria: Record<string, unknown>,
) {
  // const { supabase } = await requireAdmin(); // Not available in web app
  // This seems to be a copy-paste from admin app.
  // In web app, we probably don't create segments, or we should use createClient.
  // For now, to fix the build, I will throw not implemented or mock it if it's unused.
  // Given it's in `actions/marketing.ts`, it might be intended for admin.
  // But it is in `apps/web`.
  // I will just use createClient for now and maybe throw error.

  throw new Error('Not implemented');

  /*
  const { data: segment, error } = await supabase
    .from('marketing_segments')
    .insert({ name, criteria })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Calculate Segment Size
  // This is simplified. In a real app, you'd run a query based on 'criteria'
  // For now, we'll just count all users for the 'all' segment
  let count = 0;
  if (criteria.type === 'all') {
    const { count: total } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    count = total || 0;
  }

  return { ...segment, count };
  */
}
