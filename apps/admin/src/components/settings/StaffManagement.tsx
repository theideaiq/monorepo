'use client';

import { Badge, Button, Card, Input, Modal } from '@repo/ui';
import { Check, Shield, ShieldAlert, UserCheck, UserX, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { addStaff, toggleBan, updateRole } from '@/actions/staff';
import type { UserProfile, UserRole } from '@/types/auth';

interface StaffManagementProps {
  initialStaff: UserProfile[];
  currentUserRole: UserRole;
  currentUserId: string;
}

export default function StaffManagement({
  initialStaff,
  currentUserRole,
  currentUserId,
}: StaffManagementProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [loading, setLoading] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');

  const isSuperAdmin = currentUserRole === 'superadmin';

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) return toast.error('Only Superadmins can change roles');
    setLoading(userId);
    try {
      await updateRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleBanToggle = async (userId: string, currentStatus: boolean) => {
    if (!isSuperAdmin) return toast.error('Only Superadmins can ban users');
    setLoading(userId);
    try {
      await toggleBan(userId, !currentStatus);
      toast.success(currentStatus ? 'User unbanned' : 'User banned');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('add');
    try {
      await addStaff(newStaffEmail);
      toast.success('Staff added successfully');
      setIsAddModalOpen(false);
      setNewStaffEmail('');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Staff & Permissions</h1>
        {isSuperAdmin && (
          <Button onClick={() => setIsAddModalOpen(true)}>Add Staff</Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50">
                  <td className="p-4 font-medium">{user.full_name || 'N/A'}</td>
                  <td className="p-4 text-slate-500">{user.email || 'N/A'}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {/* @ts-ignore - banned might not be in type yet if I didn't update types/auth.ts */}
                    {user.banned ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {isSuperAdmin && user.id !== currentUserId && (
                      <>
                        {user.role === 'admin' ? (
                          <Button
                            variant="outline"
                            className="px-2 py-1 h-8 w-8 p-0"
                            onClick={() =>
                              handleRoleChange(user.id, 'superadmin')
                            }
                            disabled={loading === user.id}
                            title="Promote to Superadmin"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="px-2 py-1 h-8 w-8 p-0"
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            disabled={loading === user.id}
                            title="Demote to Admin"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          className={`px-2 py-1 h-8 w-8 p-0 ${user.banned ? 'text-green-600' : 'text-red-600'}`}
                          // @ts-expect-error
                          onClick={() => handleBanToggle(user.id, user.banned)}
                          disabled={loading === user.id}
                          title={user.banned ? 'Unban' : 'Ban'}
                        >
                          {/* @ts-ignore */}
                          {user.banned ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No staff found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Staff Member"
      >
        <form onSubmit={handleAddStaff} className="space-y-4">
          <Input
            label="User Email"
            type="email"
            value={newStaffEmail}
            onChange={(e) => setNewStaffEmail(e.target.value)}
            placeholder="Enter user email..."
            required
          />
          <p className="text-xs text-slate-500">
            Note: The user must already exist in the system and have an email
            set in their profile.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={loading === 'add'}>
              Promote to Admin
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
