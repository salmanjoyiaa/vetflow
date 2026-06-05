'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(var(--secondary))',
  trial: 'hsl(var(--primary))',
  suspended: 'hsl(0, 72%, 55%)',
  cancelled: 'hsl(var(--outline))',
};

interface PlatformChartsClientProps {
  statusDistribution: { name: string; value: number }[];
  signupTrend: { date: string; count: number }[];
  mrrByPlan: { plan: string; mrr: number }[];
}

export default function PlatformChartsClient({
  statusDistribution,
  signupTrend,
  mrrByPlan,
}: PlatformChartsClientProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="glass-panel p-5">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
          Tenant status
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
              >
                {statusDistribution.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[entry.name] || 'hsl(var(--outline))'}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--surface-container))',
                  border: '1px solid hsl(var(--outline-variant))',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-5 lg:col-span-2">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
          Signups (last 30 days)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={signupTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant))' }} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--surface-container))',
                  border: '1px solid hsl(var(--outline-variant))',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {mrrByPlan.length > 0 && (
        <div className="glass-panel p-5 lg:col-span-3">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
            Estimated MRR by plan (active tenants)
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mrrByPlan} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis
                  type="category"
                  dataKey="plan"
                  width={100}
                  tick={{ fontSize: 9, fill: 'hsl(var(--on-surface-variant))' }}
                />
                <Tooltip
                  formatter={(v) => [`$${Number(v)}/mo`, 'MRR']}
                  contentStyle={{
                    background: 'hsl(var(--surface-container))',
                    border: '1px solid hsl(var(--outline-variant))',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="mrr" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
