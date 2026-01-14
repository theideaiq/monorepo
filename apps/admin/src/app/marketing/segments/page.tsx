import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { MarketingSegment } from '@/types/crm';
import { SegmentForm } from './SegmentForm';

export const dynamic = 'force-dynamic';

export default async function SegmentsPage() {
  const supabase = await createClient();
  const { data: segments } = await supabase
    .from('marketing_segments')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Marketing Segments
        </h1>
        <p className="text-slate-500">Define audiences for your campaigns.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <SegmentForm />
        </div>
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold">Saved Segments</h2>
          {segments?.map((segment: any) => (
            <div
              key={segment.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{segment.name}</h3>
                  <p className="text-sm text-slate-500">
                    Created{' '}
                    {format(new Date(segment.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm font-mono text-slate-600">
                {JSON.stringify(segment.criteria, null, 2)}
              </div>
            </div>
          ))}
          {(!segments || segments.length === 0) && (
            <p className="text-slate-500">No segments found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
