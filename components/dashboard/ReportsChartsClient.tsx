'use client';

import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ReportsChartsClientProps {
  salesData: ChartDataPoint[];
  paymentData: ChartDataPoint[];
}

const COLORS = ['#17403a', '#0F172A', '#D97706', '#84CC16'];

export default function ReportsChartsClient({
  salesData,
  paymentData,
}: ReportsChartsClientProps) {
  return (
    <div className="grid md:grid-cols-12 gap-8">
      
      {/* AREA CHART: MONTHLY SALES DEVELOPMENT */}
      <div className="md:col-span-8 glass-panel p-6 rounded-2xl border border-outline-variant/40 shadow-premium">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-6">
          Monthly Revenue Trend
        </h3>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#17403a" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#17403a" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 9, fill: '#718096' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#718096' }} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#E2E8F0', 
                  borderRadius: '12px',
                  fontSize: '10px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#17403a" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PIE CHART: PAYMENT METRIC SEGMENTS */}
      <div className="md:col-span-4 glass-panel p-6 rounded-2xl border border-outline-variant/40 shadow-premium flex flex-col">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-6">
          Revenue by Payment Channel
        </h3>

        <div className="h-44 flex-1 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={paymentData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={4}
                dataKey="value"
              >
                {paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  borderColor: '#E2E8F0', 
                  borderRadius: '12px',
                  fontSize: '10px'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-on-surface-variant/60 font-semibold border-t border-outline-variant/45 pt-4">
          {paymentData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }} 
              />
              <span className="capitalize">{entry.name.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

