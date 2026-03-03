'use client';

import { Button, Card, Input, Select } from '@repo/ui';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { createSegment } from '@/actions/marketing';
import { CRM_STATUSES, ROLES } from '@/lib/constants';

export function SegmentForm() {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async () => {
    if (!name) return toast.error('Name is required');

    const criteria: Record<string, string> = {};
    if (role) criteria.role = role;
    if (status) criteria.crm_status = status;

    if (Object.keys(criteria).length === 0)
      return toast.error('Select at least one criteria');

    try {
      await createSegment(name, criteria);
      toast.success('Segment created');
      setName('');
      setRole('');
      setStatus('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Create New Segment</h2>
      <Input
        placeholder="Segment Name (e.g. VIP Students)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-1 gap-4">
        <Select
          label="Role"
          options={[
            { value: '', label: 'Any Role' },
            { value: ROLES.USER, label: 'User' },
            { value: ROLES.STUDENT, label: 'Student' },
            { value: ROLES.ADMIN, label: 'Admin' },
          ]}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <Select
          label="CRM Status"
          options={[
            { value: '', label: 'Any Status' },
            { value: CRM_STATUSES.LEAD, label: 'Lead' },
            { value: CRM_STATUSES.CUSTOMER, label: 'Customer' },
            { value: CRM_STATUSES.VIP, label: 'VIP' },
            { value: CRM_STATUSES.CHURNED, label: 'Churned' },
          ]}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      <Button onClick={handleSubmit} className="w-full">
        Create Segment
      </Button>
    </Card>
  );
}
