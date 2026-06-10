export default function PageLoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 glass-panel rounded-2xl" />
      <div className="flex gap-3">
        <div className="h-10 flex-1 glass-panel rounded-xl" />
        <div className="h-10 w-32 glass-panel rounded-xl" />
      </div>
      <div className="glass-panel rounded-2xl overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 border-b border-outline-variant/20 px-6 flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-surface-container" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-surface-container rounded" />
              <div className="h-2 w-1/2 bg-surface-container/60 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
