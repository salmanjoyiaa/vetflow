'use client';

import { useState, useTransition, Fragment, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  listAuditLogsAction,
  exportAuditLogsCsvAction,
  type AuditLogRow,
} from '@/lib/services/super-admin-actions';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import { Loader2, Download, ChevronRight, ChevronDown } from 'lucide-react';

interface AuditLogTableClientProps {
  initialLogs: AuditLogRow[];
  initialTotal: number;
  organizations: { id: string; name: string }[];
  initialOrgId?: string;
  initialFilters?: Partial<Filters>;
}

type Filters = {
  org: string;
  actor: string;
  action: string;
  category: string;
  severity: string;
  dateFrom: string;
  dateTo: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-secondary/10 text-secondary border-secondary/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
};

const CATEGORY_STYLES: Record<string, string> = {
  data: 'bg-surface-container text-on-surface-variant border-outline-variant',
  access: 'bg-primary/10 text-primary border-primary/20',
  security: 'bg-destructive/10 text-destructive border-destructive/20',
  billing: 'bg-secondary/10 text-secondary border-secondary/20',
};

function Badge({ label, styles }: { label: string; styles: Record<string, string> }) {
  if (!label) return <span className="text-on-surface-variant">—</span>;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
        styles[label] || 'bg-surface-container text-on-surface-variant border-outline-variant'
      }`}
    >
      {label}
    </span>
  );
}

export default function AuditLogTableClient({
  initialLogs,
  initialTotal,
  organizations,
  initialOrgId = '',
  initialFilters,
}: AuditLogTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [logs, setLogs] = useState(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    org: initialFilters?.org ?? initialOrgId,
    actor: initialFilters?.actor ?? '',
    action: initialFilters?.action ?? '',
    category: initialFilters?.category ?? '',
    severity: initialFilters?.severity ?? '',
    dateFrom: initialFilters?.dateFrom ?? '',
    dateTo: initialFilters?.dateTo ?? '',
  });

  const setField = (key: keyof Filters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const toActionPayload = useCallback(
    (f: Filters) => ({
      organizationId: f.org || undefined,
      actorUserId: f.actor || undefined,
      actionPrefix: f.action || undefined,
      category: (f.category || undefined) as 'data' | 'access' | 'security' | 'billing' | undefined,
      severity: (f.severity || undefined) as 'info' | 'warning' | 'critical' | undefined,
      dateFrom: f.dateFrom || undefined,
      dateTo: f.dateTo || undefined,
    }),
    []
  );

  const syncUrl = useCallback(
    (f: Filters) => {
      const params = new URLSearchParams();
      if (f.org) params.set('org', f.org);
      if (f.actor) params.set('actor', f.actor);
      if (f.action) params.set('action', f.action);
      if (f.category) params.set('category', f.category);
      if (f.severity) params.set('severity', f.severity);
      if (f.dateFrom) params.set('from', f.dateFrom);
      if (f.dateTo) params.set('to', f.dateTo);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  const loadPage = (nextPage: number) => {
    startTransition(async () => {
      const res = await listAuditLogsAction({
        page: nextPage,
        pageSize: 50,
        ...toActionPayload(filters),
      });
      if (res.success && res.logs) {
        setLogs(res.logs);
        setTotal(res.total || 0);
        setPage(nextPage);
        setError(null);
      } else {
        setError(res.error || 'Failed to load logs.');
      }
    });
  };

  const handleFilter = () => {
    syncUrl(filters);
    loadPage(1);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    const res = await exportAuditLogsCsvAction(toActionPayload(filters));
    setIsExporting(false);
    if (res.success && res.csv) {
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      setError(res.error || 'Export failed.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));
  const inputClass =
    'text-xs px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <select value={filters.org} onChange={(e) => setField('org', e.target.value)} className={inputClass}>
          <option value="">All organizations</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select value={filters.category} onChange={(e) => setField('category', e.target.value)} className={inputClass}>
          <option value="">All categories</option>
          <option value="data">Data</option>
          <option value="access">Access</option>
          <option value="security">Security</option>
          <option value="billing">Billing</option>
        </select>
        <select value={filters.severity} onChange={(e) => setField('severity', e.target.value)} className={inputClass}>
          <option value="">All severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <input
          type="text"
          placeholder="Action prefix (e.g. ORG_)"
          value={filters.action}
          onChange={(e) => setField('action', e.target.value)}
          className={`${inputClass} min-w-[160px]`}
        />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setField('dateFrom', e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setField('dateTo', e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleFilter}
          disabled={isPending}
          className="text-xs font-semibold px-4 py-2 rounded-xl bg-primary text-on-primary disabled:opacity-60"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply filters'}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="text-xs font-semibold px-4 py-2 rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export CSV
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}

      <div className="glass-panel p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={tableHeadClass}>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const actorLabel = log.actor_user_id ? `${log.actor_user_id.slice(0, 8)}…` : 'System';
                const hasDetail = Boolean(log.before_data || log.after_data);
                const isExpanded = expandedId === log.id;
                return (
                  <Fragment key={log.id}>
                    <tr
                      className={`${tableRowClass} ${hasDetail ? 'cursor-pointer' : ''}`}
                      onClick={() => hasDetail && setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-on-surface-variant">
                        {hasDetail ? (
                          isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-on-surface">{log.organizations?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-on-surface block font-mono text-[10px]">{actorLabel}</span>
                        <span className="text-[10px] text-on-surface-variant">{log.actor_role}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-primary">{log.action}</td>
                      <td className="px-4 py-3">
                        <Badge label={log.category || ''} styles={CATEGORY_STYLES} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge label={log.severity || ''} styles={SEVERITY_STYLES} />
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {log.resource_type}
                        {log.resource_id ? ` · ${log.resource_id.slice(0, 8)}…` : ''}
                      </td>
                    </tr>
                    {isExpanded && hasDetail && (
                      <tr className="bg-surface-container/30">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                                Before
                              </p>
                              <pre className="text-[10px] bg-surface-container/60 rounded-lg p-3 overflow-x-auto text-on-surface-variant whitespace-pre-wrap break-all">
                                {log.before_data ? JSON.stringify(log.before_data, null, 2) : '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                                After
                              </p>
                              <pre className="text-[10px] bg-surface-container/60 rounded-lg p-3 overflow-x-auto text-on-surface-variant whitespace-pre-wrap break-all">
                                {log.after_data ? JSON.stringify(log.after_data, null, 2) : '—'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
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
