'use client';

import { useEffect, useState } from 'react';
import { getClinicBenchmarkingDataAction } from '@/lib/services/benchmarking-actions';
import { Loader2 } from 'lucide-react';

export default function BenchmarkingClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<
    Array<{
      branchId: string;
      branchName: string;
      revenue: number;
      visitCount: number;
      avgConsultMinutes: number | null;
    }>
  >([]);

  useEffect(() => {
    getClinicBenchmarkingDataAction().then((res) => {
      if (res.success) setBranches(res.branches || []);
      else setError(res.error || 'Failed to load benchmarks');
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />;
  }

  if (error) {
    return (
      <div className="glass-panel rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-400">
        {error}
      </div>
    );
  }

  const maxRevenue = Math.max(...branches.map((b) => b.revenue), 1);

  return (
    <div className="space-y-4">
      {branches.map((b) => (
        <div
          key={b.branchId}
          className="glass-panel rounded-2xl border border-outline-variant/40 p-6"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold text-on-surface">{b.branchName}</h3>
            <span className="text-xs text-on-surface-variant">
              {b.visitCount} visits (MTD)
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <Metric label="Revenue (paid)" value={`$${b.revenue.toFixed(0)}`} />
            <Metric label="Visits" value={String(b.visitCount)} />
            <Metric
              label="Avg consult"
              value={b.avgConsultMinutes != null ? `${b.avgConsultMinutes} min` : '—'}
            />
          </div>
          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-container/40">
      <span className="text-[9px] font-bold uppercase text-on-surface-variant">{label}</span>
      <p className="text-lg font-bold text-on-surface">{value}</p>
    </div>
  );
}
