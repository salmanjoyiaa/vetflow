type SkeletonVariant = 'default' | 'staff' | 'inventory' | 'settings' | 'benchmarking';

function HeaderSkeleton() {
  return (
    <div className="h-20 glass-panel rounded-2xl flex items-center gap-4 px-6">
      <div className="h-10 w-10 rounded-xl bg-surface-container" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 bg-surface-container rounded" />
        <div className="h-2.5 w-72 bg-surface-container/60 rounded" />
      </div>
      <div className="h-9 w-28 bg-surface-container rounded-xl" />
    </div>
  );
}

function TabSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-9 w-24 glass-panel rounded-xl" />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="h-11 bg-surface-container/40 border-b border-outline-variant/20" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 border-b border-outline-variant/20 px-6 flex items-center gap-4"
        >
          <div className="h-8 w-8 rounded-full bg-surface-container" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 bg-surface-container rounded" />
            <div className="h-2 w-1/2 bg-surface-container/60 rounded" />
          </div>
          <div className="h-6 w-20 bg-surface-container rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 glass-panel rounded-2xl" />
      ))}
    </div>
  );
}

export default function PageLoadingSkeleton({
  rows = 4,
  variant = 'default',
}: {
  rows?: number;
  variant?: SkeletonVariant;
}) {
  if (variant === 'staff') {
    return (
      <div className="space-y-6 animate-pulse">
        <HeaderSkeleton />
        <TabSkeleton count={2} />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  if (variant === 'inventory') {
    return (
      <div className="space-y-6 animate-pulse">
        <HeaderSkeleton />
        <TabSkeleton count={2} />
        <CardGridSkeleton count={2} />
        <TableSkeleton rows={rows} />
      </div>
    );
  }

  if (variant === 'settings') {
    return (
      <div className="space-y-6 animate-pulse">
        <HeaderSkeleton />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-64 glass-panel rounded-2xl" />
          <div className="lg:col-span-2 space-y-4">
            <div className="h-12 glass-panel rounded-xl" />
            <div className="h-48 glass-panel rounded-2xl" />
            <div className="h-32 glass-panel rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'benchmarking') {
    return (
      <div className="space-y-6 animate-pulse">
        <HeaderSkeleton />
        <CardGridSkeleton count={4} />
        <div className="h-72 glass-panel rounded-2xl" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse">
      <HeaderSkeleton />
      <TabSkeleton />
      <TableSkeleton rows={rows} />
    </div>
  );
}
