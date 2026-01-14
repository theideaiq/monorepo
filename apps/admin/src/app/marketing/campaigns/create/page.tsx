import { createClient } from '@/lib/supabase/server';
import type { MarketingSegment } from '@/types/crm';
import { CreateCampaignForm } from './CreateCampaignForm';

export const dynamic = 'force-dynamic';

export default async function CreateCampaignPage() {
  const supabase = await createClient();
  const { data: segments } = await supabase
    .from('marketing_segments')
    .select('*');

  return (
    <div className="p-8">
      <CreateCampaignForm segments={(segments || []) as MarketingSegment[]} />
    </div>
  );
}
