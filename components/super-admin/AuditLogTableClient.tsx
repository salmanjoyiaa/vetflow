'use client';

import { useState, useTransition } from 'react';
import {
  listAuditLogsAction,
  type AuditLogRow,
} from '@/lib/services/super-admin-actions';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import { Loader2 } from 'lucide-react';

interface AuditLogTableClientProps {
  initialLogs: AuditLogRow[];
  initialTotal: number;
  organizations: { id: string; name: string }[];
  initialOrgId?: string;
}

export default function AuditLogTableClient({
  initialLogs,
  initialTotal,
  organizations,
  initialOrgId = '',
}: AuditLogTableClientProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [orgFilter, setOrgFilter] = useState(initialOrgId);
  const [actionFilter, setActionFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  const loadPage = (nextPage: number) => {
    startTransition(async () => {
      const res = await listAuditLogsAction({
        page: nextPage,
        pageSize: 50,
        organizationId: orgFilter || undefined,
        actionPrefix: actionFilter || undefined,
      });
      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.total || 0);
        setPage(nextPage);
      }
    });
  };

  const handleFilter = () => loadPage(1);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface"
        >
          <option value="">All organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Action prefix (e.g. ORG_)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface min-w-[180px]"
        />
        <button
          type="button"
          onClick={handleFilter}
          disabled={isPending}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-on-primary disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply filters'}
        </button>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={tableHeadClass}>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actorLabel = log.actor_user_id
                  ? `${log.actor_user_id.slice(0, 8)}…`
                  : 'System';
                return (
                  <tr key={log.id} className={tableRowClass}>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-on-surface">
                      {log.organizations?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-on-surface block font-mono text-[10px]">{actorLabel}</span>
                      <span className="text-[10px] text-on-surface-variant">{log.actor_role}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-primary">{log.action}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {log.resource_type}
                      {log.resource_id ? ` · ${log.resource_id.slice(0, 8)}…` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-12">No audit entries found.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-on-surface-variant">
        <span>
          Page {page} of {totalPages} · {total} entries
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || isPending}
            onClick={() => loadPage(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-outline-variant disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || isPending}
            onClick={() => loadPage(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-outline-variant disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
