import { Badge, Button } from '@repo/ui';
import { format } from 'date-fns';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from('marketing_campaigns')
    .select('*, segment:marketing_segments(name)')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Campaigns</h1>
          <p className="text-slate-500">Blast updates to your user segments.</p>
        </div>
        <Link href="/marketing/campaigns/create">
          <Button>Create Campaign</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500">
            <tr>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Segment</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Sent</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {campaigns?.map((campaign: any) => (
              <tr key={campaign.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">
                  {campaign.subject}
                </td>
                <td className="px-6 py-4">
                  {campaign.segment?.name || 'Unknown'}
                </td>
                <td className="px-6 py-4">
                  <Badge
                    variant={
                      campaign.status === 'sent'
                        ? 'success'
                        : campaign.status === 'failed'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {campaign.status.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-6 py-4">{campaign.sent_count}</td>
                <td className="px-6 py-4 text-slate-500">
                  {format(new Date(campaign.created_at), 'MMM d, yyyy h:mm a')}
                </td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No campaigns found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
