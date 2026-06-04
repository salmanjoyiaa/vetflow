'use client';

import dynamic from 'next/dynamic';

interface ChartDataPoint {
  name: string;
  value: number;
}

interface ReportsChartsWrapperProps {
  salesData: ChartDataPoint[];
  paymentData: ChartDataPoint[];
}

const ReportsChartsClient = dynamic(
  () => import('@/components/dashboard/ReportsChartsClient'),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 rounded-2xl glass-panel border border-outline-variant/40 animate-pulse" />
    ),
  }
);

export default function ReportsChartsWrapper(props: ReportsChartsWrapperProps) {
  return <ReportsChartsClient {...props} />;
}

