import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  buttonVariants,
} from '@repo/ui';
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
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Campaigns</h1>
          <p className="text-slate-500">Blast updates to your user segments.</p>
        </div>
        <Link
          href="/marketing/campaigns/create"
          className={buttonVariants()}
        >
          Create Campaign
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns?.map((campaign: any) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-medium text-slate-900">
                  {campaign.subject}
                </TableCell>
                <TableCell>
                  {campaign.segment?.name || 'Unknown'}
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>{campaign.sent_count}</TableCell>
                <TableCell className="text-slate-500">
                  {format(new Date(campaign.created_at), 'MMM d, yyyy h:mm a')}
                </TableCell>
              </TableRow>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-slate-500"
                >
                  No campaigns found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
