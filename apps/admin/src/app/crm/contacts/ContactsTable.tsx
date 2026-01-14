'use client';

import {
  Badge,
  Button,
  Input,
  Select,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@repo/ui';
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { Edit, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { updateProfile } from '@/actions/crm';
import type { CRMStatus, Profile } from '@/types/crm';

interface ContactsTableProps {
  initialData: Profile[];
}

export function ContactsTable({ initialData }: ContactsTableProps) {
  const [data, setData] = useState(initialData);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Edit State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<{
    crm_status: string;
    crm_tags: string;
  } | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const columns = useMemo<ColumnDef<Profile>[]>(
    () => [
      {
        accessorKey: 'avatar_url',
        header: '',
        cell: ({ row }) => (
          <img
            src={
              row.original.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(row.original.email)}`
            }
            alt="Avatar"
            className="w-8 h-8 rounded-full bg-gray-200"
          />
        ),
      },
      {
        accessorKey: 'full_name',
        header: 'Name',
        cell: ({ row }) => row.original.full_name || 'N/A',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'crm_status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.crm_status || 'lead';
          const variant =
            status === 'vip'
              ? 'brand'
              : status === 'customer'
                ? 'success'
                : status === 'churned'
                  ? 'danger'
                  : 'neutral';
          return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <span className="capitalize">
            {String(row.original.role || 'user')}
          </span>
        ),
      },
      {
        accessorKey: 'crm_tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.crm_tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'updated_at',
        header: 'Last Active',
        cell: ({ row }) =>
          row.original.updated_at
            ? format(new Date(row.original.updated_at), 'MMM d, yyyy')
            : '-',
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            className="px-2 py-1 h-auto"
            onClick={() => handleEdit(row.original)}
          >
            <Edit size={16} />
          </Button>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      columnFilters,
      globalFilter,
    },
  });

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setEditForm({
      crm_status: profile.crm_status || 'lead',
      crm_tags: profile.crm_tags?.join(', ') || '',
    });
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (!editingProfile || !editForm) return;

    try {
      const tags = editForm.crm_tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await updateProfile(editingProfile.id, {
        crm_status: editForm.crm_status as CRMStatus,
        crm_tags: tags,
      });

      // Optimistic update
      setData((prev) =>
        prev.map((p) =>
          p.id === editingProfile.id
            ? {
                ...p,
                crm_status: editForm.crm_status as CRMStatus,
                crm_tags: tags,
              }
            : p,
        ),
      );

      toast.success('Profile updated');
      setIsSheetOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center justify-between flex-wrap">
        <div className="relative max-w-sm w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <Input
            placeholder="Search profiles..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            onChange={(e) =>
              table
                .getColumn('crm_status')
                ?.setFilterValue(e.target.value || undefined)
            }
          >
            <option value="">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="customer">Customer</option>
            <option value="vip">VIP</option>
            <option value="churned">Churned</option>
          </select>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            onChange={(e) =>
              table
                .getColumn('role')
                ?.setFilterValue(e.target.value || undefined)
            }
          >
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          className="px-4 py-2"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          className="px-4 py-2"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Profile</SheetTitle>
          </SheetHeader>
          {editingProfile && editForm && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-4">
                <img
                  src={
                    editingProfile.avatar_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(editingProfile.email)}`
                  }
                  alt="Avatar"
                  className="w-16 h-16 rounded-full bg-gray-200"
                />
                <div>
                  <h3 className="font-bold text-lg">
                    {editingProfile.full_name || 'No Name'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {editingProfile.email}
                  </p>
                </div>
              </div>

              <Select
                label="CRM Status"
                options={[
                  { value: 'lead', label: 'Lead' },
                  { value: 'customer', label: 'Customer' },
                  { value: 'vip', label: 'VIP' },
                  { value: 'churned', label: 'Churned' },
                ]}
                value={editForm.crm_status}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, crm_status: e.target.value } : null,
                  )
                }
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tags (comma separated)
                </label>
                <Textarea
                  value={editForm.crm_tags}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, crm_tags: e.target.value } : null,
                    )
                  }
                  placeholder="e.g. interested, q3-promo, legacy"
                />
              </div>

              <div className="pt-4">
                <Button onClick={handleSave} className="w-full">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
