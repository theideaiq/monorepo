'use client';

import { Button, Input, Modal } from '@repo/ui';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import type { ChartOfAccount } from '@/types/finance';
import { createJournalEntry } from '../../actions';

export function NewJournalEntryModal({
  accounts,
}: {
  accounts: ChartOfAccount[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([{ accountId: '', debit: 0, credit: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    if (!newLines[index]) return;
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Debits must equal Credits
    const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = lines.reduce(
      (sum, line) => sum + Number(line.credit),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      // Floating point tolerance
      toast.error(`Debits (${totalDebit}) must equal Credits (${totalCredit})`);
      return;
    }

    if (lines.some((l) => !l.accountId)) {
      toast.error('All lines must have an account selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await createJournalEntry(date || '', description || '', lines);
      toast.success('Journal entry created');
      setIsOpen(false);
      setLines([{ accountId: '', debit: 0, credit: 0 }]);
      setDescription('');
      router.refresh(); // Refresh server data
    } catch (_error) {
      toast.error('Failed to create entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> New Journal Entry
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="New Journal Entry"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="e.g. Monthly Rent"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Transaction Lines</label>
              <Button type="button" variant="outline" onClick={handleAddLine}>
                Add Line
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium">Account</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={line.accountId}
                      onChange={(e) =>
                        handleLineChange(index, 'accountId', e.target.value)
                      }
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs font-medium">Debit</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          'debit',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-xs font-medium">Credit</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit}
                      onChange={(e) =>
                        handleLineChange(
                          index,
                          'credit',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveLine(index)}
                    disabled={lines.length === 1}
                    className="h-10 w-10 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4 text-sm font-medium">
              <span>
                Total Debit:{' '}
                {lines.reduce((s, l) => s + Number(l.debit), 0).toFixed(2)}
              </span>
              <span>
                Total Credit:{' '}
                {lines.reduce((s, l) => s + Number(l.credit), 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
