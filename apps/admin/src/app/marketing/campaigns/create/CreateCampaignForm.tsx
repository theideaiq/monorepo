'use client';

import { Button, Card, Input, Select, Textarea } from '@repo/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { createCampaign } from '@/actions/marketing';
import { sendCampaign } from '@/actions/send-campaign';
import type { MarketingSegment } from '@/types/crm';

export function CreateCampaignForm({
  segments,
}: {
  segments: MarketingSegment[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!subject || !segmentId || !body)
      return toast.error('All fields are required');

    setIsSending(true);
    try {
      const campaignId = await createCampaign(subject, segmentId, body);
      await sendCampaign(campaignId);
      toast.success('Campaign sent successfully!');
      router.push('/marketing/campaigns');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send campaign');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Campaign</h1>

      <div className="space-y-4">
        <Input
          label="Subject Line"
          placeholder="e.g. Welcome to the new semester!"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <Select
          label="Target Segment"
          options={[
            { value: '', label: 'Select a segment' },
            ...segments.map((s) => ({ value: s.id, label: s.name })),
          ]}
          value={segmentId}
          onChange={(e) => setSegmentId(e.target.value)}
        />

        <Textarea
          label="Email Body (HTML supported)"
          placeholder="<p>Hello there,</p>..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[300px] font-mono text-sm"
        />

        <div className="pt-4 flex justify-end">
          <Button
            onClick={handleSend}
            isLoading={isSending}
            className="w-full md:w-auto"
          >
            Send Now
          </Button>
        </div>
      </div>
    </Card>
  );
}
