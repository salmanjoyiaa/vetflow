'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  createSuperAdminAction,
  setSuperAdminStatusAction,
} from '@/lib/services/platform-user-actions';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import { Loader2, ShieldPlus, X, ShieldOff, UserCheck } from 'lucide-react';

export type SuperAdminRow = {
  id: string;
  name: string;
  email: string;
  lastSignIn: string | null;
  isSelf: boolean;
};

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function SuperAdminUsersClient({ admins }: { admins: SuperAdminRow[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const onCreate = handleSubmit(async (data) => {
    setError(null);
    const res = await createSuperAdminAction(data);
    if (res.success) {
      reset();
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create super admin.');
    }
  });

  const onToggle = (row: SuperAdminRow) => {
    setRowError(null);
    if (!window.confirm(`Revoke super admin access for ${row.name || row.email}?`)) return;
    startTransition(async () => {
      const res = await setSuperAdminStatusAction({ userId: row.id, enable: false });
      if (res.success) {
        router.refresh();
      } else {
        setRowError(res.error || 'Failed to update access.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
          Platform super admins ({admins.length})
        </h3>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 bg-primary hover:opacity-90 text-white py-2 px-3.5 rounded-xl font-bold text-xs shadow-sm transition-all"
        >
          <ShieldPlus className="w-3.5 h-3.5" />
          New super admin
        </button>
      </div>

      {rowError && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {rowError}
        </div>
      )}

      <GlassPanel className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={tableHeadClass}>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Last sign in</th>
                <th className="px-6 py-4 text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className={tableRowClass}>
                  <td className="px-6 py-4 font-bold text-on-surface">
                    {a.name || 'Unnamed'}
                    {a.isSelf && (
                      <span className="ml-2 text-[9px] font-bold text-primary uppercase">You</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{a.email}</td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {a.lastSignIn ? new Date(a.lastSignIn).toLocaleString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {a.isSelf ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary">
                        <UserCheck className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onToggle(a)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {admins.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-12">No super admins found.</p>
        )}
      </GlassPanel>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-on-surface mb-1">New platform super admin</h3>
            <p className="text-xs text-on-surface-variant/60 mb-4">
              Grants full platform control. This action is audited as critical.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={onCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    First name
                  </label>
                  <input
                    {...register('firstName', { required: 'Required' })}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                  {errors.firstName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.firstName.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Last name
                  </label>
                  <input
                    {...register('lastName', { required: 'Required' })}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                  {errors.lastName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.lastName.message}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email', { required: 'Required' })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                />
                {errors.email && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.email.message}</span>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Temporary password
                </label>
                <input
                  type="text"
                  {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  placeholder="Min 8 characters"
                />
                {errors.password && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.password.message}</span>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 border border-outline-variant hover:bg-surface-container/50 py-2.5 rounded-xl text-xs font-semibold text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-primary hover:opacity-90 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
